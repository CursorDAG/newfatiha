#!/usr/bin/env python3
"""
Простой веб-интерфейс для управления доменами на VPS с авторизацией.
Автоматически добавляет домены в Nginx и получает SSL-сертификаты.

Пароль хранится в /root/domain-manager/.passwd (приоритет над ENV DOMAIN_MGR_PASSWORD).
"""

import os
import subprocess
import json
import re
import hashlib
from flask import Flask, render_template_string, request, redirect, url_for, flash, session

app = Flask(__name__)
app.secret_key = os.urandom(32)

PASSWD_FILE = "/root/domain-manager/.passwd"


def get_password():
    """Читает пароль из файла, иначе из ENV, иначе дефолт."""
    try:
        with open(PASSWD_FILE) as f:
            pwd = f.read().strip()
            if pwd:
                return pwd
    except Exception:
        pass
    return os.environ.get("DOMAIN_MGR_PASSWORD", "admin123456")


def save_password(new_pwd):
    """Сохраняет новый пароль в файл."""
    os.makedirs(os.path.dirname(PASSWD_FILE), exist_ok=True)
    with open(PASSWD_FILE, "w") as f:
        f.write(new_pwd)

NGINX_CONF = "/etc/nginx/sites-enabled/multi-proxy.conf"
VPS_IP = "194.58.114.184"
NPM_IP = "192.168.88.50"
NPM_PORT = "81"


LOGIN_HTML = '''
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Вход — VPS Manager</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0f172a; color: #e2e8f0; min-height: 100vh;
          display: flex; align-items: center; justify-content: center; }
  .login-card { background: #1e293b; border-radius: 16px; padding: 2.5rem; width: 360px;
                 border: 1px solid #334155; text-align: center; }
  .login-card h1 { color: #10b981; margin-bottom: 0.25rem; font-size: 1.5rem; }
  .login-card p { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
  input[type="password"] { width: 100%; padding: 0.75rem 1rem; background: #0f172a;
                            border: 1px solid #334155; border-radius: 8px;
                            color: #e2e8f0; font-size: 1rem; outline: none; margin-bottom: 1rem; }
  input[type="password"]:focus { border-color: #10b981; }
  button { width: 100%; padding: 0.75rem; background: #10b981; color: #fff; border: none;
            border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; }
  button:hover { background: #059669; }
  .flash { padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem;
            background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
</style>
</head>
<body>
<div class="login-card">
  <h1>🔐 VPS Manager</h1>
  <p>Управление доменами и SSL-сертификатами</p>
  {% if error %}<div class="flash">{{ error }}</div>{% endif %}
  <form method="POST" action="/login">
    <input type="password" name="password" placeholder="Пароль" required autofocus>
    <button type="submit">Войти</button>
  </form>
</div>
</body>
</html>
'''


