import subprocess
import time
import json
import urllib.request
import urllib.parse
import socket

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
USER_DATA = r"C:\Users\dangm\AppData\Local\Temp\chrome_task7_browser"

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
    print("=== TESTING TASK 7 MEDIA MANAGEMENT UI IN CHROME ===")
    
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--window-size=1200,800",
        "--remote-debugging-port=9228",
        f"--user-data-dir={USER_DATA}",
        "--disable-extensions",
        "http://127.0.0.1:8788/admin.html"
    ])
    
    time.sleep(2)
    try:
        targets_resp = urllib.request.urlopen("http://127.0.0.1:9228/json").read()
        targets = json.loads(targets_resp.decode("utf-8"))
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]
        
        # 1. Login
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """
                document.getElementById('username').value = 'admin';
                document.getElementById('password').value = 'MatKhauBaoMat123!';
                document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
            """
        })
        time.sleep(2)

        # 2. Click Tab 3: Media Management
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.getElementById('tab-media').click();"
        })
        time.sleep(1)

        eval_res = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                isMediaPanelVisible: !document.getElementById('panel-media').hidden,
                isDropzoneVisible: !document.getElementById('upload-dropzone').hidden,
                mediaCardsCount: document.querySelectorAll('#media-library-grid .media-card').length,
                tabMediaTitle: document.getElementById('tab-media').textContent.trim()
            })""",
            "returnByValue": True
        })
        val = eval_res.get("result", {}).get("result", {}).get("value", {})
        print("Media Panel Status:", val)
        assert val.get("isMediaPanelVisible") is True
        assert val.get("isDropzoneVisible") is True
        assert val.get("mediaCardsCount") > 0
        print(f"Rendered {val.get('mediaCardsCount')} media cards in Library grid!")

        # 3. Switch to Album Subtab
        send_cdp(ws_url, "Runtime.evaluate", {
            "expression": "document.getElementById('subtab-album-btn').click();"
        })
        time.sleep(1)

        eval_res = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                isAlbumViewVisible: !document.getElementById('subtab-album-view').hidden,
                albumCardsCount: document.querySelectorAll('#media-album-grid .album-card').length
            })""",
            "returnByValue": True
        })
        val = eval_res.get("result", {}).get("result", {}).get("value", {})
        print("Album View Status:", val)
        assert val.get("isAlbumViewVisible") is True

        # 4. Check Public site index.html
        send_cdp(ws_url, "Page.navigate", {"url": "http://127.0.0.1:8788/"})
        time.sleep(2)

        eval_res = send_cdp(ws_url, "Runtime.evaluate", {
            "expression": """({
                title: document.title,
                coverPhotoSrc: document.querySelector('.cover__photo')?.getAttribute('src'),
                galleryCount: document.querySelectorAll('[data-gallery-trigger]').length
            })""",
            "returnByValue": True
        })
        val = eval_res.get("result", {}).get("result", {}).get("value", {})
        print("Public invitation status:", val)
        assert "Văn Hiền & Thu Hà" in val.get("title", "")
        assert val.get("galleryCount") > 0

        print("=== BROWSER TASK 7 TESTS PASSED 100%! ===")
    finally:
        proc.terminate()

if __name__ == "__main__":
    main()
