import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys
import io

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8788"

# 1x1 transparent PNG binary bytes
VALID_PNG_BYTES = bytes([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
])

# Fake image (text content with .png extension)
FAKE_PNG_BYTES = b"This is a fake script file not a real image"

def request_json(url, method="GET", data=None, headers=None, opener=None):
    if headers is None:
        headers = {}
    
    body = None
    if data is not None and not isinstance(data, (bytes, bytearray)):
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
        headers["X-Requested-With"] = "XMLHttpRequest"
    elif isinstance(data, (bytes, bytearray)):
        body = data

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        if opener:
            resp = opener.open(req)
        else:
            resp = urllib.request.urlopen(req)
        status = resp.status
        resp_body = resp.read().decode("utf-8")
        try:
            parsed = json.loads(resp_body)
        except:
            parsed = resp_body
        return status, parsed, resp.headers
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(resp_body)
        except:
            parsed = resp_body
        return e.code, parsed, e.headers
    except Exception as e:
        return 0, str(e), {}

def upload_multipart(url, files, opener=None):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body = bytearray()
    
    for filename, filebytes, content_type in files:
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="files"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(filebytes)
        body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode("utf-8"))
    
    headers = {
        "Content-Type": f"multipart/form-data; boundary={boundary}",
        "X-Requested-With": "XMLHttpRequest"
    }
    return request_json(url, method="POST", data=bytes(body), headers=headers, opener=opener)

def clear_rate_limits():
    try:
        import sqlite3, glob
        d1_dbs = glob.glob('.wrangler/state/v3/d1/**/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite', recursive=True)
        if d1_dbs:
            conn = sqlite3.connect(d1_dbs[0])
            cur = conn.cursor()
            cur.execute("DELETE FROM rate_limits WHERE action = 'admin_login_fail'")
            cur.execute("DELETE FROM album_items")
            cur.execute("DELETE FROM site_media")
            cur.execute("DELETE FROM images")
            conn.commit()
            conn.close()
    except:
        pass

