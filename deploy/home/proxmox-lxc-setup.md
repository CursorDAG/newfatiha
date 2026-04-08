# Создание LXC-контейнеров в Proxmox

## Общие требования

- Proxmox VE 8.x
- Скачанный шаблон: **Ubuntu 24.04** (в GUI: Datacenter → Storage → CT Templates → Download)
- Сеть: bridge `vmbr0` (стандартный), подсеть 192.168.x.x

---

## LXC 1: Nginx Proxy Manager

### Создание через GUI

1. **Create CT** (кнопка сверху)
2. **General:**
   - CT ID: `100` (или любой свободный)
   - Hostname: `npm`
   - Password: задайте пароль root
   - Unprivileged: **Да** (галочка)
3. **Template:** Ubuntu 24.04
4. **Disks:** Root Disk — **8 GB** (NPM занимает мало места)
5. **CPU:** 1 ядро
6. **Memory:** 512 MB RAM, 512 MB Swap
7. **Network:**
   - Bridge: `vmbr0`
   - IPv4: Static
   - IP: `192.168.1.10/24` (замените на ваш)
   - Gateway: `192.168.1.1` (замените на ваш)
8. **DNS:** оставить по умолчанию (наследуется от хоста)

### Включение Nesting (для Docker)

В GUI Proxmox:
- Выберите контейнер `100 (npm)`
- **Options → Features → Nesting** → поставить галочку

Или через CLI на хосте Proxmox:

```bash
# Отредактировать конфиг LXC
nano /etc/pve/lxc/100.conf

# Добавить или изменить строку:
features: nesting=1
```

### Установка Docker внутри LXC

```bash
# Войти в контейнер
pct enter 100

# Обновить систему
apt update && apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com | sh

# Проверить
docker --version
docker compose version

# Перейти в рабочую директорию
mkdir -p /opt/npm
cd /opt/npm

# Скопировать docker-compose.yml (с вашей машины или через SCP)
# scp user@your-pc:deploy/home/npm/docker-compose.yml /opt/npm/

# Запустить NPM
docker compose up -d

# Проверить
docker compose ps
```

### Проверка NPM

Откройте в браузере: `http://192.168.1.10:81`
- Email: `admin@example.com`
- Пароль: `changeme`
- **Обязательно смените при первом входе!**

---

## LXC 2: Fatiha.ru (Next.js + PostgreSQL)

### Создание через GUI

1. **Create CT**
2. **General:**
   - CT ID: `101`
   - Hostname: `fatiha`
   - Unprivileged: **Да**
3. **Template:** Ubuntu 24.04
4. **Disks:** Root Disk — **20 GB** (БД + образы Docker)
5. **CPU:** 2 ядра (рекомендуемый минимум для Next.js сборки)
6. **Memory:** 4096 MB RAM, 2048 MB Swap
7. **Network:**
   - Bridge: `vmbr0`
   - IPv4: Static
   - IP: `192.168.1.20/24` (замените на ваш)
   - Gateway: `192.168.1.1`

### Включение Nesting

```bash
# На хосте Proxmox:
nano /etc/pve/lxc/101.conf
# Добавить:
features: nesting=1
```

### Установка Docker и деплой приложения

```bash
# Войти в контейнер
pct enter 101

# Обновить систему
apt update && apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com | sh

# Установить Git (для клонирования проекта)
apt install -y git

# Клонировать проект
cd /opt
git clone https://github.com/CursorDAG/newfatiha fatiha
cd fatiha

# Или скопировать через SCP:
# mkdir -p /opt/fatiha
# scp -r user@your-pc:path/to/newfatiha/* root@192.168.1.20:/opt/fatiha/

# Скопировать production docker-compose (без nginx)
cp deploy/home/fatiha/docker-compose.yml ./docker-compose.yml

# Создать .env.production
cp .env.production.example .env.production
nano .env.production
# Заполнить все обязательные переменные!

# Собрать и запустить
docker compose up -d --build

# Применить миграции БД
docker compose exec app npx prisma migrate deploy

# Проверить
docker compose ps
curl http://localhost:3000
```

---

## LXC для WireGuard (опционально)

WireGuard можно установить:
- **На хосте Proxmox** (проще, не нужен отдельный LXC)
- **В отдельном LXC** (чище изоляция)

### Вариант: WireGuard на хосте Proxmox

```bash
# На хосте Proxmox:
apt install -y wireguard

# Сгенерировать ключи
wg genkey | tee /etc/wireguard/home_privatekey | wg pubkey > /etc/wireguard/home_publickey

# Скопировать конфиг (заменив плейсхолдеры)
cp deploy/home/wireguard/wg0.conf /etc/wireguard/wg0.conf
chmod 600 /etc/wireguard/wg0.conf

# Подставить ключи
# HOME_PRIVATE_KEY → содержимое /etc/wireguard/home_privatekey
# VPS_PUBLIC_KEY   → публичный ключ VPS (из /etc/wireguard/vps_publickey на VPS)

# Запустить
systemctl enable wg-quick@wg0
systemctl start wg-quick@wg0

# Проверить
wg show wg0
```

### Маршрутизация WireGuard → NPM

На хосте Proxmox трафик из WireGuard (10.0.0.0/24) должен
попадать в LXC с NPM. Это работает автоматически, если:
- NPM LXC и Proxmox хост в одной подсети (vmbr0)
- В wg0.conf Home прописан MASQUERADE (уже есть в конфиге)

Проверка с VPS:

```bash
# На VPS, после запуска WireGuard на обеих сторонах:
ping 10.0.0.2            # Proxmox хост через туннель
curl http://10.0.0.2:80  # Должен попасть в NPM (после настройки маршрутизации)
```

Если NPM на IP 192.168.1.10, а WireGuard на хосте Proxmox (10.0.0.2),
нужно добавить маршрут или iptables DNAT:

```bash
# На хосте Proxmox — перенаправить порт 80 с WireGuard на NPM
iptables -t nat -A PREROUTING -i wg0 -p tcp --dport 80 -j DNAT --to-destination 192.168.1.10:80
iptables -A FORWARD -i wg0 -o vmbr0 -p tcp --dport 80 -j ACCEPT
```

---

## Шаблон для нового сайта (LXC N)

Повторите шаги для LXC 2, изменив:

| Параметр | Значение |
|----------|----------|
| CT ID | Следующий свободный (102, 103...) |
| Hostname | Имя сайта (например, `othersite`) |
| IP | Следующий IP (192.168.1.30...) |
| Disk | По потребности приложения |
| CPU/RAM | По потребности приложения |

Затем в NPM добавьте Proxy Host для нового домена → IP нового LXC.

---

## Полезные команды Proxmox

```bash
# Список контейнеров
pct list

# Войти в контейнер
pct enter <CT_ID>

# Запустить/остановить
pct start <CT_ID>
pct stop <CT_ID>

# Посмотреть конфиг
cat /etc/pve/lxc/<CT_ID>.conf

# Бэкап контейнера
vzdump <CT_ID> --dumpdir /var/backups --compress zstd
```
