#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Inventory Local Web Server with Auto-Reload, Port Protection & UTF-8 Safety
"""
import sys
import os
import http.server
import socketserver
import webbrowser
import threading
import time
import socket
import mimetypes
import json

# Set UTF-8 encoding environment variable
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'

# Safe stdout/stderr initialization for pythonw and non-UTF8 consoles
if sys.stdout is None:
    try:
        sys.stdout = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server.log'), 'a', encoding='utf-8', errors='replace')
    except Exception:
        sys.stdout = open(os.devnull, 'w')
elif hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

if sys.stderr is None:
    try:
        sys.stderr = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server_err.log'), 'a', encoding='utf-8', errors='replace')
    except Exception:
        sys.stderr = open(os.devnull, 'w')
elif hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

def safe_print(*args, **kwargs):
    """Safely print even on Windows GBK consoles without crashing."""
    try:
        if sys.stdout is not None:
            print(*args, **kwargs)
            sys.stdout.flush()
    except Exception:
        try:
            clean_args = [str(a).encode('ascii', errors='backslashreplace').decode('ascii') for a in args]
            print(*clean_args, **kwargs)
        except Exception:
            pass

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
WATCHED_EXTENSIONS = ('.html', '.js', '.css', '.json')

# Ensure common web MIME types are recognized
mimetypes.init()
mimetypes.add_type('text/html; charset=utf-8', '.html')
mimetypes.add_type('text/javascript; charset=utf-8', '.js')
mimetypes.add_type('text/javascript; charset=utf-8', '.mjs')
mimetypes.add_type('text/css; charset=utf-8', '.css')
mimetypes.add_type('application/json; charset=utf-8', '.json')
mimetypes.add_type('image/png', '.png')
mimetypes.add_type('image/webp', '.webp')
mimetypes.add_type('image/svg+xml', '.svg')
mimetypes.add_type('image/x-icon', '.ico')

# Simple inline favicon in case favicon.ico does not exist on disk
FAVICON_SVG = b'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="#2563eb"/><text x="50%" y="55%" font-size="50" text-anchor="middle" dominant-baseline="middle">\xf0\x9f\x93\xa6</text></svg>'''

def get_latest_project_mtime():
    """Get latest modification timestamp of project source files."""
    latest = 0
    try:
        for root, dirs, files in os.walk(DIRECTORY):
            # Skip VCS and hidden folders
            rel = root[len(DIRECTORY):].lstrip('\\/')
            if any(part.startswith('.') for part in rel.split(os.sep)):
                continue
            for f in files:
                if f.endswith(WATCHED_EXTENSIONS):
                    p = os.path.join(root, f)
                    try:
                        t = os.path.getmtime(p)
                        if t > latest:
                            latest = t
                    except OSError:
                        pass
    except Exception:
        pass
    return latest

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Redirect root '/' or '/Index.html' to '/index.html'
        if self.path in ('/', '', '/Index.html'):
            self.send_response(302)
            self.send_header('Location', '/index.html')
            self.end_headers()
            return

        # Dynamic version endpoint reflecting real-time project file modification
        if self.path.startswith('/version.json') or self.path.startswith('/api/version'):
            latest_mtime = get_latest_project_mtime()
            ver_obj = {
                "version": f"v_{int(latest_mtime)}",
                "buildTime": int(latest_mtime * 1000),
                "timestamp": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(latest_mtime))
            }
            body = json.dumps(ver_obj).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(body)
            return

        # Live-Reload SSE Endpoint
        if self.path in ('/live-reload', '/api/live-reload'):
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
            self.send_header('Connection', 'keep-alive')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            last_mtime = get_latest_project_mtime()
            try:
                self.wfile.write(b": connected\n\n")
                self.wfile.flush()

                while True:
                    time.sleep(0.8)
                    current_mtime = get_latest_project_mtime()
                    if current_mtime > last_mtime:
                        last_mtime = current_mtime
                        self.wfile.write(b"data: reload\n\n")
                        self.wfile.flush()
                    else:
                        self.wfile.write(b": heartbeat\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, socket.error):
                return
            except Exception:
                return

        # Serve inline favicon if favicon.ico is requested and not found
        if self.path == '/favicon.ico':
            favicon_path = os.path.join(DIRECTORY, 'favicon.ico')
            if not os.path.exists(favicon_path):
                self.send_response(200)
                self.send_header('Content-Type', 'image/svg+xml')
                self.send_header('Content-Length', str(len(FAVICON_SVG)))
                self.send_header('Cache-Control', 'public, max-age=86400')
                self.end_headers()
                self.wfile.write(FAVICON_SVG)
                return

        try:
            super().do_GET()
        except (ConnectionResetError, BrokenPipeError, socket.error):
            pass

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        if not self.path.startswith('/live-reload'):
            if any(self.path.lower().endswith(ext) for ext in ('.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf')):
                self.send_header('Cache-Control', 'public, max-age=86400')
            else:
                self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, format, *args):
        if len(args) > 0 and 'live-reload' in str(args[0]):
            return
        try:
            if sys.stderr is not None:
                sys.stderr.write(f"[{time.strftime('%H:%M:%S')}] {args[0]} {args[1]} -> {args[2]}\n")
                sys.stderr.flush()
        except Exception:
            pass

def kill_process_on_port(port):
    """Ensure port is free on Windows before binding."""
    if sys.platform == 'win32':
        try:
            cmd = f'netstat -ano | findstr :{port}'
            output = os.popen(cmd).read()
            my_pid = str(os.getpid())
            for line in output.strip().splitlines():
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.strip().split()
                    pid = parts[-1]
                    if pid and pid != '0' and pid != my_pid:
                        os.system(f'taskkill /F /PID {pid} >nul 2>&1')
                        time.sleep(0.3)
        except Exception:
            pass

def wait_and_open_browser(port):
    for _ in range(25):
        time.sleep(0.2)
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.5):
                break
        except Exception:
            pass

    url = f'http://localhost:{port}/index.html'
    safe_print(f'\n[+] Opening Web App in Browser: {url}')
    try:
        webbrowser.open(url)
    except Exception as e:
        safe_print(f'[!] Browser launch notice: {e}')

def get_lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1.0)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def is_port_in_use(port):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.3)
            return s.connect_ex(('127.0.0.1', port)) == 0
    except Exception:
        return False

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = (sys.platform != 'win32')
    daemon_threads = True

def main():
    global PORT
    selected_port = PORT
    httpd = None

    for p in range(PORT, PORT + 20):
        if is_port_in_use(p):
            kill_process_on_port(p)
            time.sleep(0.3)
            if is_port_in_use(p):
                continue
        try:
            httpd = ThreadedHTTPServer(('0.0.0.0', p), CustomHandler)
            selected_port = p
            break
        except OSError:
            continue

    if not httpd:
        safe_print('[-] Error: Port 3000-3019 are all occupied.')
        sys.exit(1)

    lan_ip = get_lan_ip()

    safe_print('=' * 64)
    safe_print('   Smart Inventory System - Local Web Server')
    safe_print('=' * 64)
    safe_print(f' [v] Local URL:   http://localhost:{selected_port}/index.html')
    safe_print(f' [v] Loopback:    http://127.0.0.1:{selected_port}/index.html')
    safe_print(f' [v] LAN URL:     http://{lan_ip}:{selected_port}/index.html')
    safe_print(' [v] Auto-Reload & Auto-Reconnect: Active')
    safe_print(' ----------------------------------------------------------------')
    safe_print(' Demo Accounts:')
    safe_print('    • SuperAdmin:    superadmin / 841453Bsm (Full System & Switch User)')
    safe_print('    • Admin:         admin      / admin123')
    safe_print('    • Stock Keeper:  wh01       / wh01pass')
    safe_print(' ----------------------------------------------------------------')
    safe_print(' Press Ctrl + C in this window to stop the server.\n')

    threading.Thread(target=wait_and_open_browser, args=(selected_port,), daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        safe_print('\n[!] Stopping server...')
    except Exception as e:
        safe_print(f'[!] Server error: {e}')
    finally:
        try:
            httpd.server_close()
        except Exception:
            pass
        safe_print('[v] Server stopped successfully.')

if __name__ == '__main__':
    main()
