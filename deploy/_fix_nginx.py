"""Restore corrupted nginx config header and fix upstream block."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

CORRECT_HEADER = """\
# =============================================================
# Nginx Edge Proxy — VPS (194.58.114.184)
# Файл: /etc/nginx/sites-available/multi-proxy.conf
# =============================================================
#
# Мульти-доменный reverse proxy, перенаправляющий весь трафик
# через WireGuard туннель на Nginx Proxy Manager дома.
#
# Чтобы добавить новый домен:
#   1. Добавьте домен в server_name (в обоих блоках: HTTP и HTTPS)
#   2. Получите сертификат: certbot --nginx -d new-domain.ru
#   3. Настройте маршрут в NPM дома
#
# После первой установки запустите:
#   certbot --nginx -d fatiha.ru -d www.fatiha.ru
# Certbot автоматически добавит ssl_certificate директивы.

# --- Upstream: домашний NPM через WireGuard ---
upstream home_npm {
    server 10.0.0.2:80;
    keepalive 32;
}
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('194.58.114.184', username='root', password='2ew7IOH3Uu7XhCVA',
               timeout=15, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=15):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err


# Читаем текущий конфиг
out, _ = run('cat /etc/nginx/sites-enabled/multi-proxy.conf')
lines = out.splitlines(keepends=False)

# Находим строку начала HTTP-блока (# --- HTTP → HTTPS редирект)
start_idx = None
for i, line in enumerate(lines):
    if '# --- HTTP' in line and 'HTTPS' in line:
        start_idx = i
        break

if start_idx is None:
    print('ERROR: не нашёл маркер HTTP-блока!')
    client.close()
    sys.exit(1)

print(f'Маркер HTTP-блока найден на строке {start_idx + 1}')

# Собираем восстановленный конфиг: правильный заголовок + остаток с HTTP-блока
rest = '\n'.join(lines[start_idx:])
new_config = CORRECT_HEADER + '\n' + rest + '\n'

# Пишем через SFTP
sftp = client.open_sftp()
with sftp.open('/etc/nginx/sites-enabled/multi-proxy.conf', 'w') as f:
    f.write(new_config)
sftp.close()
print('Конфиг восстановлен.')

# Проверяем nginx
out, err = run('nginx -t 2>&1')
print('nginx -t:', out or err)

if 'successful' in (out + err):
    out2, _ = run('systemctl reload nginx && echo reloaded')
    print('nginx reload:', out2)
else:
    print('ОШИБКА: конфиг всё ещё неверный!')

client.close()