MAIN_HTML = '''
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Домены — VPS Manager</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
  .container { max-width: 800px; margin: 0 auto; }
  .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  h1 { color: #10b981; font-size: 1.8rem; }
  .subtitle { color: #64748b; font-size: 0.9rem; }
  .logout { color: #f87171; font-size: 0.85rem; text-decoration: none; padding: 0.5rem 1rem;
             border: 1px solid #7f1d1d; border-radius: 8px; }
  .logout:hover { background: #450a0a; }
  .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;
           border: 1px solid #334155; }
  .card h2 { color: #94a3b8; font-size: 1rem; text-transform: uppercase; letter-spacing: 0.05em;
              margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.75rem 1rem; border-bottom: 1px solid #334155; }
  th { color: #64748b; font-weight: 600; font-size: 0.85rem; }
  td { font-size: 0.95rem; }
  .badge-ssl { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px;
                font-size: 0.75rem; font-weight: 600; }
  .badge-ok { background: #064e3b; color: #34d399; }
  .badge-fail { background: #450a0a; color: #f87171; }
  .form-row { display: flex; gap: 0.75rem; margin-bottom: 1rem; }
  input[type="text"] { flex: 1; padding: 0.75rem 1rem; background: #0f172a; border: 1px solid #334155;
                          border-radius: 8px; color: #e2e8f0; font-size: 1rem; outline: none; }
  input[type="text"]:focus { border-color: #10b981; }
  input[type="text"]::placeholder { color: #475569; }
  button { padding: 0.75rem 1.5rem; background: #10b981; color: #fff; border: none;
            border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; }
  button:hover { background: #059669; }
  button.danger { background: #dc2626; padding: 0.3rem 0.7rem; font-size: 0.8rem; }
  button.danger:hover { background: #b91c1c; }
  button.ssl-btn { background: #0369a1; padding: 0.2rem 0.6rem; font-size: 0.75rem; font-weight: 700; }
  button.ssl-btn:hover { background: #0284c7; }
  .flash { padding: 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.9rem; white-space: pre-wrap; }
  .flash-success { background: #064e3b; color: #34d399; border: 1px solid #065f46; }
  .flash-error { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
  .npm-info { background: #0f172a; padding: 1rem; border-radius: 8px; font-family: monospace;
               font-size: 0.85rem; color: #94a3b8; line-height: 1.6; }
  .npm-info strong { color: #10b981; }
  .empty { text-align: center; padding: 2rem; color: #475569; }
  .stats { display: flex; gap: 1.5rem; margin-bottom: 2rem; }
  .stat { background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 1rem 1.5rem;
           flex: 1; text-align: center; }
  .stat-value { font-size: 2rem; font-weight: 700; color: #10b981; }
  .stat-label { color: #64748b; font-size: 0.85rem; margin-top: 0.25rem; }
  a { color: #10b981; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { background: #0f172a; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
</style>
</head>
<body>
<div class="container">
  <div class="topbar">
    <div>
      <h1>🌐 Управление доменами</h1>
      <p class="subtitle">VPS {{ vps_ip }} — Nginx + SSL автоматизация</p>
    </div>
    <div style="display:flex; gap: 0.75rem; align-items: center;">
      <a href="{{ url_for('vpn') }}" style="color: #34d399; font-size: 0.85rem; text-decoration: none;
         padding: 0.5rem 1rem; border: 1px solid #065f46; border-radius: 8px;">🔒 VPN</a>
      <a href="{{ url_for('change_password') }}" style="color: #94a3b8; font-size: 0.85rem; text-decoration: none;
         padding: 0.5rem 1rem; border: 1px solid #334155; border-radius: 8px;">🔑 Пароль</a>
      <a href="{{ url_for('logout') }}" class="logout">Выйти</a>
    </div>
  </div>

  <div class="stats">
    <div class="stat"><div class="stat-value">{{ domains|length }}</div><div class="stat-label">Доменов</div></div>
    <div class="stat"><div class="stat-value">{{ ssl_ok }}</div><div class="stat-label">С SSL</div></div>
    <div class="stat"><div class="stat-value">{{ ssl_fail }}</div><div class="stat-label">Без SSL</div></div>
  </div>

  {% for msg in get_flashed_messages(with_categories=true) %}
  <div class="flash flash-{{ msg[0] }}">{{ msg[1] }}</div>
  {% endfor %}

  <div class="card">
    <h2>Добавить домен</h2>
    <form method="POST" action="/add">
      <div class="form-row">
        <input type="text" name="domain" placeholder="example.ru" required
               pattern="[a-z0-9][a-z0-9.-]*\\.[a-z]{2,}">
        <input type="text" name="fwd_ip" placeholder="IP LXC (192.168.88.x)" style="flex: 0 0 220px;">
        <button type="submit">Добавить + SSL</button>
      </div>
      <p style="font-size: 0.8rem; color: #475569;">DNS A-запись для домена должна указывать на {{ vps_ip }}</p>
    </form>
  </div>

  <div class="card">
    <h2>Домены</h2>
    {% if domains %}
    <table>
      <thead><tr><th>Домен</th><th>SSL</th><th>NPM Forward</th><th></th></tr></thead>
      <tbody>
      {% for d in domains %}
      <tr>
        <td><a href="https://{{ d.name }}" target="_blank">{{ d.name }}</a></td>
        <td>
          <span class="badge-ssl badge-{{ d.ssl_class }}">{{ d.ssl_text }}</span>
          {% if d.ssl_class != 'ok' %}
          <form method="POST" action="/ssl/{{ d.name }}" style="display:inline; margin-left: 0.4rem;">
            <button type="submit" class="ssl-btn" title="Получить SSL сертификат">+ SSL</button>
          </form>
          {% endif %}
        </td>
        <td style="font-size: 0.85rem; color: #94a3b8;">NPM → {{ d.fwd_ip or '—' }}</td>
        <td><form method="POST" action="/delete/{{ d.name }}" style="display:inline;"
              onsubmit="return confirm('Удалить {{ d.name }}?');">
            <button type="submit" class="danger">✕</button></form></td>
      </tr>
      {% endfor %}
      </tbody>
    </table>
    {% else %}
    <div class="empty">Нет доменов. Добавьте первый.</div>
    {% endif %}
  </div>

  <div class="card">
    <h2>Настройка NPM (домашний сервер)</h2>
    <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 1rem;">
      После добавления домена — откройте <a href="http://{{ npm_ip }}:{{ npm_port }}" target="_blank">NPM</a> и создайте Proxy Host:
    </p>
    <div class="npm-info">
      <strong>1.</strong> Proxy Hosts → Add Proxy Host<br>
      <strong>2.</strong> Domain: <code>{{ domain }}</code> <code>www.{{ domain }}</code><br>
      <strong>3.</strong> Forward IP: IP вашего LXC<br>
      <strong>4.</strong> Forward Port: 3000<br>
      <strong>5.</strong> ☑ WebSockets Support<br>
      <strong>6.</strong> ☑ Block Common Exploits → Save
    </div>
  </div>
</div>
</body>
</html>
'''


