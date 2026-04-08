"""Deploy updated files to home fatiha server via SSH key auth."""
import paramiko
import time
import sys

HOST = '192.168.88.60'
USER = 'root'
KEY_FILE = r'C:\Users\bityi\.ssh\id_ed25519_fatiha'

LOCAL_NAVBAR = r'D:\www\newfatiha\src\components\Navbar.tsx'
PROJECT_DIR = None  # resolved at runtime


def connect():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, key_filename=KEY_FILE, timeout=15,
                   allow_agent=False, look_for_keys=False)
    return client


def run(client, cmd, timeout=60):
    _, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err


def find_project(client):
    """Find the directory containing docker-compose.yml for fatiha."""
    # Check docker container labels/inspect for WorkingDir
    out, _ = run(client, "docker inspect fatiha_app --format '{{.Config.WorkingDir}}' 2>/dev/null")
    if out:
        print(f'  WorkingDir inside container: {out}')

    # Find by docker-compose label
    out, _ = run(client, "docker inspect fatiha_app --format '{{index .Config.Labels \"com.docker.compose.project.working_dir\"}}' 2>/dev/null")
    if out:
        print(f'  Compose project dir: {out}')
        return out

    # Search filesystem
    out, _ = run(client, 'find / -name "docker-compose.yml" -not -path "*/proc/*" -not -path "*/sys/*" 2>/dev/null | head -10')
    if out:
        lines = [l.strip() for l in out.splitlines() if 'fatiha' in l.lower() or 'newfatiha' in l.lower()]
        if lines:
            return lines[0].rsplit('/', 1)[0]
        # fallback: first result
        lines = [l.strip() for l in out.splitlines() if l.strip()]
        if lines:
            return lines[0].rsplit('/', 1)[0]

    return None


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else 'check'

    print(f'[*] Connecting to {HOST}...')
    client = connect()
    print('[+] Connected.')

    if action == 'check':
        print('\n=== Docker containers ===')
        out, _ = run(client, 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
        print(out)

        print('\n=== Finding project directory ===')
        project_dir = find_project(client)
        print(f'  Found: {project_dir}')

        if project_dir:
            print('\n=== Project files ===')
            out, _ = run(client, f'ls -la {project_dir}')
            print(out)

            print('\n=== Git status ===')
            out, err = run(client, f'cd {project_dir} && git status 2>&1')
            print(out or err)

    elif action == 'deploy':
        print('\n[1] Finding project directory...')
        project_dir = find_project(client)
        if not project_dir:
            print('[!] Project directory not found!')
            client.close()
            return
        print(f'[+] Project dir: {project_dir}')

        # Check if git repo
        out, _ = run(client, f'test -d {project_dir}/.git && echo yes || echo no')
        has_git = out.strip() == 'yes'

        if has_git:
            print('\n[2] Pulling latest code from git...')
            out, err = run(client, f'cd {project_dir} && git pull origin xnjnj 2>&1', timeout=60)
            print(out or err)
        else:
            print('\n[2] No git repo — uploading Navbar.tsx directly via SFTP...')
            remote_navbar = f'{project_dir}/src/components/Navbar.tsx'
            run(client, f'mkdir -p {project_dir}/src/components')
            sftp = client.open_sftp()
            sftp.put(LOCAL_NAVBAR, remote_navbar)
            sftp.close()
            print(f'[+] Uploaded: {remote_navbar}')

        print('\n[3] Rebuilding Docker image (3-5 min)...')
        _, stdout, stderr = client.exec_command(
            f'cd {project_dir} && docker compose build app 2>&1', timeout=600
        )
        for line in stdout:
            safe = line.rstrip().encode('cp1251', errors='replace').decode('cp1251')
            print(safe)

        print('\n[4] Restarting container...')
        out, err = run(client, f'cd {project_dir} && docker compose up -d app', timeout=60)
        print(out)
        if err:
            print('[ERR]', err)

        print('\n[5] Checking status...')
        time.sleep(5)
        out, _ = run(client, 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"')
        print(out)
        print('\n[OK] Deploy complete!')

    client.close()


if __name__ == '__main__':
    main()
