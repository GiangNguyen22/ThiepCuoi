import subprocess
import time
import json
import urllib.request
import urllib.parse
import socket
import sys
import tempfile
import shutil

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

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

def get_page_ws_url(port, retries=10):
    for i in range(retries):
        try:
            targets_resp = urllib.request.urlopen(f"http://127.0.0.1:{port}/json").read()
            targets = json.loads(targets_resp.decode("utf-8"))
            page_target = next((t for t in targets if t.get("type") == "page"), None)
            if page_target and page_target.get("webSocketDebuggerUrl"):
                return page_target["webSocketDebuggerUrl"]
        except Exception:
            pass
        time.sleep(0.5)
    raise RuntimeError(f"Could not connect to Chrome on port {port}")
        
def test_admin_ui():
    print("\n--- TEST 1: KIỂM TRA GIAO DIỆN ADMIN (NỘI DUNG & MỪNG CƯỚI) ---")
    user_data = tempfile.mkdtemp()
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--window-size=1280,850",
        "--remote-debugging-port=9228",
        f"--user-data-dir={user_data}",
        "--disable-extensions",
        "http://127.0.0.1:8788/admin.html"
    ])
    
    try:
        ws_url = get_page_ws_url(9228)
        time.sleep(1)
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = 'MatKhauBaoMat123!';
                document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
            """
        })
        time.sleep(2)

        # 2. Click Tab 4: Content Management
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.getElementById('tab-content').click();"
        })
        time.sleep(1)

        eval_content = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                isContentPanelVisible: !document.getElementById('panel-content').hidden,
                groomName: document.getElementById('content-groom-name').value,
                brideName: document.getElementById('content-bride-name').value,
                venueName: document.getElementById('content-venue-name').value,
                scheduleRowsCount: document.querySelectorAll('#schedule-items-list .schedule-item-row').length
            })""",
            "returnByValue": True
        })
        val = eval_content.get("result", {}).get("result", {}).get("value", {})
        print("Admin Content Panel Status:", val)
        assert val.get("isContentPanelVisible") is True
        assert "Trọng" in val.get("groomName")
        assert "Linh" in val.get("brideName")
        assert val.get("scheduleRowsCount") >= 2
        print("=> Tab Quản lý Nội Dung hiển thị chính xác!")

        # 3. Click Tab 5: Banking Management
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.getElementById('tab-banking').click();"
        })
        time.sleep(1)

        eval_banking = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                isBankingPanelVisible: !document.getElementById('panel-banking').hidden,
                isGroomEnabled: document.getElementById('bank-groom-enabled').checked,
                isBrideEnabled: document.getElementById('bank-bride-enabled').checked,
                groomAccNum: document.getElementById('bank-groom-account-number').value,
                hasGroomQrPreview: Boolean(document.querySelector('#bank-groom-qr-box img')),
                hasBrideQrPreview: Boolean(document.querySelector('#bank-bride-qr-box img'))
            })""",
            "returnByValue": True
        })
        bval = eval_banking.get("result", {}).get("result", {}).get("value", {})
        print("Admin Banking Panel Status:", bval)
        assert bval.get("isBankingPanelVisible") is True
        assert bval.get("isGroomEnabled") is True
        assert bval.get("isBrideEnabled") is True
        assert bval.get("groomAccNum") == "1012345678"
        assert bval.get("hasGroomQrPreview") is True
        assert bval.get("hasBrideQrPreview") is True
        print("=> Tab Quản lý Mừng Cưới & Live VietQR preview hiển thị chính xác!")

    finally:
        proc.kill()
        proc.wait()

def test_public_ui():
    print("\n--- TEST 2: KIỂM TRA THIỆP CÔNG KHAI (MỤC MỪNG CƯỚI & VIETQR) ---")
    user_data = tempfile.mkdtemp()
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--window-size=1280,900",
        "--remote-debugging-port=9228",
        f"--user-data-dir={user_data}",
        "--disable-extensions",
        "http://127.0.0.1:8788/"
    ])
    
    try:
        ws_url = get_page_ws_url(9228)
        time.sleep(1)
        
        time.sleep(1.5)

        eval_pub = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                coupleNames: document.getElementById('couple-names')?.textContent.trim(),
                venueTitle: document.getElementById('venue-title')?.textContent.trim(),
                isGiftVisible: !document.querySelector('[data-gift-section]')?.hidden,
                cardsCount: document.querySelectorAll('[data-gift-grid] .gift__card').length,
                hasVietQrImages: document.querySelectorAll('[data-gift-grid] .gift__qr-img').length,
                hasCopyButtons: document.querySelectorAll('[data-copy-acc]').length,
                hasDisclaimers: Boolean(document.querySelector('.gift__disclaimer'))
            })""",
            "returnByValue": True
        })
        pval = eval_pub.get("result", {}).get("result", {}).get("value", {})
        print("Public Wedding Invitation Status:", pval)
        assert "Trọng" in pval.get("coupleNames")
        assert "Linh" in pval.get("coupleNames")
        assert pval.get("isGiftVisible") is True
        assert pval.get("cardsCount") == 2
        assert pval.get("hasVietQrImages") == 2
        assert pval.get("hasCopyButtons") == 2
        assert pval.get("hasDisclaimers") is True
        print("=> Thiệp công khai hiển thị đầy đủ mục Mừng cưới, VietQR, Sao chép & Cảnh báo an toàn!")

    finally:
        proc.kill()
        proc.wait()

def test_mobile_ui():
    print("\n--- TEST 3: KIỂM TRA MOBILE RESPONSIVE (375x667) ---")
    user_data = tempfile.mkdtemp()
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--window-size=375,667",
        "--remote-debugging-port=9228",
        f"--user-data-dir={user_data}",
        "--disable-extensions",
        "http://127.0.0.1:8788/"
    ])
    
    try:
        ws_url = get_page_ws_url(9228)
        time.sleep(1)
        
        time.sleep(1.5)

        eval_mob = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                isGiftVisible: !document.querySelector('[data-gift-section]')?.hidden,
                cardCount: document.querySelectorAll('.gift__card').length
            })""",
            "returnByValue": True
        })
        mval = eval_mob.get("result", {}).get("result", {}).get("value", {})
        print("Mobile Public Page Status:", mval)
        assert mval.get("isGiftVisible") is True
        assert mval.get("cardCount") == 2
        assert mval.get("hasHorizontalOverflow") is False, "Mobile page must not have horizontal overflow!"
        print("=> Giao diện Mobile 375px hoàn toàn mượt mà, không bị tràn màn hình ngang!")

    finally:
        proc.kill()
        proc.wait()

if __name__ == "__main__":
    test_admin_ui()
    test_public_ui()
    test_mobile_ui()
    print("\n=================================================================")
    print("HOAN THANH TOAN BO KIEM THU BROWSER TASK 7 (DESKTOP & MOBILE)!")
    print("=================================================================\n")