def verify_password(pwd):
    return pwd == get_password()


def get_nginx_domains():
    seen = set()
    domains = []
    try:
        with open(NGINX_CONF) as f:
            content = f.read()
        # Ищем все server_name директивы, игнорируя комментарии и не выходя за пределы строки
        for line in content.splitlines():
            line = line.strip()
            if line.startswith('#'):
                continue
            m = re.match(r'server_name\s+([^;]+);', line)
            if m:
                for token in m.group(1).split():
                    token = token.strip()
                    if token and '*' not in token and not token.startswith('www.') and token not in seen:
                        seen.add(token)
                        domains.append({"name": token, "www": f"www.{token}", "fwd_ip": None})
                break  # берём только первый блок server_name
    except Exception as e:
        print(f"Ошибка чтения nginx конфига: {e}")
    fwd_data = {}
    try:
        with open("/etc/domain-fwd.json") as f:
            fwd_data = json.load(f)
    except Exception:
        pass
    for d in domains:
        d["fwd_ip"] = fwd_data.get(d["name"])
    return domains


def get_certbot_domains():
    """Запускает certbot один раз и возвращает множество доменов с SSL."""
    try:
        result = subprocess.run(["certbot", "certificates"],
                                capture_output=True, text=True, timeout=30)
        # Собираем все домены из строк "Domains: ..."
        domains_with_ssl = set()
        for line in result.stdout.splitlines():
            if 'Domains:' in line:
                for d in line.split(':', 1)[1].split():
                    domains_with_ssl.add(d.strip())
        return domains_with_ssl
    except Exception:
        return set()


def check_ssl_status(domain, ssl_domains_set):
    if domain in ssl_domains_set or f"www.{domain}" in ssl_domains_set:
        return "ok", "OK"
    return "fail", "Нет SSL"


def _update_server_name_line(line, add=None, remove=None):
    """Добавляет или удаляет домены из строки server_name, не трогая другие строки."""
    m = re.match(r'^(\s*server_name\s+)([^;]+)(;\s*)$', line)
    if not m:
        return line
    prefix, tokens_str, suffix = m.group(1), m.group(2), m.group(3)
    tokens = set(tokens_str.split())
    if add:
        tokens.update(add)
    if remove:
        tokens -= set(remove)
    if not tokens:
        tokens = {'localhost'}
    return prefix + ' '.join(sorted(tokens)) + suffix


def add_domain_to_nginx(domain, www):
    with open(NGINX_CONF) as f:
        lines = f.readlines()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        # Пропускаем комментарии — не трогаем их
        if stripped.startswith('#'):
            new_lines.append(line)
            continue
        if re.match(r'\s*server_name\s+', line):
            line = _update_server_name_line(line.rstrip('\n'), add=[domain, www]) + '\n'
        new_lines.append(line)
    with open(NGINX_CONF, 'w') as f:
        f.writelines(new_lines)


