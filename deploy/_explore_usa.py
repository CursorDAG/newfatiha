"""Explore USA VPS - read only, no changes."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('31.57.118.96', username='root', password='fjNDeamTsze=y0XlS72',
               timeout=15, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=10):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err


print('=== Запущенные сервисы (xray/v2ray/marzban) ===')
out, _ = run('systemctl list-units --type=service --state=running 2>/dev/null | grep -Ei "xray|v2ray|sing|marzban|3x-ui|x-ui"')
print(out or 'не найдено среди системных сервисов')

print('\n=== Процессы ===')
out, _ = run('ps aux | grep -Ei "xray|v2ray|sing-box|marzban|x-ui" | grep -v grep')
print(out or 'не найдено')

print('\n=== Порты ===')
out, _ = run('ss -tlnp | grep -E "443|8443|54321|2053|2083|2087|2096"')
print(out or 'не найдено')

print('\n=== Xray бинарник ===')
out, _ = run('find /usr/local/bin /etc/xray /usr/local/etc/xray /opt -name "xray" 2>/dev/null | head -5')
print(out or 'не найдено')

print('\n=== Конфиг xray ===')
out, _ = run('find /etc/xray /usr/local/etc/xray -name "*.json" 2>/dev/null | head -5')
print(out or 'не найдено')

print('\n=== Папка /etc/xray ===')
out, _ = run('ls -la /etc/xray 2>/dev/null || echo "не существует"')
print(out)

print('\n=== Папка /usr/local/etc/xray ===')
out, _ = run('ls -la /usr/local/etc/xray 2>/dev/null || echo "не существует"')
print(out)

print('\n=== Docker контейнеры ===')
out, _ = run('docker ps 2>/dev/null || echo "docker не установлен"')
print(out)

client.close()
print('\n=== Готово (ничего не изменено) ===')
