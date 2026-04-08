"""Check x-ui panel port on USA VPS."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('31.57.118.96', username='root', password='fjNDeamTsze=y0XlS72',
               timeout=15, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=10):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode('utf-8', errors='replace').strip()


print('=== Файлы x-ui ===')
print(run('ls /usr/local/x-ui/'))

print('\n=== Порт панели из настроек x-ui ===')
print(run('/usr/local/x-ui/x-ui setting 2>&1 | head -20'))

print('\n=== x-ui setting -show ===')
print(run('/usr/local/x-ui/x-ui setting -show 2>&1'))

print('\n=== Все порты x-ui процесса ===')
print(run('ss -tlnp | grep x-ui'))

print('\n=== Версия x-ui ===')
print(run('/usr/local/x-ui/x-ui -v 2>&1 || echo na'))

client.close()