def save_fwd_ip(domain, ip):
    fwd_data = {}
    try:
        with open("/etc/domain-fwd.json") as f:
            fwd_data = json.load(f)
    except:
        pass
    fwd_data[domain] = ip
    with open("/etc/domain-fwd.json", "w") as f:
        json.dump(fwd_data, f, indent=2)


def delete_domain_from_nginx(domain, www):
    with open(NGINX_CONF) as f:
        lines = f.readlines()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('#'):
            new_lines.append(line)
            continue
        if re.match(r'\s*server_name\s+', line):
            line = _update_server_name_line(line.rstrip('\n'), remove=[domain, www]) + '\n'
        new_lines.append(line)
    with open(NGINX_CONF, 'w') as f:
        f.writelines(new_lines)
    try:
        subprocess.run(["certbot", "revoke", "--cert-path", f"/etc/letsencrypt/live/{domain}/fullchain.pem",
                       "--non-interactive"], capture_output=True, timeout=30)
    except:
        pass
    try:
        subprocess.run(["certbot", "delete", "--cert-name", domain, "--non-interactive"],
                       capture_output=True, timeout=30)
    except:
        pass
    try:
        with open("/etc/domain-fwd.json") as f:
            fwd_data = json.load(f)
        fwd_data.pop(domain, None)
        with open("/etc/domain-fwd.json", "w") as f:
            json.dump(fwd_data, f, indent=2)
    except:
        pass


@app.route("/")
def index():
    if not session.get("auth"):
        return render_template_string(LOGIN_HTML)
    return render_main_page()


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        if verify_password(request.form.get("password", "")):
            session["auth"] = True
            return redirect(url_for("index"))
        return render_template_string(LOGIN_HTML, error="Неверный пароль")
    return render_template_string(LOGIN_HTML)


@app.route("/logout")
def logout():
    session.pop("auth", None)
    return redirect(url_for("index"))


