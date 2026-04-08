"""Install Xray relay on Russian VPS."""
import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

HOST = '194.58.114.184'
USER = 'root'
PASS = '2ew7IOH3Uu7XhCVA'

XRAY_CONFIG = '''{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "tag": "relay-in",
      "port": 8443,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "31.57.118.96",
        "port": 443,
        "network": "tcp",
        "followRedirect": false
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    }
  ]
}
'''

XRAY_SERVICE = '''[Unit]
Description=Xray Relay Service
Documentation=https://github.com/xtls/xray-core
After=network.target

[Service]
Type=simple
User=root
CapabilityBoundingSet=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_ADMIN CAP_NET_BIND_SERVICE
NoNewPrivileges=true
ExecStart=/etc/xray/xray run -config /etc/xray/config.json
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
'''

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, username=USER, password=PASS, timeout=15,
               allow_agent=False, look_for_keys=False)


def run(cmd, timeout=30):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    return out, err


print('=== Шаг 1: Создаём папку /etc/xray ===')
out, _ = run('mkdir -p /etc/xray && echo ok')
print(out)

print('\n=== Шаг 2: Скачиваем Xray-core ===')
out, err = run(
    'cd /etc/xray && '
    'wget -q --show-progress https://github.com/XTLS/Xray-core/releases/latest/download/Xray-linux-64.zip '
    '-O Xray-linux-64.zip 2>&1 && echo downloaded',
    timeout=120
)
print(out or err)

print('\n=== Шаг 3: Распаковываем ===')
out, err = run('cd /etc/xray && unzip -o Xray-linux-64.zip && rm Xray-linux-64.zip && chmod +x xray && echo ok')
print(out or err)

print('\n=== Шаг 4: Версия Xray ===')
out, _ = run('/etc/xray/xray version')
print(out)

print('\n=== Шаг 5: Записываем конфиг ===')
sftp = client.open_sftp()
with sftp.open('/etc/xray/config.json', 'w') as f:
    f.write(XRAY_CONFIG)
with sftp.open('/etc/systemd/system/xray.service', 'w') as f:
    f.write(XRAY_SERVICE)
sftp.close()
print('Конфиг и сервис записаны.')

print('\n=== Шаг 6: Запускаем сервис ===')
out, err = run('systemctl daemon-reload && systemctl enable xray && systemctl restart xray && sleep 2 && echo ok')
print(out or err)

print('\n=== Шаг 7: Статус ===')
out, err = run('systemctl status xray --no-pager | head -20')
print(out or err)

print('\n=== Шаг 8: Проверяем что порт 8443 слушается ===')
out, _ = run('ss -tlnp | grep 8443')
print(out or '(порт не найден)')

client.close()
