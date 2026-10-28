import subprocess
import time
import json
import urllib.request
import urllib.parse
import socket
import sys
import tempfile

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

def get_page_ws_url(port, retries=15):
    for _ in range(retries):
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

def test_carousel_desktop():
    print("\n--- TEST 1: KIỂM TRA BỐ CỤC & TÍNH NĂNG CAROUSEL TRÊN DESKTOP ---")
    user_data = tempfile.mkdtemp()
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--window-size=1280,850",
        "--remote-debugging-port=9245",
        f"--user-data-dir={user_data}",
        "--disable-extensions",
        "http://127.0.0.1:8788/"
    ])
    
    try:
        ws = get_page_ws_url(9245)
        time.sleep(1.5)

        # 1. Inspect initial carousel state
        eval_init = send_cdp(ws, "Runtime.evaluate", {
            "expression": """({
                hasCarousel: Boolean(document.querySelector('[data-carousel]')),
                slidesCount: document.querySelectorAll('.carousel-slide').length,
                dotsCount: document.querySelectorAll('.carousel-dot').length,
                activeSlideIndex: Array.from(document.querySelectorAll('.carousel-slide')).findIndex(s => s.classList.contains('is-active')),
                counterText: document.querySelector('[data-carousel-counter]')?.innerText.trim(),
                firstSlideImgFit: window.getComputedStyle(document.querySelector('.carousel-slide__img')).objectFit
            })""",
            "returnByValue": True
        })
        val = eval_init.get("result", {}).get("result", {}).get("value", {})
        print("Carousel Initial State:", val)
        assert val.get("hasCarousel") is True, "Carousel must exist!"
        assert val.get("slidesCount") >= 3, f"Expected at least 3 slides, got {val.get('slidesCount')}"
        assert val.get("dotsCount") == val.get("slidesCount"), "Dots count must equal slides count"
        assert val.get("activeSlideIndex") == 0, "Initial active slide must be 0"
        assert val.get("firstSlideImgFit") == "contain", "Image must use object-fit: contain to prevent cropping!"
        print("=> Khởi tạo Carousel & Framing ảnh contain thành công!")

        # 2. Next slide button test
        send_cdp(ws, "Runtime.evaluate", {
            "expression": "document.querySelector('[data-carousel-next]').click();"
        })
        time.sleep(0.5)

        eval_next = send_cdp(ws, "Runtime.evaluate", {
            "expression": """({
                activeSlideIndex: Array.from(document.querySelectorAll('.carousel-slide')).findIndex(s => s.classList.contains('is-active')),
                counterCurrent: document.querySelector('[data-counter-current]')?.textContent.trim()
            })""",
            "returnByValue": True
        })
        val_next = eval_next.get("result", {}).get("result", {}).get("value", {})
        print("After Next Click:", val_next)
        assert val_next.get("activeSlideIndex") == 1
        assert val_next.get("counterCurrent") == "2"
        print("=> Chuyển slide tiếp theo (Next) hoạt động chính xác!")

        # 3. Dots navigation test
        send_cdp(ws, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('.carousel-dot')[2].click();"
        })
        time.sleep(0.5)

        eval_dot = send_cdp(ws, "Runtime.evaluate", {
            "expression": "Array.from(document.querySelectorAll('.carousel-slide')).findIndex(s => s.classList.contains('is-active'))",
            "returnByValue": True
        })
        assert eval_dot.get("result", {}).get("result", {}).get("value") == 2
        print("=> Chuyển slide qua dots indicator hoạt động chính xác!")

        # 4. Lightbox opening & controls test
        print("\n--- TEST 2: KIỂM TRA XEM ẢNH CHI TIẾT (LIGHTBOX) ---")
        send_cdp(ws, "Runtime.evaluate", {
            "expression": "document.querySelector('.carousel-slide.is-active .carousel-slide__trigger').click();"
        })
        time.sleep(0.8)

        eval_lightbox = send_cdp(ws, "Runtime.evaluate", {
            "expression": """({
                isLightboxOpen: document.querySelector('[data-lightbox]').open,
                bodyOverflow: document.body.style.overflow,
                lightboxImgFit: window.getComputedStyle(document.querySelector('[data-lightbox-image]')).objectFit,
                lightboxCount: document.querySelector('[data-lightbox-count]').textContent.trim(),
                hasImageSrc: Boolean(document.querySelector('[data-lightbox-image]').src)
            })""",
            "returnByValue": True
        })
        lval = eval_lightbox.get("result", {}).get("result", {}).get("value", {})
        print("Lightbox Open State:", lval)
        assert lval.get("isLightboxOpen") is True, "Lightbox must be open"
        assert lval.get("bodyOverflow") == "hidden", "Background body scroll must be locked when lightbox is open"
        assert lval.get("lightboxImgFit") == "contain", "Lightbox image must use contain"
        assert "3 /" in lval.get("lightboxCount")
        print("=> Mở Lightbox đúng ảnh, khóa cuộn trang nền thành công!")

        # Next photo in lightbox
        send_cdp(ws, "Runtime.evaluate", {
            "expression": "document.querySelector('[data-lightbox-next]').click();"
        })
        time.sleep(0.4)

        # Close lightbox via ESC
        send_cdp(ws, "Runtime.evaluate", {
            "expression": """
                document.querySelector('[data-lightbox]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            """
        })
        time.sleep(0.5)

        eval_close = send_cdp(ws, "Runtime.evaluate", {
            "expression": """({
                isLightboxOpen: document.querySelector('[data-lightbox]').open,
                bodyOverflow: document.body.style.overflow
            })""",
            "returnByValue": True
        })
        cval = eval_close.get("result", {}).get("result", {}).get("value", {})
        print("After Lightbox Close:", cval)
        assert cval.get("isLightboxOpen") is False
        assert cval.get("bodyOverflow") == ""
        print("=> Đóng Lightbox khôi phục cuộn trang và vị trí carousel thành công!")

    finally:
        proc.kill()
        proc.wait()