@app.route("/add", methods=["POST"])
def add_domain():
    if not session.get("auth"):
        return redirect(url_for("index"))
    domain = request.form.get("domain", "").lower().strip()
    fwd_ip = request.form.get("fwd_ip", "").strip()
    if not domain or not re.match(r'^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$', domain):
        flash(("error", "Некорректный формат домена."))
        return redirect(url_for("index"))
    www = f"www.{domain}"
    existing = get_nginx_domains()
    if domain in [d["name"] for d in existing]:
        flash(("error", f"Домен {domain} уже существует."))
        return redirect(url_for("index"))
    try:
        add_domain_to_nginx(domain, www)
        test = subprocess.run(["nginx", "-t"], capture_output=True, text=True, timeout=10)
        if test.returncode != 0:
            flash(("error", f"Nginx конфиг ошибка:\n{test.stderr}"))
            return redirect(url_for("index"))
        subprocess.run(["systemctl", "reload", "nginx"], timeout=10)
        if fwd_ip:
            save_fwd_ip(domain, fwd_ip)
        flash(("success", f"Nginx обновлён. Запрашиваю SSL для {domain}..."))
        result = subprocess.run(
            ["certbot", "certonly", "--nginx", "-d", domain, "-d", www,
             "--non-interactive", "--agree-tos", "--email", "admin@fatiha.ru"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            flash(("success", f"SSL получен для {domain}!\nНастройте маршрут в NPM: http://{NPM_IP}:{NPM_PORT}"))
        else:
            flash(("error", f"SSL не получен: {result.stderr}\nПроверьте DNS для {domain} → {VPS_IP}\nПозже: certbot --nginx -d {domain} -d {www}"))
    except subprocess.TimeoutExpired:
        flash(("error", "Таймаут. Попробуйте ещё."))
    except Exception as e:
        flash(("error", f"Ошибка: {str(e)}"))
    return redirect(url_for("index"))


@app.route("/delete/<domain>", methods=["POST"])
def delete_domain(domain):
    if not session.get("auth"):
        return redirect(url_for("index"))
    www = f"www.{domain}"
    try:
        delete_domain_from_nginx(domain, www)
        test = subprocess.run(["nginx", "-t"], capture_output=True, text=True, timeout=10)
        if test.returncode == 0:
            subprocess.run(["systemctl", "reload", "nginx"], timeout=10)
        flash(("success", f"Домен {domain} удалён."))
    except Exception as e:
        flash(("error", f"Ошибка: {str(e)}"))
    return redirect(url_for("index"))


@app.route("/ssl/<domain>", methods=["POST"])
def request_ssl(domain):
    if not session.get("auth"):
        return redirect(url_for("index"))
    if not re.match(r'^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$', domain):
        flash(("error", "Некорректный домен."))
        return redirect(url_for("index"))
    www = f"www.{domain}"
    try:
        result = subprocess.run(
            ["certbot", "certonly", "--nginx", "-d", domain, "-d", www,
             "--non-interactive", "--agree-tos", "--email", "admin@fatiha.ru"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            flash(("success", f"SSL успешно получен для {domain}!\nНастройте маршрут в NPM: http://{NPM_IP}:{NPM_PORT}"))
        else:
            flash(("error", f"SSL не получен для {domain}:\n{result.stderr}\nУбедитесь что DNS A-запись {domain} → {VPS_IP} уже активна (проверить: nslookup {domain})"))
    except subprocess.TimeoutExpired:
        flash(("error", "Таймаут. Certbot не ответил за 2 минуты. Попробуйте позже."))
    except Exception as e:
        flash(("error", f"Ошибка: {str(e)}"))
    return redirect(url_for("index"))


def render_main_page():
    domains = get_nginx_domains()
    ssl_domains_set = get_certbot_domains()  # certbot запускается только один раз
    ssl_ok = ssl_fail = 0
    for d in domains:
        status, text = check_ssl_status(d["name"], ssl_domains_set)
        d["ssl_class"] = "ok" if status == "ok" else "fail" if status == "fail" else "unknown"
        d["ssl_text"] = text
        if status == "ok":
            ssl_ok += 1
        elif status == "fail":
            ssl_fail += 1
    return render_template_string(MAIN_HTML,
        domains=domains, ssl_ok=ssl_ok, ssl_fail=ssl_fail,
        vps_ip=VPS_IP, npm_ip=NPM_IP, npm_port=NPM_PORT,
        domain=domains[0]["name"] if domains else "domain.ru",
    )


CHANGE_PWD_HTML = '''
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Смена пароля — VPS Manager</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: #0f172a; color: #e2e8f0; min-height: 100vh;
         display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .card { background: #1e293b; border-radius: 16px; padding: 2.5rem; width: 400px;
          border: 1px solid #334155; }
  .card h1 { color: #10b981; margin-bottom: 0.25rem; font-size: 1.4rem; }
  .card p { color: #64748b; font-size: 0.85rem; margin-bottom: 2rem; }
  label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.4rem; }
  input[type="password"] { width: 100%; padding: 0.75rem 1rem; background: #0f172a;
                           border: 1px solid #334155; border-radius: 8px; color: #e2e8f0;
                           font-size: 1rem; outline: none; margin-bottom: 1.25rem; }
  input[type="password"]:focus { border-color: #10b981; }
  button { width: 100%; padding: 0.75rem; background: #10b981; color: #fff; border: none;
           border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-bottom: 1rem; }
  button:hover { background: #059669; }
  .back { display: block; text-align: center; color: #64748b; font-size: 0.85rem;
          text-decoration: none; }
  .back:hover { color: #e2e8f0; }
  .flash { padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; }
  .flash-success { background: #064e3b; color: #34d399; border: 1px solid #065f46; }
  .flash-error { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
</style>
</head>
<body>
<div class="card">
  <h1>🔑 Смена пароля</h1>
  <p>Панель управления VPS Manager</p>
  {% for msg in get_flashed_messages(with_categories=true) %}
  <div class="flash flash-{{ msg[0] }}">{{ msg[1] }}</div>
  {% endfor %}
  <form method="POST">
    <label>Текущий пароль</label>
    <input type="password" name="current_pwd" required autofocus>
    <label>Новый пароль</label>
    <input type="password" name="new_pwd" required minlength="6">
    <label>Повторите новый пароль</label>
    <input type="password" name="new_pwd2" required minlength="6">
    <button type="submit">Сменить пароль</button>
  </form>
  <a href="{{ url_for('index') }}" class="back">← Вернуться в панель</a>
</div>
</body>
</html>
'''


@app.route("/change-password", methods=["GET", "POST"])
def change_password():
    if not session.get("auth"):
        return redirect(url_for("index"))
    if request.method == "POST":
        current = request.form.get("current_pwd", "")
        new_pwd = request.form.get("new_pwd", "")
        new_pwd2 = request.form.get("new_pwd2", "")
        if not verify_password(current):
            flash(("error", "Текущий пароль неверный."))
        elif len(new_pwd) < 6:
            flash(("error", "Новый пароль должен быть не менее 6 символов."))
        elif new_pwd != new_pwd2:
            flash(("error", "Пароли не совпадают."))
        else:
            save_password(new_pwd)
            session.pop("auth", None)
            flash(("success", "Пароль успешно изменён. Войдите с новым паролем."))
            return redirect(url_for("index"))
    return render_template_string(CHANGE_PWD_HTML)


VPN_HTML = '''
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>VPN — VPS Manager</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: #0f172a; color: #e2e8f0; min-height: 100vh; padding: 2rem; }
  .container { max-width: 800px; margin: 0 auto; }
  .topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
  h1 { color: #10b981; font-size: 1.8rem; }
  .subtitle { color: #64748b; font-size: 0.9rem; }
  .nav-links { display: flex; gap: 1rem; align-items: center; }
  .nav-link { color: #94a3b8; font-size: 0.85rem; text-decoration: none;
              padding: 0.5rem 1rem; border: 1px solid #334155; border-radius: 8px; }
  .nav-link:hover { background: #1e293b; color: #e2e8f0; }
  .logout { color: #f87171; font-size: 0.85rem; text-decoration: none;
            padding: 0.5rem 1rem; border: 1px solid #7f1d1d; border-radius: 8px; }
  .logout:hover { background: #450a0a; }
  .card { background: #1e293b; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;
          border: 1px solid #334155; }
  .card h2 { color: #94a3b8; font-size: 1rem; text-transform: uppercase;
             letter-spacing: 0.05em; margin-bottom: 1rem; }
  textarea { width: 100%; padding: 0.75rem 1rem; background: #0f172a; border: 1px solid #334155;
             border-radius: 8px; color: #e2e8f0; font-size: 0.85rem; font-family: monospace;
             outline: none; resize: vertical; min-height: 100px; }
  textarea:focus { border-color: #10b981; }
  .config-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
  .config-item { flex: 1; }
  .config-item label { display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 0.4rem; }
  input[type="text"] { width: 100%; padding: 0.6rem 0.8rem; background: #0f172a;
                       border: 1px solid #334155; border-radius: 8px; color: #e2e8f0;
                       font-size: 0.9rem; outline: none; }
  input[type="text"]:focus { border-color: #10b981; }
  button { padding: 0.75rem 1.5rem; background: #10b981; color: #fff; border: none;
           border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; }
  button:hover { background: #059669; }
  #result { display: none; }
  .result-link { background: #0f172a; border: 1px solid #334155; border-radius: 8px;
                 padding: 1rem; font-family: monospace; font-size: 0.78rem; color: #34d399;
                 word-break: break-all; line-height: 1.6; }
  .copy-btn { background: #1d4ed8; padding: 0.5rem 1.2rem; font-size: 0.85rem; margin-top: 0.75rem; }
  .copy-btn:hover { background: #1e40af; }
  .copy-btn.copied { background: #059669; }
  #qrcode { display: flex; justify-content: center; padding: 1rem 0; }
  #qrcode canvas, #qrcode img { border-radius: 8px; border: 4px solid #fff; }
  .hint { font-size: 0.8rem; color: #475569; margin-top: 0.5rem; line-height: 1.5; }
  .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 6px; font-size: 0.75rem;
           font-weight: 600; background: #064e3b; color: #34d399; margin-left: 0.5rem; }
  .error-box { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d;
               border-radius: 8px; padding: 1rem; margin-top: 1rem; font-size: 0.85rem; }
</style>
</head>
<body>
<div class="container">
  <div class="topbar">
    <div>
      <h1>🔒 VPN Генератор</h1>
      <p class="subtitle">Конвертация VLESS-ссылок для российского реле</p>
    </div>
    <div class="nav-links">
      <a href="{{ url_for('index') }}" class="nav-link">← Домены</a>
      <a href="{{ url_for('logout') }}" class="logout">Выйти</a>
    </div>
  </div>

  <div class="card">
    <h2>Параметры реле <span class="badge">Российский VPS</span></h2>
    <div class="config-row">
      <div class="config-item">
        <label>IP реле (Россия)</label>
        <input type="text" id="relay-ip" value="{{ vps_ip }}">
      </div>
      <div class="config-item">
        <label>Порт реле</label>
        <input type="text" id="relay-port" value="8443">
      </div>
      <div class="config-item">
        <label>Название подключения</label>
        <input type="text" id="relay-name" value="RussianRelay">
      </div>
    </div>
    <p class="hint">Эти значения подставляются вместо IP и порта США-сервера.</p>
  </div>

  <div class="card">
    <h2>VLESS-ссылка с USA сервера</h2>
    <textarea id="vless-input" placeholder="vless://UUID@31.57.118.96:443?type=tcp&security=reality&...#название"></textarea>
    <p class="hint" style="margin-top: 0.5rem;">Вставьте ссылку из 3x-ui панели (https://31.57.118.96:8443/panel/inbounds)</p>
    <br>
    <button onclick="convert()">Сгенерировать QR и ссылку</button>
    <div id="error-msg"></div>
  </div>

  <div id="result">
    <div class="card">
      <h2>QR-код для сканирования</h2>
      <div id="qrcode"></div>
      <p class="hint" style="text-align:center; margin-top: 0.5rem;">
        Сканируй в v2rayNG (Android), Hiddify, Streisand или любом VLESS-клиенте
      </p>
    </div>
    <div class="card">
      <h2>Ссылка для копирования</h2>
      <div class="result-link" id="result-link"></div>
      <button class="copy-btn" id="copy-btn" onclick="copyLink()">Скопировать ссылку</button>
    </div>
  </div>
</div>

<script>
let convertedLink = '';

function convert() {
  const raw = document.getElementById('vless-input').value.trim();
  const relayIp = document.getElementById('relay-ip').value.trim();
  const relayPort = document.getElementById('relay-port').value.trim();
  const relayName = document.getElementById('relay-name').value.trim() || 'RussianRelay';
  const errDiv = document.getElementById('error-msg');

  errDiv.innerHTML = '';

  if (!raw.startsWith('vless://')) {
    errDiv.innerHTML = '<div class="error-box">Ошибка: ссылка должна начинаться с vless://</div>';
    return;
  }

  try {
    // Парсим ссылку: vless://UUID@HOST:PORT?PARAMS#NAME
    const withoutScheme = raw.slice('vless://'.length);
    const atIdx = withoutScheme.indexOf('@');
    if (atIdx === -1) throw new Error('Не найден символ @ в ссылке');

    const uuid = withoutScheme.slice(0, atIdx);
    const rest = withoutScheme.slice(atIdx + 1);

    // HOST:PORT?PARAMS#NAME
    const hashIdx = rest.lastIndexOf('#');
    const paramsStr = hashIdx !== -1 ? rest.slice(0, hashIdx) : rest;

    // Отделяем HOST:PORT от PARAMS
    const qIdx = paramsStr.indexOf('?');
    const hostPort = qIdx !== -1 ? paramsStr.slice(0, qIdx) : paramsStr;
    const params = qIdx !== -1 ? paramsStr.slice(qIdx) : '';

    // Собираем новую ссылку
    const newLink = `vless://${uuid}@${relayIp}:${relayPort}${params}#${encodeURIComponent(relayName)}`;
    convertedLink = newLink;

    // Показываем текст
    document.getElementById('result-link').textContent = newLink;

    // Генерируем QR
    const qrDiv = document.getElementById('qrcode');
    qrDiv.innerHTML = '';
    new QRCode(qrDiv, {
      text: newLink,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });

    document.getElementById('result').style.display = 'block';
    document.getElementById('result').scrollIntoView({ behavior: 'smooth' });
  } catch (e) {
    errDiv.innerHTML = `<div class="error-box">Ошибка парсинга: ${e.message}</div>`;
  }
}

function copyLink() {
  if (!convertedLink) return;
  navigator.clipboard.writeText(convertedLink).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = '✓ Скопировано!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Скопировать ссылку';
      btn.classList.remove('copied');
    }, 2000);
  });
}
</script>
</body>
</html>
'''


@app.route("/vpn")
def vpn():
    if not session.get("auth"):
        return redirect(url_for("index"))
    return render_template_string(VPN_HTML, vps_ip=VPS_IP)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
