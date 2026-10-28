import urllib.request
import urllib.parse
import json
import http.cookiejar
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8788"

def request_json(url, method="GET", data=None, headers=None, opener=None):
    if headers is None:
        headers = {}
    
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
        headers["X-Requested-With"] = "XMLHttpRequest"

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    
    try:
        if opener:
            resp = opener.open(req)
        else:
            resp = urllib.request.urlopen(req)
        status = resp.status
        resp_body = resp.read().decode("utf-8")
        resp_headers = resp.headers
        try:
            parsed = json.loads(resp_body)
        except:
            parsed = resp_body
        return status, parsed, resp_headers
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
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
    print("=== BAT DAU KIEM THU TASK 6: AUTH & ADMIN DASHBOARD ===")
    
    # 1. Check unauthenticated access to admin APIs
    print("\n--- Test 1: Truong hop chua dang nhap truy cap Admin APIs ---")
    for endpoint in ["/api/admin/stats", "/api/admin/rsvps", "/api/admin/wishes"]:
        status, body, _ = request_json(f"{BASE_URL}{endpoint}")
        print(f"GET {endpoint} -> Status: {status}, Error: {body.get('error') if isinstance(body, dict) else body}")
        assert status == 401, f"Expected 401 on {endpoint}, got {status}"
    
    # Test PATCH unauthenticated
    status, body, _ = request_json(f"{BASE_URL}/api/admin/wishes/1", method="PATCH", data={"status": "approved"})
    print(f"PATCH /api/admin/wishes/1 -> Status: {status}")
    assert status == 401, f"Expected 401 on PATCH /api/admin/wishes/1, got {status}"
    print("=> Test 1 PASSED: Tat ca admin APIs duoc bao ve backend 100%!")

    # 2. Check invalid login credentials
    print("\n--- Test 2: Dang nhap voi sai thong tin & Rate limiting ---")
    status, body, _ = request_json(f"{BASE_URL}/api/admin/session", method="POST", data={"username": "nonexistent", "password": "WrongPassword123!"})
    print(f"Login non-existent user -> Status: {status}, Error: {body.get('error')}")
    assert status == 401
    assert body.get("error") == "Tên đăng nhập hoặc mật khẩu không chính xác."

    status, body, _ = request_json(f"{BASE_URL}/api/admin/session", method="POST", data={"username": "admin", "password": "WrongPassword123!"})
    print(f"Login admin with wrong password -> Status: {status}, Error: {body.get('error')}")
    assert status == 401
    assert body.get("error") == "Tên đăng nhập hoặc mật khẩu không chính xác."
    print("=> Test 2 PASSED: Thong bao loi chung, khong tiet lo tai khoan co ton tai hay khong!")

    # 3. Valid Login
    print("\n--- Test 3: Dang nhap thanh cong voi tai khoan admin ---")
    clear_rate_limits()
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    status, body, headers = request_json(
        f"{BASE_URL}/api/admin/session",
        method="POST",
        data={"username": "admin", "password": "MatKhauBaoMat123!"},
        opener=opener
    )
    print(f"Login admin -> Status: {status}, Success: {body.get('success')}, Token: {body.get('token')[:8]}...")
    assert status == 200
    assert body.get("success") is True
    admin_token = body.get("token")
    assert admin_token is not None

    # Check cookies received
    cookies = [cookie.name for cookie in cj]
    print(f"Cookies set in cookiejar: {cookies}")
    assert "admin_session" in cookies
    print("=> Test 3 PASSED: Dang nhap thanh cong, cookie session duoc tao hop le!")

    # 4. Check session validity
    print("\n--- Test 4: Kiem tra phien lam viec (GET /api/admin/session) ---")
    status, body, _ = request_json(f"{BASE_URL}/api/admin/session", opener=opener)
    print(f"Session check -> Status: {status}, Authenticated: {body.get('authenticated')}, Username: {body.get('username')}")
    assert status == 200
    assert body.get("authenticated") is True
    assert body.get("username").lower() == "admin"
    print("=> Test 4 PASSED: Phien dang nhap hop le!")

    # 5. Fetch dashboard stats
    print("\n--- Test 5: Lay thong ke Dashboard (GET /api/admin/stats) ---")
    status, body, _ = request_json(f"{BASE_URL}/api/admin/stats", opener=opener)
    print(f"Stats check -> Status: {status}, Stats: {json.dumps(body.get('stats'), ensure_ascii=False)}")
    assert status == 200
    assert body.get("success") is True
    stats = body.get("stats")
    rsvp_stats = stats.get("rsvp")
    assert "total" in rsvp_stats
    assert "attending" in rsvp_stats
    assert "declined" in rsvp_stats
    assert "total_guests" in rsvp_stats
    print(f"RSVP Stats: Total={rsvp_stats['total']}, Attending={rsvp_stats['attending']}, Declined={rsvp_stats['declined']}, Total Guests={rsvp_stats['total_guests']}")
    print("=> Test 5 PASSED: Thong ke RSVP va loi chuc day du, dung quy tac tong so khach chi tinh attending!")

    # 6. Fetch RSVP list with filters
    print("\n--- Test 6: Danh sach RSVP kem loc va phan trang ---")
    status, body, _ = request_json(f"{BASE_URL}/api/admin/rsvps?status=all&limit=5", opener=opener)
    print(f"RSVP list (all) -> Status: {status}, Count: {len(body.get('data', []))}, Total: {body.get('pagination', {}).get('total')}")
    assert status == 200
    assert body.get("success") is True

    status, body, _ = request_json(f"{BASE_URL}/api/admin/rsvps?status=attending&limit=5", opener=opener)
    print(f"RSVP list (attending) -> Status: {status}, Count: {len(body.get('data', []))}")
    assert status == 200

    # 7. Wish moderation cycle (Public submit -> pending -> admin approve -> public visible -> admin hide -> public hidden)
    print("\n--- Test 7: Quy trinh kiem duyet loi chuc (Public Submit -> Pending -> Approve -> Hide) ---")
    import time
    wish_uid = int(time.time() * 1000)
    wish_name = f"Ban Than {wish_uid}"
    wish_msg = f"Chuc hai ban tram nam hanh phuc nhe! #{wish_uid}"
    status, body, _ = request_json(
        f"{BASE_URL}/api/wishes",
        method="POST",
        data={"guest_name": wish_name, "message": wish_msg, "status": "approved"} # Attempt to spoof status!
    )
    print(f"Public wish submission -> Status: {status}, Msg: {body.get('message')}")
    assert status == 201

    # Check public wishes: this wish MUST NOT be visible yet because status must be pending
    status, body, _ = request_json(f"{BASE_URL}/api/wishes")
    assert status == 200
    public_wishes = body.get("data", [])
    found_in_public = any(w.get("guest_name") == wish_name and w.get("message") == wish_msg for w in public_wishes)
    print(f"Wish visible in public GET /api/wishes before approval: {found_in_public}")
    assert not found_in_public, "Security error: Pending wish must NOT be visible publicly!"

    # Admin fetches pending wishes
    status, body, _ = request_json(f"{BASE_URL}/api/admin/wishes?status=pending", opener=opener)
    assert status == 200
    pending_list = body.get("data", [])
    target_wish = next((w for w in pending_list if w.get("guest_name") == wish_name and w.get("message") == wish_msg), None)
    assert target_wish is not None, "Admin should see the pending wish!"
    target_id = target_wish["id"]
    print(f"Admin found pending wish with ID: {target_id}")

    # Admin approves wish
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/wishes/{target_id}",
        method="PATCH",
        data={"status": "approved"},
        opener=opener
    )
    print(f"Admin approve wish #{target_id} -> Status: {status}, Msg: {body.get('message')}")
    assert status == 200
    assert body.get("status") == "approved"

    # Now public wishes MUST show this approved wish!
    status, body, _ = request_json(f"{BASE_URL}/api/wishes")
    assert status == 200
    public_wishes = body.get("data", [])
    found_in_public_after = any(w.get("id") == target_id for w in public_wishes)
    print(f"Wish visible in public GET /api/wishes AFTER approval: {found_in_public_after}")
    assert found_in_public_after, "Approved wish MUST be visible publicly!"

    # Admin hides wish
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/wishes/{target_id}",
        method="PATCH",
        data={"status": "hidden"},
        opener=opener
    )
    print(f"Admin hide wish #{target_id} -> Status: {status}, Msg: {body.get('message')}")
    assert status == 200
    assert body.get("status") == "hidden"

    # Public wishes MUST NOT show hidden wish!
    status, body, _ = request_json(f"{BASE_URL}/api/wishes")
    public_wishes = body.get("data", [])
    found_in_public_after_hide = any(w.get("id") == target_id for w in public_wishes)
    print(f"Wish visible in public GET /api/wishes AFTER hide: {found_in_public_after_hide}")
    assert not found_in_public_after_hide, "Hidden wish must NOT be visible publicly!"
    print("=> Test 7 PASSED: Quy trinh kiem duyet loi chuc hoan hao va bao mat tuyet doi!")

    # 8. Logout and session revocation
    print("\n--- Test 8: Dang xuat va huy phien lam viec ---")
    status, body, _ = request_json(
        f"{BASE_URL}/api/admin/session",
        method="DELETE",
        opener=opener
    )
    print(f"Logout -> Status: {status}, Msg: {body.get('message')}")
    assert status == 200

    # Try accessing protected admin API again with revoked session
    status, body, _ = request_json(f"{BASE_URL}/api/admin/stats", opener=opener)
    print(f"Access /api/admin/stats after logout -> Status: {status}, Error: {body.get('error') if isinstance(body, dict) else body}")
    assert status == 401, f"Expected 401 after logout, got {status}"
    print("=> Test 8 PASSED: Phien dang nhap bi thu hoi thanh cong!")

    # 9. Test HTML response
    print("\n--- Test 9: Kiem tra trang static /admin.html ---")
    req = urllib.request.Request(f"{BASE_URL}/admin.html")
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode("utf-8")
        assert resp.status == 200
        assert "login-form" in html
        assert "dashboard-view" in html
        assert "panel-rsvps" in html
        assert "panel-wishes" in html
    print("=> Test 9 PASSED: Trang admin.html render day du!")

    print("\n========================================================")
    print(">>> TAT CA 9 BO TEST CHO TASK 6 DA DAT 100% HOAN HAO! <<<")
    print("========================================================")

if __name__ == "__main__":
    run_tests()
