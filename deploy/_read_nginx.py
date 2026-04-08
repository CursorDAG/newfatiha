"""Read nginx config and check certbot from VPS."""
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('194.58.114.184', username='root', password='2ew7IOH3Uu7XhCVA',
               timeout=15, allow_agent=False, look_for_keys=False)


def run(cmd, timeout=10):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    return stdout.read().decode('utf-8', errors='replace').strip()


print('=== NGINX CONFIG ===')
print(run('cat /etc/nginx/sites-enabled/multi-proxy.conf'))

print('\n=== CERTBOT CHECK ===')
print(run('which certbot && certbot --version || echo "certbot not found"'))

print('\n=== CERTBOT CERTIFICATES (timeout 15s) ===')
print(run('certbot certificates 2>&1 | head -30', timeout=15))

client.close()
