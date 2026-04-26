# Инфраструктура — Документация

> Последнее обновление: апрель 2026

---

## Серверы

### MikroTik RouterOS (Домашний роутер)

| Параметр    | Значение                  |
| ----------- | ------------------------- |
| IP          | `192.168.88.1`            |
| ОС          | RouterOS 7.15.3           |
| SSH         | `ssh batyr@192.168.88.1`  |
| SSH user    | `batyr`                   |
| SSH пароль  | `Maxa4kala`               |
| WinBox      | порт `8291`               |

**Важно:** SSH-ключ **не работает** — только парольная аутентификация.
Для подключения из Python:

```python
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('192.168.88.1', username='batyr', password='Maxa4kala', timeout=10)
```

**Ключевые правила:**
- NAT dst-nat: 80/443 → 192.168.88.120 (NPM), UDP 51822 → 192.168.88.11 (WG)
- Firewall: input drop не из LAN, forward разрешён для 200/201/202 подсетей

---

### Proxmox VE (Домашний хост)

| Параметр                  | Значение                            |
| ------------------------- | ----------------------------------- |
| IP                        | `192.168.88.222`                    |
| ОС                        | Proxmox VE 9.1.4                    |
| SSH                       | `ssh root@192.168.88.222`           |
| SSH ключ                  | `D:\www\thinking\proxmox_key` (RSA) |
| Web UI                    | `https://192.168.88.222:8006`       |

**LXC контейнеры:**

| VMID | Name   | IP             | Роль                              | onboot |
|------|--------|----------------|-----------------------------------|--------|
| 100  | fatiha | 192.168.88.60  | Fatiha.ru (Docker: app+postgres)  | 1      |
| 110  | wg     | 192.168.88.11  | WireGuard туннель к VPS России    | 1      |
| 120  | npm    | 192.168.88.120 | Nginx Proxy Manager               | 1      |
| 121  | web-3k | 192.168.88.121 | 3k.su сайт                        | 1      |
| 130  | 3xui   | 192.168.88.130 | VPN клиент (VLESS Reality)        | 1      |

**Доступ к LXC:**
```bash
# С Proxmox хоста
pct list                    # список контейнеров
pct enter <ID>              # войти в контейнер
pct exec <ID> -- <command>  # выполнить команду

# По SSH (только fatiha LXC 100)
ssh -i ~/.ssh/id_ed25519_fatiha root@192.168.88.60
```

**Авто-восстановление после отключения света:**
- Скрипт: `/usr/local/bin/fatiha-recovery.sh`
- Сервис: `fatiha-recovery.service` (enabled, запускается при boot)
- Проверяет: WG туннель → NPM контейнер → Fatiha app

---

### VPS Россия (Edge Proxy + Domain Manager)

| Параметр    | Значение                  |
| ----------- | ------------------------- |
| IP          | `194.58.114.184`          |
| Название    | Beige Hydrargyrum         |
| ОС          | Ubuntu 24.04 LTS          |
| SSH         | `ssh root@194.58.114.184` |
| Пароль root | `2ew7IOH3Uu7XhCVA`        |
| Провайдер   | TimeWeb                   |

**Что запущено:**