def run_tests():
    clear_rate_limits()
    print("=== BAT DAU KIEM THU TASK 7: QUAN LY HINH ANH, STORAGE & ALBUM ===")
    
    # 1. Test unauthenticated access
    print("\n--- Test 1: Chặn truy cập không xác thực đến các API Media Admin ---")
    for endpoint in ["/api/admin/images", "/api/admin/album"]:
        status, body, _ = request_json(f"{BASE_URL}{endpoint}")
        print(f"GET {endpoint} -> Status: {status}")
        assert status == 401

    status, _, _ = request_json(f"{BASE_URL}/api/admin/images/upload", method="POST", data={})
    print(f"POST /api/admin/images/upload -> Status: {status}")
    assert status == 401

    status, _, _ = request_json(f"{BASE_URL}/api/admin/media/assign", method="POST", data={})
    print(f"POST /api/admin/media/assign -> Status: {status}")
    assert status == 401
    print("=> Test 1 PASSED: Toàn bộ API media admin được bảo vệ backend 100%!")

    # 2. Login admin
    print("\n--- Test 2: Đăng nhập quản trị viên ---")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/session",
        method="POST",
        data={"username": "admin", "password": "MatKhauBaoMat123!"},
        opener=opener
    )
    assert status == 200, f"Login failed: {body}"
    print(f"Admin logged in successfully: token {body.get('token')[:8]}...")

    # 3. Security Upload Tests (Fake image & file size)
    print("\n--- Test 3: Kiểm duyệt bảo mật khi Upload (Magic bytes & Giới hạn) ---")
    # A. Fake image
    status, body, _ = upload_multipart(
        f"{BASE_URL}/api/admin/images/upload",
        [("malicious.png", FAKE_PNG_BYTES, "image/png")],
        opener=opener
    )
    print(f"Upload fake PNG -> Status: {status}, Error: {body.get('error')}")
    assert status == 400
    assert "không phải định dạng ảnh hợp lệ" in body.get("error", "")

    # B. Oversized image (> 5MB)
    huge_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * (5 * 1024 * 1024 + 100)
    status, body, _ = upload_multipart(
        f"{BASE_URL}/api/admin/images/upload",
        [("huge.png", huge_bytes, "image/png")],
        opener=opener
    )
    print(f"Upload > 5MB -> Status: {status}, Error: {body.get('error')}")
    assert status == 413
    print("=> Test 3 PASSED: Chặn thành công file giả mạo và file quá dung lượng!")

    # 4. Valid Upload (Single & Multiple)
    print("\n--- Test 4: Upload ảnh raster hợp lệ (PNG) lên R2 & D1 ---")
    status, body, _ = upload_multipart(
        f"{BASE_URL}/api/admin/images/upload",
        [
            ("wedding_cover.png", VALID_PNG_BYTES, "image/png"),
            ("gallery_photo_1.png", VALID_PNG_BYTES, "image/png"),
            ("gallery_photo_2.png", VALID_PNG_BYTES, "image/png")
        ],
        opener=opener
    )
    print(f"Upload 3 valid images -> Status: {status}, Count: {body.get('count')}")
    assert status == 201
    uploaded_images = body.get("data", [])
    assert len(uploaded_images) == 3
    img1, img2, img3 = uploaded_images[0], uploaded_images[1], uploaded_images[2]
    print(f"Uploaded: img1={img1['id']} ({img1['storage_key']}), img2={img2['id']}, img3={img3['id']}")
    print("=> Test 4 PASSED: Upload lưu trữ vào R2 và D1 hoàn tất!")

    # 5. Image Streaming API (GET /api/images/:key)
    print("\n--- Test 5: Truy xuất file ảnh công khai (/api/images/:key) ---")
    img_req = urllib.request.Request(f"{BASE_URL}{img1['url']}")
    with urllib.request.urlopen(img_req) as resp:
        assert resp.status == 200
        assert resp.headers.get("Content-Type") == "image/png"
        content = resp.read()
        assert content == VALID_PNG_BYTES
        print(f"Streamed image {img1['storage_key']}: Size {len(content)} bytes, Content-Type: {resp.headers.get('Content-Type')}")

    # Test Path Traversal & Invalid Key Protection
    status, body, _ = request_json(f"{BASE_URL}/api/images/malicious_script.exe")
    print(f"Invalid key format test (/api/images/malicious_script.exe) -> Status: {status}, Error: {body.get('error')}")
    assert status == 400
    assert body.get("error") == "Khóa hình ảnh không hợp lệ."

    # Raw socket traversal check
    import socket
    s = socket.socket()
    s.connect(('127.0.0.1', 8788))
    s.sendall(b'GET /api/images/..%2fsecret.png HTTP/1.1\r\nHost: 127.0.0.1:8788\r\nConnection: close\r\n\r\n')
    raw_resp = s.recv(4096).decode('utf-8', errors='ignore')
    s.close()
    assert "400" in raw_resp.split("\r\n")[0]
    print("Raw socket traversal check (/api/images/..%2fsecret.png) -> Returned 400 Bad Request")
    print("=> Test 5 PASSED: Stream ảnh chuẩn xác và chống path traversal an toàn!")

    # 6. Assign Cover Photo (POST /api/admin/media/assign)
    print("\n--- Test 6: Đặt ảnh bìa thiệp cưới & kiểm tra API công khai ---")
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/media/assign",
        method="POST",
        data={"slot_name": "cover_photo", "image_id": img1["id"]},
        opener=opener
    )
    print(f"Assign cover photo -> Status: {status}, Msg: {body.get('message')}")
    assert status == 200

    # Public API GET /api/media
    status, body, _ = request_json(f"{BASE_URL}/api/media")
    assert status == 200
    media_data = body.get("data", {})
    assert media_data.get("cover_photo", {}).get("url") == img1["url"]
    print(f"Public GET /api/media verified cover_photo: {media_data.get('cover_photo')}")
    print("=> Test 6 PASSED: Đặt ảnh bìa và đồng bộ API công khai thành công!")

    # 7. Safe Deletion Guard (Cannot delete referenced image)
    print("\n--- Test 7: Khóa bảo vệ không cho xóa ảnh đang được sử dụng ---")
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/images/{img1['id']}",
        method="DELETE",
        opener=opener
    )
    print(f"Attempt delete cover image #{img1['id']} -> Status: {status}, Error: {body.get('error')}")
    assert status == 409, f"Expected 409 Conflict, got {status}"
    assert "đang được sử dụng làm ảnh bìa" in body.get("error", "")
    print("=> Test 7 PASSED: Hệ thống từ chối xóa ảnh đang làm ảnh bìa đúng yêu cầu!")

    # 8. Album Management (Add, Reorder, Toggle Visibility, Remove)
    print("\n--- Test 8: Quản lý Album cưới (Thêm, Sắp xếp thứ tự, Ẩn/Hiện, Gỡ) ---")
    # Add img2 and img3 to album
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/album",
        method="POST",
        data={"image_id": img2["id"], "caption": "Khoảnh khắc ngọt ngào"},
        opener=opener
    )
    assert status == 201
    alb_item2 = body.get("data", {})

    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/album",
        method="POST",
        data={"image_id": img3["id"], "caption": "Nụ cười rạng rỡ"},
        opener=opener
    )
    assert status == 201
    alb_item3 = body.get("data", {})
    print(f"Added to album: item {alb_item2['id']} (img {img2['id']}), item {alb_item3['id']} (img {img3['id']})")

    # Verify public album
    status, body, _ = request_json(f"{BASE_URL}/api/media")
    public_album = body.get("data", {}).get("album", [])
    assert len(public_album) == 2
    assert public_album[0]["caption"] == "Khoảnh khắc ngọt ngào"
    assert public_album[1]["caption"] == "Nụ cười rạng rỡ"
    print(f"Public album has 2 items in order: {[x['caption'] for x in public_album]}")

    # Reorder album: swap order
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/album/reorder",
        method="PUT",
        data={"item_ids": [alb_item3["id"], alb_item2["id"]]},
        opener=opener
    )
    assert status == 200

    status, body, _ = request_json(f"{BASE_URL}/api/media")
    reordered_album = body.get("data", {}).get("album", [])
    assert reordered_album[0]["caption"] == "Nụ cười rạng rỡ"
    assert reordered_album[1]["caption"] == "Khoảnh khắc ngọt ngào"
    print(f"Reordered public album: {[x['caption'] for x in reordered_album]}")

    # Hide one item
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/album/{alb_item2['id']}",
        method="PATCH",
        data={"is_visible": False},
        opener=opener
    )
    assert status == 200

    # Public album should now only show 1 item
    status, body, _ = request_json(f"{BASE_URL}/api/media")
    public_after_hide = body.get("data", {}).get("album", [])
    assert len(public_after_hide) == 1
    assert public_after_hide[0]["caption"] == "Nụ cười rạng rỡ"
    print(f"After hiding item 2, public album has {len(public_after_hide)} item(s): {[x['caption'] for x in public_after_hide]}")

    # Remove item 2 from album
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/album/{alb_item2['id']}",
        method="DELETE",
        opener=opener
    )
    assert status == 200
    print("=> Test 8 PASSED: Thêm, đổi thứ tự, ẩn và gỡ album hoạt động xuất sắc!")

    # 9. Unassign Cover Photo and Delete Image
    print("\n--- Test 9: Gỡ tham chiếu và Xóa ảnh an toàn ---")
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/media/assign",
        method="POST",
        data={"slot_name": "cover_photo", "image_id": None},
        opener=opener
    )
    assert status == 200
    print("Cover photo unassigned.")

    # Now img1 is unused -> Delete img1
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/images/{img1['id']}",
        method="DELETE",
        opener=opener
    )
    print(f"Delete unused img1 -> Status: {status}, Msg: {body.get('message')}")
    assert status == 200

    # Verify img1 is gone from storage
    status, _, _ = request_json(f"{BASE_URL}{img1['url']}")
    assert status == 404, f"Deleted image should return 404, got {status}"
    print(f"Stream deleted image {img1['storage_key']} -> Status: {status} (Not Found)")
    print("=> Test 9 PASSED: Gỡ và xóa ảnh sạch sẽ khỏi cả D1 và R2 Storage!")

    print("\n========================================================")
    print(">>> TẤT CẢ 9 BỘ KIỂM THỬ TASK 7 ĐÃ ĐẠT 100% HOÀN HẢO! <<<")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
