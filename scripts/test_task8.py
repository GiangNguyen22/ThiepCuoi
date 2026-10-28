import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys
import io

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8788"

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

def clear_rate_limits():
    try:
        import sqlite3, glob
        d1_dbs = glob.glob('.wrangler/state/v3/d1/**/9ba2b04bf514d9facfd57ed57d849e77241a7adc99d1c1545d06688b43d84248.sqlite', recursive=True)
        if d1_dbs:
            conn = sqlite3.connect(d1_dbs[0])
            cur = conn.cursor()
            cur.execute("DELETE FROM rate_limits WHERE action = 'admin_login_fail'")
            conn.commit()
            conn.close()
    except:
        pass

def run_tests():
    clear_rate_limits()
    print("=== BAT DAU KIEM THU TASK 7: QUAN LY NOI DUNG THIEP & QR CHUYEN KHOAN MUNG CUOI ===")

    # 1. Test unauthenticated access to admin APIs
    print("\n--- Test 1: Chặn truy cập không xác thực đến các API Admin Content & Banking ---")
    for endpoint in ["/api/admin/content", "/api/admin/banking"]:
        status, body, _ = request_json(f"{BASE_URL}{endpoint}")
        print(f"GET {endpoint} -> Status: {status}")
        assert status == 401, f"Expected 401 on GET {endpoint}, got {status}"

    for endpoint in ["/api/admin/content", "/api/admin/banking"]:
        status, body, _ = request_json(f"{BASE_URL}{endpoint}", method="PUT", data={})
        print(f"PUT {endpoint} -> Status: {status}")
        assert status == 401, f"Expected 401 on PUT {endpoint}, got {status}"
    print("=> Test 1 PASSED: Mọi API quản trị Nội Dung & Mừng Cưới đều được bảo vệ nghiêm ngặt!")

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
    token = body.get("token")
    print(f"Admin logged in successfully! Session token: {token[:8]}...")

    # 3. Content Management Tests
    print("\n--- Test 3: Quản lý Nội Dung Thiệp Cưới (Phần A) ---")
    # A. Fetch initial content
    status, body, _ = request_json(f"{BASE_URL}/api/admin/content", opener=opener)
    assert status == 200 and body.get("success"), f"Failed to get admin content: {body}"
    print(f"GET /api/admin/content -> OK (groom: {body['data']['groom_name']}, bride: {body['data']['bride_name']})")

    # B. Test invalid inputs (missing names, invalid map url protocol)
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/content",
        method="PUT",
        data={"groom_name": "", "bride_name": ""},
        opener=opener
    )
    assert status == 400, f"Expected 400 on empty names, got {status}"
    print("Empty couple names rejected with 400 Bad Request.")

    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/content",
        method="PUT",
        data={"groom_name": "Trong", "bride_name": "Linh", "map_url": "javascript:alert(1)"},
        opener=opener
    )
    assert status == 400, f"Expected 400 on malicious map_url, got {status}"
    print("Malicious javascript: map URL rejected with 400 Bad Request.")

    # C. Update valid content with XSS tags to verify sanitization
    new_content = {
        "groom_name": "Văn Trọng<script>",
        "bride_name": "Thùy Linh",
        "event_date_text": "Chủ nhật, ngày 15 tháng 11 năm 2026",
        "lunar_date_text": "Tức ngày 07 tháng 10 năm Bính Ngọ",
        "event_date_iso": "2026-11-15T10:30:00+07:00",
        "invitation_title": "Cùng chúng mình viết nên ngày vui",
        "invitation_copy": "Sự hiện diện của bạn là niềm vinh hạnh to lớn cho chúng mình.",
        "venue_name": "The Reverie Saigon",
        "venue_address": "22-36 Nguyễn Huệ & 57-69F Đồng Khởi, Bến Nghé, Quận 1, TP. Hồ Chí Minh",
        "venue_note": "Sảnh Grand Ballroom - Tầng 5",
        "map_url": "https://maps.app.goo.gl/TheReverieSaigon",
        "schedule": [
            {"time": "11:00", "title": "Đón tiếp khách quý", "description": "Chụp ảnh kỷ niệm tại photobooth sảnh tiệc"},
            {"time": "11:30", "title": "Lễ Thành Hôn", "description": "Nghi thức thành hôn thiêng liêng"},
            {"time": "12:00", "title": "Khai tiệc mừng", "description": "Chung vui và nâng ly chúc phúc"}
        ],
        "closing_heading": "Rất hân hạnh được đón tiếp bạn!",
        "closing_names": "Văn Trọng & Thùy Linh",
        "closing_date": "15.11.2026 — TP. Hồ Chí Minh"
    }
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/content",
        method="PUT",
        data=new_content,
        opener=opener
    )
    assert status == 200 and body.get("success"), f"Failed to save content: {body}"
    print("PUT /api/admin/content -> Saved successfully!")

    # D. Verify public /api/content reflects updated sanitized content
    status, pub_content, _ = request_json(f"{BASE_URL}/api/content")
    assert status == 200 and pub_content.get("success")
    data = pub_content["data"]
    assert data["groom_name"] == "Văn Trọngscript", f"Sanitization mismatch: {data['groom_name']}"
    assert "<script>" not in data["groom_name"], "XSS tag was not sanitized!"
    assert data["venue_name"] == "The Reverie Saigon"
    assert len(data["schedule"]) == 3
    print("GET /api/content (Public) -> Updated content served cleanly & sanitized!")
    print("=> Test 3 PASSED: Quản lý Nội Dung Thiệp hoạt động hoàn hảo!")

    # 4. Banking & VietQR Management Tests
    print("\n--- Test 4: Quản lý Thông Tin Mừng Cưới & Mã VietQR (Phần B & C) ---")
    # A. Fetch supported banks and current accounts
    status, body, _ = request_json(f"{BASE_URL}/api/admin/banking", opener=opener)
    assert status == 200 and body.get("success")
    assert len(body["data"]["supported_banks"]) >= 10
    print(f"GET /api/admin/banking -> OK ({len(body['data']['supported_banks'])} ngân hàng được hỗ trợ)")

    # B. Security test: Reject sensitive fields (PIN, CVV, OTP, etc.)
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/banking",
        method="PUT",
        data={
            "accounts": [{
                "role": "groom",
                "enabled": True,
                "bank_bin": "970436",
                "account_number": "1012345678",
                "pin": "1234"
            }]
        },
        opener=opener
    )
    assert status == 400, f"Expected 400 on sensitive field rejection, got {status}"
    print("Rejected request containing sensitive 'pin' field with 400 Bad Request.")

    # C. Validation test: Invalid account number
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/banking",
        method="PUT",
        data={
            "accounts": [{
                "role": "groom",
                "enabled": True,
                "bank_bin": "970436",
                "account_number": "123", # too short (< 6 chars)
                "account_holder": "NGUYEN VAN TRONG"
            }]
        },
        opener=opener
    )
    assert status == 400, f"Expected 400 on invalid account number, got {status}"
    print("Invalid account number (<6 chars) rejected with 400 Bad Request.")

    # D. Save valid accounts for both Groom and Bride
    valid_banking = {
        "accounts": [
            {
                "role": "groom",
                "enabled": True,
                "bank_bin": "970436", # Vietcombank
                "account_number": "1012345678",
                "account_holder": "Nguyễn Văn Trọng",
                "transfer_note": "Mừng cưới Chú Rể Trọng"
            },
            {
                "role": "bride",
                "enabled": True,
                "bank_bin": "970422", # MB Bank
                "account_number": "88889999",
                "account_holder": "Trần Thị Thùy Linh",
                "transfer_note": "Mừng cưới Cô Dâu Linh"
            }
        ]
    }
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/banking",
        method="PUT",
        data=valid_banking,
        opener=opener
    )
    assert status == 200 and body.get("success"), f"Failed to save banking info: {body}"
    print("PUT /api/admin/banking -> Configured both Groom & Bride accounts successfully!")

    # E. Verify public /api/banking
    status, pub_banking, _ = request_json(f"{BASE_URL}/api/banking")
    assert status == 200 and pub_banking.get("success")
    groom = pub_banking["data"]["groom"]
    bride = pub_banking["data"]["bride"]

    assert groom is not None, "Groom banking should be enabled"
    assert bride is not None, "Bride banking should be enabled"
    assert groom["bank_short_name"] == "VCB"
    assert groom["account_holder"] == "NGUYEN VAN TRONG"
    assert "https://img.vietqr.io/image/970436-1012345678-compact2.png" in groom["qr_url"]
    assert "accountName=NGUYEN+VAN+TRONG" in groom["qr_url"]
    print(f"Public Groom VietQR: {groom['qr_url']}")

    assert bride["bank_short_name"] == "MB"
    assert bride["account_holder"] == "TRAN THI THUY LINH"
    assert "https://img.vietqr.io/image/970422-88889999-compact2.png" in bride["qr_url"]
    assert "accountName=TRAN+THI+THUY+LINH" in bride["qr_url"]
    print(f"Public Bride VietQR: {bride['qr_url']}")

    # F. Test partial disable: Disable Bride account
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/banking",
        method="PUT",
        data={
            "accounts": [{
                "role": "bride",
                "enabled": False,
                "bank_bin": "970422",
                "account_number": "88889999",
                "account_holder": "TRAN THI THUY LINH",
                "transfer_note": "Mung cuoi Linh"
            }]
        },
        opener=opener
    )
    assert status == 200

    status, pub_banking2, _ = request_json(f"{BASE_URL}/api/banking")
    assert pub_banking2["data"]["groom"] is not None
    assert pub_banking2["data"]["bride"] is None, "Disabled bride account must be null publicly"
    print("Partial disable verified: Groom is active, Bride is cleanly null.")

    # Re-enable Bride for comprehensive UI display
    request_json(
        f"{BASE_URL}/api/admin/banking",
        method="PUT",
        data=valid_banking,
        opener=opener
    )
    print("Re-enabled both accounts for frontend UI testing.")
    print("=> Test 4 PASSED: Quản lý Thông Tin Mừng Cưới & Chuẩn VietQR hoàn toàn chính xác!")

    print("\n=================================================================")
    print("TAT CA CAC TEST CASE TASK 7 BACKEND & API HOAN TOAN THANH CONG!")
    print("=================================================================\n")

if __name__ == "__main__":
    run_tests()
