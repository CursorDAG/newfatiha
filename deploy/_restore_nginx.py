"""Restore nginx config and fix add_domain function in app.py."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('194.58.114.184', username='root', password='2ew7IOH3Uu7XhCVA',
               timeout=15, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=15):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err


# Узнаём путь к SSL-сертификатам которые certbot создал
out, _ = run('certbot certificates 2>/dev/null | grep -E "Certificate Path|Private Key"')
print('=== SSL пути ===')
print(out)

# Читаем текущий конфиг чтобы найти SSL строки
out, _ = run('cat /etc/nginx/sites-enabled/multi-proxy.conf')
print('\n=== ТЕКУЩИЙ КОНФИГ (первые 60 строк) ===')
for i, line in enumerate(out.splitlines()[:60], 1):
    print(f'{i:3}: {line}')

client.close()
