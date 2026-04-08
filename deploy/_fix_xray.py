"""Fix Xray installation - install unzip and extract binary."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('194.58.114.184', username='root', password='2ew7IOH3Uu7XhCVA',
               timeout=15, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=60):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err


print('=== Устанавливаем unzip ===')
out, err = run('apt install -y unzip 2>&1 | tail -3')
print(out or err)

print('\n=== Распаковываем Xray ===')
out, err = run('cd /etc/xray && unzip -o Xray-linux-64.zip && rm -f Xray-linux-64.zip && chmod +x xray && echo ok')
print(out or err)

print('\n=== Версия Xray ===')
out, _ = run('/etc/xray/xray version')
print(out)

print('\n=== Перезапускаем сервис ===')
out, err = run('systemctl restart xray && sleep 2 && systemctl status xray --no-pager | head -15')
print(out or err)

print('\n=== Порт 8443 ===')
out, _ = run('ss -tlnp | grep 8443')
print(out or '(не найден)')

client.close()
