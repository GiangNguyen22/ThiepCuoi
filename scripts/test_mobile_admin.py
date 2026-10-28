import subprocess
import time
import json
import urllib.request
import urllib.parse
import socket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA = r"C:\Users\dangm\AppData\Local\Temp\chrome_mobile_test"

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
    assert "101 " in resp
    
    payload = json.dumps({"id": msg_id, "method": method, "params": params or {}}).encode("utf-8")
    length = len(payload)
    if length <= 125:
        header = bytes([0x81, 0x80 | length])
    elif length <= 65535:
        header = bytes([0x81, 0x80 | 126, (length >> 8) & 0xFF, length & 0xFF])
    mask = b"\x12\x34\x56\x78"
    masked = bytearray(length)
    for i in range(length):
        masked[i] = payload[i] ^ mask[i % 4]
    
    s.sendall(header + mask + masked)
    
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
    print("=== TESTING ADMIN RESPONSIVE ON MOBILE (375x667) ===")
    
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--window-size=375,667",
        "--remote-debugging-port=9225",
        f"--user-data-dir={USER_DATA}",
        "--disable-extensions",
        "http://127.0.0.1:8788/admin.html"
    ])
    
    time.sleep(2)
    try:
        targets_resp = urllib.request.urlopen("http://127.0.0.1:9225/json").read()
        targets = json.loads(targets_resp.decode("utf-8"))
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]
        
        # Emulate Mobile Viewport (Android / Galaxy: 360 x 740)
        send_cdp(ws_url, "Emulation.setDeviceMetricsOverride", {
            "width": 360,
            "height": 740,
            "deviceScaleFactor": 2,
            "mobile": True
        })
        time.sleep(1)

        # 1. Check Auth View Mobile layout
        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                docWidth: document.documentElement.scrollWidth,
                winWidth: window.innerWidth,
                hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
                inputFontSize: window.getComputedStyle(document.getElementById('username')).fontSize,
                btnHeight: document.getElementById('login-btn').offsetHeight
            })""",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("Auth View on Mobile:", val)
        assert not val.get("hasHorizontalOverflow"), "Auth view overflows horizontally on mobile!"
        assert val.get("btnHeight") >= 40, f"Button height {val.get('btnHeight')} too small for mobile touch"
        assert val.get("inputFontSize") == "16px", f"Input font size {val.get('inputFontSize')} triggers iOS zoom"

        # 2. Login to test Dashboard Mobile layout
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = 'MatKhauBaoMat123!';
                document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
            """
        })
        time.sleep(2)

        # 3. Check Dashboard View Mobile layout
        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                isDashboardVisible: !document.getElementById('dashboard-view').hidden,
                docWidth: document.documentElement.scrollWidth,
                winWidth: window.innerWidth,
                hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
                statCardCols: window.getComputedStyle(document.querySelector('.stats-grid')).gridTemplateColumns.split(' ').length,
                logoutBtnHeight: document.getElementById('logout-btn').offsetHeight,
                tabBtnHeight: document.getElementById('tab-rsvps').offsetHeight
            })""",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("Dashboard on Mobile:", val)
        assert val.get("isDashboardVisible"), "Dashboard should be visible after login"
        assert not val.get("hasHorizontalOverflow"), "Dashboard page overflows horizontally on mobile!"
        assert val.get("statCardCols") == 2, f"Expected 2 columns for stat cards on mobile, got {val.get('statCardCols')}"
        assert val.get("logoutBtnHeight") >= 38, "Logout button height too small on mobile"

        # 4. Check RSVP Table scrollability
        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                tableWidth: document.querySelector('.data-table').offsetWidth,
                containerWidth: document.querySelector('.table-responsive').offsetWidth,
                isTableScrollable: document.querySelector('.data-table').offsetWidth > document.querySelector('.table-responsive').offsetWidth
            })""",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("RSVP Table responsiveness:", val)
        assert val.get("isTableScrollable"), "Table should be horizontally scrollable within container on mobile"

        # 5. Check Wishes tab on Mobile
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.getElementById('tab-wishes').click();"
        })
        time.sleep(1)

        eval_resp = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
                wishActionsFullWidth: document.querySelector('.wish-actions') ? document.querySelector('.wish-actions').offsetWidth : 0,
                filterGroupPills: document.querySelectorAll('#panel-wishes .filter-pill').length
            })""",
            "returnByValue": True
        })
        val = eval_resp.get("result", {}).get("result", {}).get("value", {})
        print("Wishes on Mobile:", val)
        assert not val.get("hasHorizontalOverflow"), "Wishes panel overflows horizontally on mobile!"

        print("=== ALL MOBILE RESPONSIVE AUDIT & TESTS PASSED! ===")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