- **Nginx** — reverse proxy, перенаправляет домены через WireGuard на домашний сервер
- **Certbot** — SSL-сертификаты (Let's Encrypt)
- **Xray** (systemd сервис) — VLESS TCP relay, порт `8443`
- **Domain Manager** (Flask, Python) — веб-панель управления, порт `8080`
- **WG Watchdog** — мониторинг туннеля, автостарт при обрыве

**Ключевые файлы на сервере:**

```
/etc/nginx/sites-enabled/multi-proxy.conf   — nginx конфиг (домены)
/etc/xray/xray                              — бинарник Xray v26.3.27
/etc/xray/config.json                       — конфиг Xray (TCP relay)
/etc/systemd/system/xray.service            — systemd сервис Xray
/etc/systemd/system/wg-watchdog.service     — WG мониторинг
/root/domain-manager/app.py                 — Flask приложение панели
/root/domain-manager/.passwd                — пароль от панели (plaintext)
/root/domain-manager/app.log                — лог Flask приложения
/etc/domain-fwd.json                        — маппинг домен → IP LXC
/usr/local/bin/wg-watchdog.sh               — WG watchdog скрипт
```

**Domain Manager панель:**

- URL: `http://194.58.114.184:8080`
- Пароль: `Priora777`
- Функции: управление доменами nginx, SSL через certbot, VPN QR-генератор, смена пароля

---

### VPS США (VLESS Reality + 3x-ui)

| Параметр    | Значение                |
| ----------- | ----------------------- |
| IP          | `31.57.118.96`          |
| SSH         | `ssh root@31.57.118.96` |
| Пароль root | `fjNDeamTsze=y0XlS72`   |

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

### VPS Латвия (VLESS Reality + 3x-ui)

| Параметр    | Значение                |
| ----------- | ----------------------- |
| IP          | `31.58.77.193`          |
| Домен       | `b.8z8.ru`              |
| SSH         | `ssh root@31.58.77.193` |
| Пароль root | `yQ4RYLq0qv_tQsEU1`     |
| Локация     | Латвия                  |
| ОС          | Ubuntu 24.04            |
| Specs       | 1 vCPU, 1GB RAM, 10GB   |

**Что запущено:**

- **3x-ui** — веб-панель управления Xray
- **Xray** — VLESS Reality сервер, порт `443`
- **Nginx** — лендинг на порту 80

**3x-ui панель:**

- URL: `https://31.58.77.193:15911/MuiFY7iu5UUCPM0FJX`
- Логин: `admin`
- Пароль: `mmhCphPTm3` / `KFbZB6YHrL`

**Xray бинарник:** `/usr/local/x-ui/bin/xray-linux-amd64`
**Xray конфиг:** `/usr/local/x-ui/bin/config.json` (управляется через 3x-ui)

**Подключение из Python (paramiko):**
```python
import paramiko
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('31.58.77.193', username='root', password='yQ4RYLq0qv_tQsEU1', timeout=10)
```

---

## Деплой Fatiha на LXC (Proxmox, домашняя сеть)

Деплой с рабочего ПК в репозитории выполняется скриптом `deploy/_deploy_home.py` по **SSH с ключом**.

### Авторизация для автоматического деплоя (SSH-ключ)

**Ключ для Fatiha LXC (100):** `C:\Users\bityi\.ssh\id_ed25519_fatiha`

Проверка вручную:
```bash
ssh -i C:\Users\bityi\.ssh\id_ed25519_fatiha root@192.168.88.60
```

**Ключ для Proxmox хоста:** `D:\www\thinking\proxmox_key` (RSA)
```bash
ssh -i D:\www\thinking\proxmox_key root@192.168.88.222
```

### Команды деплоя

Из корня репозитория:

```bash
python deploy/_deploy_home.py check    # SSH, Docker, каталог проекта на сервере
python deploy/_deploy_home.py deploy   # git pull (ветка xnjnj) + docker compose build app + up -d
```

Условия: ПК видит LXC по сети (та же LAN или VPN); на сервере в `/opt/fatiha` настроен `git remote`.

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
│  WG LXC 110         │  ← WireGuard туннель
└────────┬────────────┘
         │ (внутренняя сеть)
         ▼
┌─────────────────────┐
│  NPM LXC 120        │  ← Nginx Proxy Manager
│  (192.168.88.120)   │  ← маршрутизация на LXC по домену
└────────┬────────────┘
         │ HTTP (внутренняя сеть 192.168.88.x)
         ▼
   LXC 100 — Fatiha (192.168.88.60:3000)
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
└────────┬────────────
         │ raw TCP
         ▼
┌─────────────────────┐
│  VPS США            │
│  Xray VLESS Reality │  ← проверка UUID, терминирование
└────────┬────────────
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

| Параметр         | Значение                                      |
| ---------------- | --------------------------------------------- |
| Public Key (pbk) | `6mjynY1HOuHj4RNHRPJJWNuQpFd-Gsfhy7wFfsTIlig` |
| SNI              | `www.cherstvenkov.ru`                         |
| Short ID (sid)   | `fa1df34d6f1a`                                |
| Fingerprint      | `chrome`                                      |
| Flow             | `xtls-rprx-vision`                            |

**Добавить нового пользователя:**

1. Открыть `https://31.57.118.96:8443/panel/inbounds`
2. Edit inbound ID 5 → Add Client → задать имя, UUID генерируется автоматически
3. Скопировать VLESS-ссылку из 3x-ui
4. Открыть `http://194.58.114.184:8080/vpn` → вставить ссылку → получить QR с российским IP

---

## Домены

**Nginx конфиг** `/etc/nginx/sites-enabled/multi-proxy.conf`:

- HTTP блок: `server_name fatiha.ru www.fatiha.ru other-site.ru proba.su www.proba.su;`
- HTTPS блок: аналогично + SSL сертификаты Let's Encrypt

**SSL сертификаты:**

- `fatiha.ru-0001` (путь: `/etc/letsencrypt/live/fatiha.ru-0001/`)
- Действителен до июля 2026

---

## Управление серверами через Python (paramiko)

### Russian VPS (194.58.114.184)

```bash
# Выполнить команду
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
- Latvia VPS: `31.58.77.193`, `root`, `yQ4RYLq0qv_tQsEU1`
- MikroTik: `192.168.88.1`, `batyr`, `Maxa4kala` (только пароль!)
- Proxmox: `192.168.88.222`, `root`, ключ `D:\www\thinking\proxmox_key`
- Fatiha LXC: `192.168.88.60`, `root`, ключ `C:\Users\bityi\.ssh\id_ed25519_fatiha`

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

---

## Восстановление после отключения света

### Автоматическое восстановление

1. **Proxmox хост** — все LXC стартуют автоматически (`onboot: 1`)
2. **Recovery скрипт** на Proxmox (`fatiha-recovery.service`) — проверяет WG туннель, NPM, Fatiha app
3. **WG Watchdog** на VPS России (`wg-watchdog.service`) — мониторит handshake, рестартит при обрыве
4. **MikroTik** — NAT правила сохраняются в конфигурации

### Ручное восстановление (если автоматика не сработала)

```bash
# 1. Проверить WG туннель на VPS России
ssh root@194.58.114.184
wg show wg0                    # проверить handshake
systemctl restart wg-quick@wg0 # если handshake старый

# 2. Проверить NAT на MikroTik
python deploy/_ssh_helper.py cmd "/ip firewall nat print"
# Должно быть правило: dstnat udp 51822 → 192.168.88.11

# 3. Проверить NPM контейнер
ssh -i D:\www\thinking\proxmox_key root@192.168.88.222
pct exec 120 -- docker ps      # должен быть контейнер npm
pct exec 120 -- bash -c "cd /opt/npm && docker compose restart npm"

# 4. Проверить Fatiha app
pct exec 100 -- docker ps      # должны быть fatiha_app и fatiha_postgres
pct exec 100 -- bash -c "cd /opt/fatiha && docker compose restart app"
```
