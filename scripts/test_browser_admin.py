import subprocess
import time
import json
import urllib.request
import urllib.parse
import socket
import os

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA = r"C:\Users\dangm\AppData\Local\Temp\chrome_admin_test"

def send_cdp(ws_url, method, params=None, msg_id=1):
    parsed = urllib.parse.urlparse(ws_url)
    host, port = parsed.hostname, parsed.port
    path = parsed.path
    
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((host, port))
    
    key = "dGhlIHNhbXBsZSBub25jZQ=="
    handshake = (
        f"GET {path} HTTP/1.1\r\n"
        f"Host: {host}:{port}\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        f"Sec-WebSocket-Key: {key}\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n"
    )
    s.sendall(handshake.encode("utf-8"))
    resp = s.recv(4096).decode("utf-8", errors="ignore")
    assert "101 " in resp, f"Handshake failed: {resp}"
    
    payload = json.dumps({"id": msg_id, "method": method, "params": params or {}}).encode("utf-8")
    length = len(payload)
    if length <= 125:
        header = bytes([0x81, 0x80 | length])
    elif length <= 65535:
        header = bytes([0x81, 0x80 | 126, (length >> 8) & 0xFF, length & 0xFF])
    mask = b"\x12\x34\x56\x78"
    masked_payload = bytearray(length)
    for i in range(length):
        masked_payload[i] = payload[i] ^ mask[i % 4]
    
    s.sendall(header + mask + masked_payload)
    
    data = bytearray()
    while True:
        chunk = s.recv(65536)
        if not chunk:
            break
        data.extend(chunk)
        if len(chunk) < 65536:
            break
            
    s.close()
    
    if len(data) >= 2:
        payload_len = data[1] & 0x7F
        offset = 2
        if payload_len == 126:
            offset = 4
        elif payload_len == 127:
            offset = 10
        raw_msg = data[offset:].decode("utf-8", errors="ignore")
        try:
            return json.loads(raw_msg)
        except:
            return {"raw": raw_msg}
    return {}

def main():
    print("=== TESTING ADMIN UI IN HEADLESS CHROME ===")
    
    # Clear test failed login rate limits if any
    try:
        import sqlite3, glob
        d1_dbs = glob.glob('.wrangler/state/v3/d1/**/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite', recursive=True)
        if d1_dbs:
            conn = sqlite3.connect(d1_dbs[0])
            cur = conn.cursor()
            cur.execute("DELETE FROM rate_limits WHERE action = 'admin_login_fail'")
            conn.commit()
            conn.close()
    except Exception as e:
        pass

    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9223",
        f"--user-data-dir={USER_DATA}",
        "--disable-extensions",
        "http://127.0.0.1:8788/admin.html"
    ])
    
    time.sleep(2)
    try:
        targets_resp = urllib.request.urlopen("http://127.0.0.1:9223/json").read()
        targets = json.loads(targets_resp.decode("utf-8"))
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]
        
        # 1. Check title and login view visibility
        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "({ title: document.title, isAuthVisible: !document.getElementById('auth-view').hidden, isDashboardHidden: document.getElementById('dashboard-view').hidden })",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("Page loaded:", val)
        assert "Quản Trị Thiệp Cưới" in val.get("title", "")
        assert val.get("isAuthVisible") is True
        assert val.get("isDashboardHidden") is True

        # 2. Fill login form with valid credentials
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = 'MatKhauBaoMat123!';
                document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
            """
        })
        time.sleep(2)

        # 3. Check if dashboard view is now active
        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "({ isAuthHidden: document.getElementById('auth-view').hidden, isDashboardVisible: !document.getElementById('dashboard-view').hidden, username: document.getElementById('admin-username-display').textContent, rsvpCount: document.getElementById('stat-rsvp-total').textContent })",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("Dashboard after login:", val)
        assert val.get("isAuthHidden") is True
        assert val.get("isDashboardVisible") is True
        assert val.get("username") == "admin"

        # 4. Check RSVP Table rows
        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('#rsvp-table-body tr').length",
            "returnByValue": True
        })
        rows_count = eval_resp.get("result", {}).get("result", {}).get("value", 0)
        print(f"RSVP table rows rendered: {rows_count}")
        assert rows_count > 0

        # 5. Switch to Wishes tab
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.getElementById('tab-wishes').click();"
        })
        time.sleep(1)

        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "({ isWishesPanelVisible: !document.getElementById('panel-wishes').hidden, wishesCount: document.querySelectorAll('#wishes-list .wish-item').length })",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("Wishes panel status:", val)
        assert val.get("isWishesPanelVisible") is True

        # 6. Click Logout button
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.getElementById('logout-btn').click();"
        })
        time.sleep(1.5)

        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "({ isAuthVisible: !document.getElementById('auth-view').hidden, isDashboardHidden: document.getElementById('dashboard-view').hidden })",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("After logout:", val)
        assert val.get("isAuthVisible") is True
        assert val.get("isDashboardHidden") is True

        print("=== BROWSER UI VERIFICATION PASSED COMPLETELY! ===")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
