# Инфраструктура — Документация

> Последнее обновление: апрель 2026

---

## Серверы

### VPS Россия (Edge Proxy + Domain Manager)

| Параметр | Значение |
|---|---|
| IP | `194.58.114.184` |
| Название | Beige Hydrargyrum |
| ОС | Ubuntu 24.04 LTS |
| SSH | `ssh root@194.58.114.184` |
| Пароль root | `2ew7IOH3Uu7XhCVA` |
| Провайдер | TimeWeb (или аналог) |

**Что запущено:**
- **Nginx** — reverse proxy, перенаправляет домены через WireGuard на домашний сервер
- **Certbot** — SSL-сертификаты (Let's Encrypt)
- **Xray** (systemd сервис) — VLESS TCP relay, порт `8443`
- **Domain Manager** (Flask, Python) — веб-панель управления, порт `8080`

**Ключевые файлы на сервере:**
```
/etc/nginx/sites-enabled/multi-proxy.conf   — nginx конфиг (домены)
/etc/xray/xray                              — бинарник Xray v26.3.27
/etc/xray/config.json                       — конфиг Xray (TCP relay)
/etc/systemd/system/xray.service            — systemd сервис Xray
/root/domain-manager/app.py                 — Flask приложение панели
/root/domain-manager/.passwd                — пароль от панели (plaintext)
/root/domain-manager/app.log                — лог Flask приложения
/etc/domain-fwd.json                        — маппинг домен → IP LXC
```

**Domain Manager панель:**
- URL: `http://194.58.114.184:8080`
- Пароль: `Priora777`
- Функции: управление доменами nginx, SSL через certbot, VPN QR-генератор, смена пароля

---

### VPS США (VLESS Reality + 3x-ui)

| Параметр | Значение |
|---|---|
| IP | `31.57.118.96` |
| SSH | `ssh root@31.57.118.96` |
| Пароль root | `fjNDeamTsze=y0XlS72` |

**Что запущено:**
- **3x-ui** v2.8.11 — веб-панель управления Xray
- **Xray** — VLESS Reality сервер, порт `443`

**3x-ui панель:**
- URL: `https://31.57.118.96:8443/panel/inbounds`
- Логин: `admin`
- Пароль: `fjNDeamTsze=y0XlS72`

**Xray бинарник:** `/usr/local/x-ui/bin/xray-linux-amd64`
**Xray конфиг:** `/usr/local/x-ui/bin/config.json` (управляется через 3x-ui)

---

### Домашний сервер (Proxmox + NPM)

| Параметр | Значение |
|---|---|
| WireGuard IP | `10.0.0.2` |
| Локальная сеть | `192.168.88.x` |
| NPM (Nginx Proxy Manager) | `http://192.168.88.50:81` |

**Что запущено:**
- **WireGuard** — туннель к VPS России (10.0.0.1 ↔ 10.0.0.2)
- **NPM** — маршрутизация доменов по внутренним IP LXC-контейнеров
- **LXC контейнеры** — приложения (fatiha.ru и др.)

---

## Деплой Fatiha на LXC (Proxmox, домашняя сеть)

Деплой с рабочего ПК в репозитории выполняется скриптом `deploy/_deploy_home.py` по **SSH с ключом** (пароль root по SSH на LXC часто отключён — это нормально).

### Первый доступ к контейнеру (без пароля LXC)

1. **Веб-интерфейс Proxmox:** `https://<IP_ХОСТА_PROXMOX>:8006` — логин/пароль от **Proxmox**, не от контейнера.
2. **Или с хоста Proxmox по SSH:** `ssh root@<IP_ХОСТА>`, затем:
   ```bash
   pct list          # найти CT ID контейнера с fatiha
   pct enter <ID>    # войти в контейнер без пароля LXC
   ```
3. Внутри контейнера при необходимости: `passwd` — задать пароль root (для ручной отладки в консоли).

### Авторизация для автоматического деплоя (SSH-ключ)

На LXC в консоли Proxmox **один раз** нужно разрешить вход по ключу:

1. На машине разработчика из корня репозитория:
   ```bash
   python deploy/_setup_ssh.py
   ```
   Скрипт создаёт пару ключей ed25519 (по умолчанию `%USERPROFILE%\.ssh\id_ed25519_fatiha` на Windows, рядом `.pub`) и печатает **одну команду** для вставки в **Console** контейнера (Proxmox → CT → Console). Команда добавляет публичный ключ в `~/.ssh/authorized_keys` и включает службу `ssh`.

2. При необходимости отредактируйте в `deploy/_deploy_home.py`:
   - `HOST` — IP LXC, где крутится Docker (например `192.168.88.60`);
   - `KEY_FILE` — абсолютный путь к **приватному** ключу на вашей машине.

3. Проверка вручную:
   ```bash
   ssh -i ~/.ssh/id_ed25519_fatiha root@<HOST>
   ```
   (на Windows укажите полный путь к ключу.)

Зависимости на ПК: **Python 3** и **paramiko** (`pip install paramiko`).

### Команды деплоя

Из корня репозитория:

```bash
python deploy/_deploy_home.py check    # SSH, Docker, каталог проекта на сервере
python deploy/_deploy_home.py deploy   # git pull (ветка xnjnj) + docker compose build app + up -d
```

Условия: ПК видит LXC по сети (та же LAN или VPN); на сервере в `/opt/fatiha` (или где лежит проект) настроен `git remote` и есть доступ к `git pull`.

---

## Архитектура системы

### Веб-трафик (сайты)

```
Пользователь (интернет)
        │
        ▼ HTTPS (443)
┌─────────────────────┐
│  VPS Россия         │
│  Nginx              │  ← SNI маршрутизация по домену
└────────┬────────────┘
         │ WireGuard (10.0.0.1 → 10.0.0.2)
         ▼
┌─────────────────────┐
│  Домашний сервер    │
│  NPM                │  ← маршрутизация на LXC по домену
└────────┬────────────┘
         │ HTTP (внутренняя сеть 192.168.88.x)
         ▼
   LXC контейнер (приложение, порт 3000 или иной)
```

### VPN трафик (VLESS)

```
Пользователь (Россия)
        │
        │ VLESS-ссылка с IP 194.58.114.184:8443
        ▼
┌─────────────────────┐
│  VPS Россия         │
│  Xray dokodemo-door │  ← слепой TCP relay, порт 8443
│  → 31.57.118.96:443 │     не смотрит на трафик, не требует UUID
└────────┬────────────┘
         │ raw TCP
         ▼
┌─────────────────────┐
│  VPS США            │
│  Xray VLESS Reality │  ← проверка UUID, терминирование
└────────┬────────────┘
         │
         ▼
    Свободный интернет (выход с IP 31.57.118.96)
```

---

## VPN — Параметры подключения

**VLESS Reality (USA сервер напрямую):**
```
vless://UUID@31.57.118.96:443?type=tcp&encryption=none&security=reality
  &pbk=6mjynY1HOuHj4RNHRPJJWNuQpFd-Gsfhy7wFfsTIlig
  &fp=chrome&sni=www.cherstvenkov.ru&sid=fa1df34d6f1a&spx=%2F
  &flow=xtls-rprx-vision
```

**VLESS Reality через российское реле:**
```
vless://UUID@194.58.114.184:8443?type=tcp&encryption=none&security=reality
  &pbk=6mjynY1HOuHj4RNHRPJJWNuQpFd-Gsfhy7wFfsTIlig
  &fp=chrome&sni=www.cherstvenkov.ru&sid=fa1df34d6f1a&spx=%2F
  &flow=xtls-rprx-vision
```

**Reality параметры:**
| Параметр | Значение |
|---|---|
| Public Key (pbk) | `6mjynY1HOuHj4RNHRPJJWNuQpFd-Gsfhy7wFfsTIlig` |
| SNI | `www.cherstvenkov.ru` |
| Short ID (sid) | `fa1df34d6f1a` |
| Fingerprint | `chrome` |
| Flow | `xtls-rprx-vision` |

**Добавить нового пользователя:**
1. Открыть `https://31.57.118.96:8443/panel/inbounds`
2. Edit inbound ID 5 → Add Client → задать имя, UUID генерируется автоматически
3. Скопировать VLESS-ссылку из 3x-ui
4. Открыть `http://194.58.114.184:8080/vpn` → вставить ссылку → получить QR с российским IP

---

## Домены

**Nginx конфиг** `/etc/nginx/sites-enabled/multi-proxy.conf`:
- HTTP блок: `server_name fatiha.ru www.fatiha.ru other-site.ru;`
- HTTPS блок: аналогично + SSL сертификаты Let's Encrypt

**SSL сертификаты:**
- `fatiha.ru-0001` (путь: `/etc/letsencrypt/live/fatiha.ru-0001/`)
- Действителен до июля 2026

---

## Управление серверами через Python (paramiko)

В проекте есть вспомогательные скрипты в `deploy/`:

```bash
# Выполнить команду на Russian VPS
python deploy/_ssh_helper.py cmd "команда"

# Загрузить app.py на сервер
python deploy/_ssh_helper.py upload

# Запустить domain manager
python deploy/_ssh_helper.py start

# Статус domain manager
python deploy/_ssh_helper.py status

# Лог domain manager
python deploy/_ssh_helper.py log
```

**Параметры подключения в скриптах:**
- Russian VPS: `194.58.114.184`, `root`, `2ew7IOH3Uu7XhCVA`
- USA VPS: `31.57.118.96`, `root`, `fjNDeamTsze=y0XlS72`

---

## Управление Xray на Russian VPS

```bash
systemctl status xray      # статус
systemctl restart xray     # перезапуск
systemctl stop xray        # остановить
journalctl -u xray -f      # логи в реальном времени
cat /etc/xray/config.json  # текущий конфиг
```

**Конфиг Xray (dokodemo-door TCP relay):**
```json
{
  "inbounds": [{
    "tag": "relay-in",
    "port": 8443,
    "protocol": "dokodemo-door",
    "settings": {
      "address": "31.57.118.96",
      "port": 443,
      "network": "tcp"
    }
  }],
  "outbounds": [{"protocol": "freedom", "tag": "direct"}]
}
```

---

## Управление Domain Manager

```bash
# Перезапустить панель
fuser -k 8080/tcp && sleep 1
setsid python3 /root/domain-manager/app.py > /root/domain-manager/app.log 2>&1 </dev/null &

# Сменить пароль вручную
echo 'НовыйПароль' > /root/domain-manager/.passwd

# Посмотреть логи
tail -f /root/domain-manager/app.log
```
