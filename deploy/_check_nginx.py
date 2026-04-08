"""Read and display nginx config from VPS."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('194.58.114.184', username='root', password='2ew7IOH3Uu7XhCVA',
               timeout=15, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=10):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err


print('=== NGINX CONFIG (первые 30 строк) ===')
out, _ = run('head -30 /etc/nginx/sites-enabled/multi-proxy.conf')
print(out)

print('\n=== NGINX TEST ===')
out, err = run('nginx -t 2>&1')
print(out or err)

client.close()