def test_carousel_mobile():
    print("\n--- TEST 3: KIỂM TRA CAROUSEL TRÊN MOBILE (375x667) & VUỐT CHẠM ---")
    user_data = tempfile.mkdtemp()
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--window-size=375,667",
        "--remote-debugging-port=9246",
        f"--user-data-dir={user_data}",
        "--disable-extensions",
        "http://127.0.0.1:8788/"
    ])
    
    try:
        ws = get_page_ws_url(9246)
        time.sleep(1.5)

        eval_mob = send_cdp(ws, "Runtime.evaluate", {
            "expression": """({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
                hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                stageWidth: document.querySelector('[data-carousel-stage]').offsetWidth,
                slideWidth: document.querySelector('.carousel-slide').offsetWidth
            })""",
            "returnByValue": True
        })
        mval = eval_mob.get("result", {}).get("result", {}).get("value", {})
        print("Mobile Layout Info:", mval)
        assert mval.get("hasOverflow") is False, "Mobile page must NOT have horizontal scrollbar!"
        assert mval.get("slideWidth") < mval.get("stageWidth"), "Slide must fit comfortably in mobile stage"
        print("=> Giao diện Mobile hoàn hảo, không có thanh cuộn ngang tràn màn hình!")

        # Simulate Touch Swipe left
        send_cdp(ws, "Runtime.evaluate", {
            "expression": """(() => {
                const stage = document.querySelector('[data-carousel-stage]');
                const startTouch = new Touch({ identifier: 1, target: stage, clientX: 300, clientY: 200 });
                const endTouch = new Touch({ identifier: 1, target: stage, clientX: 100, clientY: 200 });
                
                stage.dispatchEvent(new TouchEvent('touchstart', { touches: [startTouch], changedTouches: [startTouch] }));
                stage.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [endTouch] }));
            })()"""
        })
        time.sleep(0.6)

        eval_swipe = send_cdp(ws, "Runtime.evaluate", {
            "expression": "document.querySelector('[data-counter-current]').textContent.trim()",
            "returnByValue": True
        })
        curr = eval_swipe.get("result", {}).get("result", {}).get("value")
        print("Counter after Touch Swipe:", curr)
        assert curr == "2"
        print("=> Thao tác vuốt ngang cảm ứng (Touch Swipe) hoạt động mượt mà!")

    finally:
        proc.kill()
        proc.wait()

if __name__ == "__main__":
    test_carousel_desktop()
    test_carousel_mobile()
    print("\n=================================================================")
    print("HOAN THANH TOAN BO KIEM THU WEDDING PHOTO CAROUSEL & LIGHTBOX!")
    print("=================================================================\n")
