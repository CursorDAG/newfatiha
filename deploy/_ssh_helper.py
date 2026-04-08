"""SSH helper for VPS management via paramiko."""
import paramiko
import sys
import time

HOST = '194.58.114.184'
USER = 'root'
PASS = '2ew7IOH3Uu7XhCVA'


def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=15,
                   allow_agent=False, look_for_keys=False)
    return client


def run(client, cmd, timeout=30):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else 'status'

    client = connect()

    if action == 'upload':
        # Upload app.py
        sftp = client.open_sftp()
        sftp.put(r'D:\www\newfatiha\deploy\vps\domain-manager\app.py',
                 '/root/domain-manager/app.py')
        sftp.close()
        print('Файл загружен на сервер.')

    elif action == 'start':
        # Kill old, start new with setsid to fully detach
        out, err = run(client, 'pkill -f "python3 app.py"; echo ok', timeout=5)
        time.sleep(1)
        # Use setsid + redirect all fds to detach fully
        cmd = ('setsid python3 /root/domain-manager/app.py '
               '>/root/domain-manager/app.log 2>&1 </dev/null & echo $!')
        out, err = run(client, cmd, timeout=5)
        print('PID:', out)

    elif action == 'status':
        out, err = run(client, 'ss -tlnp | grep 8080 || echo "port 8080 not listening"')
        print(out)
        out, err = run(client, 'ps aux | grep "python3 app" | grep -v grep || echo "process not found"')
        print(out)
        out, err = run(client, 'tail -20 /root/domain-manager/app.log 2>/dev/null || echo "no log yet"')
        print(out)

    elif action == 'log':
        out, err = run(client, 'cat /root/domain-manager/app.log')
        print(out)

    elif action == 'cmd':
        cmd = ' '.join(sys.argv[2:])
        out, err = run(client, cmd, timeout=60)
        if out: print(out)
        if err: print('[ERR]', err)

    client.close()


if __name__ == '__main__':
    main()
