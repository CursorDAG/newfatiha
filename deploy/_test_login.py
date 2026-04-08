"""Test login and main page of domain manager."""
import http.client
import urllib.parse
import re
import time

TIMEOUT = 35  # certbot может занять до 30 секунд

conn = http.client.HTTPConnection('194.58.114.184', 8080, timeout=TIMEOUT)
body = urllib.parse.urlencode({'password': 'admin123456'})
conn.request('POST', '/login', body, {'Content-Type': 'application/x-www-form-urlencoded'})
resp = conn.getresponse()
cookie = resp.getheader('Set-Cookie').split(';')[0]
resp.read()
conn.close()
print('Cookie получена OK')

print('Загружаю главную страницу (может занять до 30 сек — ждём certbot)...')
t0 = time.time()
conn2 = http.client.HTTPConnection('194.58.114.184', 8080, timeout=TIMEOUT)
conn2.request('GET', '/', '', {'Cookie': cookie})
resp2 = conn2.getresponse()
content = resp2.read().decode('utf-8', errors='replace')
conn2.close()
elapsed = time.time() - t0

print(f'HTTP Status: {resp2.status} (за {elapsed:.1f} сек)')

if 'nginx' in content.lower() and 'domain' in content.lower():
    print('SUCCESS: главная страница загружена!')
    domains = re.findall(r'https://([\\w.-]+)', content)
    ssl_ok = content.count('badge-ok')
    ssl_fail = content.count('badge-fail')
    print(f'SSL OK: {ssl_ok}, SSL без сертификата: {ssl_fail}')
else:
    print('Ответ (первые 1000 символов):')
    print(content[:1000])
