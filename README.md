# ThiepCuoiV2

A Vietnamese-first, mobile-responsive wedding invitation. Current release scope is P0: a public static invitation with event details, map and share actions. RSVP, wishes, admin and uploads are deferred.

## Current status

- Local MVP page is implemented in plain HTML/CSS/JavaScript.
- Names, date, venue and locally bundled Unsplash sample photos are demonstration content; replace before public use.
- No database or admin is configured.
- Public deployment has not been performed. Cloudflare Pages is the recommended host; the `pages.dev` URL will exist only after the owner connects a Git repository and deploys.

## Local preview & Development

You can run a basic static server or full-stack with Cloudflare Pages Functions + D1:

### 1. Static Preview
```powershell
py -m http.server 4173 --directory D:\ThiepCuoiV2
```
Open `http://localhost:4173`. (RSVP API calls will require the full-stack server).

### 2. Full-stack Preview with Cloudflare Pages & D1 Database
```powershell
# Apply D1 migrations locally
npx wrangler d1 migrations apply thiepcuoi_d1 --local

# Start full-stack Pages server
npx wrangler pages dev . --port 8788
```
Open `http://127.0.0.1:8788`. This serves static assets, executes `/api/rsvps` via Pages Functions, and connects to the local D1 SQLite database.

## Backend, Database, RSVP, Lời chúc & Trang Quản Trị (P1)

- **RSVP API:** `POST /api/rsvps`
  - Accepts JSON: `{ guest_name: string, status: 'attending' | 'declined', party_size: number }`
  - Server-side validation with prepared/bound parameters.
  - Strict length, unicode name check, Honeypot bot protection, and IP-hash rate limiting.
  - Returns `201 Created` with confirmation message.
  - `GET /api/rsvps` is protected (`405 Method Not Allowed`), preventing unauthorized public viewing of the guest list.
- **Lời chúc (Wishes) API:**
  - `POST /api/wishes`: Gửi lời chúc mới. Mặc định luôn lưu ở trạng thái `pending` (chống leo thang quyền hạn), lọc XSS và giới hạn tần suất.
  - `GET /api/wishes`: Lấy danh sách lời chúc công khai. **Chỉ trả về các lời chúc đã được duyệt (`status = 'approved'`)**, hỗ trợ phân trang (`page`, `limit`), không rò rỉ dữ liệu RSVP hay cột nội bộ.
- **Trang Quản Trị & Bảo Mật (Admin Dashboard):**
  - Giao diện quản trị: `/admin.html` (đồng bộ phong cách tinh tế, responsive, an toàn chống XSS với `textContent`).
  - **Khởi tạo tài khoản Admin an toàn:** Sử dụng CLI `scripts/provision_admin.js` (không hardcode mật khẩu, mã hóa chuẩn PBKDF2 với SHA-256 và salt ngẫu nhiên):
    ```powershell
    # Khởi tạo admin trên môi trường local:
    node scripts/provision_admin.js --username admin --password "MatKhauBaoMat123!"

    # Khởi tạo admin trên môi trường Cloudflare Production:
    node scripts/provision_admin.js --username admin --password "MatKhauBaoMat123!" --remote
    ```
  - **Bảo vệ API đa tầng:** Middleware `functions/api/admin/_middleware.js` bắt buộc xác thực phiên (`admin_sessions`), kiểm tra hết hạn, chống tấn công CSRF (SameSite Strict, Origin & Custom Header check).
  - **Chống dò mật khẩu (Brute-force Protection):** Giới hạn tối đa 5 lần thử sai trong 15 phút, trả thông báo lỗi chung không tiết lộ sự tồn tại của tài khoản.
  - **API Quản trị:**
    - `POST /api/admin/session`: Đăng nhập, cấp cookie `HttpOnly; SameSite=Strict` và session token.
    - `GET /api/admin/session`: Kiểm tra trạng thái phiên làm việc hiện tại.
    - `DELETE /api/admin/session`: Đăng xuất và vô hiệu hóa phiên trong database.
    - `GET /api/admin/stats`: Thống kê phản hồi RSVP (tổng, tham dự, vắng mặt, tổng khách dự kiến chỉ tính theo khách tham dự) và lời chúc.
    - `GET /api/admin/rsvps`: Danh sách RSVP phân trang, tìm kiếm theo tên và lọc theo trạng thái (`all`, `attending`, `declined`).
    - `GET /api/admin/wishes`: Danh sách lời chúc phân trang, lọc theo trạng thái (`all`, `pending`, `approved`, `hidden`).
    - `PATCH /api/admin/wishes/:id`: Duyệt (`approved`) hoặc Ẩn (`hidden`) lời chúc.
- **Quản lý Hình ảnh & Album cưới (Media Management):**
  - **Lưu trữ Object Storage (Cloudflare R2):** Sử dụng R2 bucket `thiepcuoi-media` (Gói miễn phí vĩnh viễn: 10GB lưu trữ, 1.000.000 lượt ghi, 10.000.000 lượt đọc/tháng, $0 phí băng thông/egress).
  - **Kiểm duyệt an ninh upload nghiêm ngặt:**
    - Kiểm tra magic bytes nhị phân thực tế ở backend (chỉ chấp nhận định dạng raster an toàn: JPEG, PNG, WebP).
    - Tuyệt đối từ chối file thực thi, file mã độc và SVG chưa qua xử lý.
    - Giới hạn tối đa 5MB / file và tối đa 10 file / lần tải.
    - Tự động sinh khóa UUID an toàn `img_UUID.ext`, triệt tiêu nguy cơ path traversal (`..`, `/`, `\`).
  - **Chống hỏng thiệp khi xóa ảnh (Safe Deletion Guard):**
    - Hệ thống tự động kiểm tra tham chiếu. Nếu ảnh đang được đặt làm Ảnh bìa hoặc đang nằm trong Album cưới, API lập tức từ chối thao tác xóa với mã lỗi `409 Conflict`, yêu cầu thay thế hoặc gỡ tham chiếu trước.
  - **API Hình ảnh & Album:**
    - `GET /api/images/:key`: Stream ảnh công khai trực tiếp từ R2 với ETag và `Cache-Control: public, max-age=31536000, immutable`.
    - `GET /api/media`: API công khai cung cấp ảnh bìa, ảnh địa điểm và danh sách album cưới đang bật hiển thị (`is_visible = 1`).
    - `GET /api/admin/images`: Danh sách ảnh đã upload kèm trạng thái sử dụng (ảnh bìa, album, sự kiện, chưa dùng).
    - `POST /api/admin/images/upload`: Upload ảnh bảo mật với preview trước khi tải.
    - `DELETE /api/admin/images/:id`: Xóa ảnh an toàn, đồng bộ sạch sẽ giữa D1 và R2.
    - `POST /api/admin/media/assign`: Đặt hoặc thay ảnh bìa thiệp cưới (`cover_photo`) / ảnh sự kiện.
    - `GET /api/admin/album`: Danh sách ảnh trong album cưới.
    - `POST /api/admin/album`: Thêm ảnh từ thư viện vào album.
    - `PATCH /api/admin/album/:id`: Bật/tắt ẩn hiện ảnh trên thiệp cưới.
    - `DELETE /api/admin/album/:id`: Gỡ ảnh khỏi album (vẫn giữ nguyên file gốc trong thư viện).
    - `PUT /api/admin/album/reorder`: Lưu thứ tự hiển thị tùy chỉnh của album.
- **Quản lý Nội Dung Thiệp Cưới (Content Management):**
  - Chỉnh sửa trực tiếp tên cô dâu & chú rể, ngày giờ tổ chức (dương lịch & âm lịch), mốc đếm ngược ISO, tiêu đề và nội dung lời mời, địa điểm tổ chức, ghi chú sảnh tiệc, liên kết Google Maps, danh sách lịch trình sự kiện dạng timeline động, và nội dung chân trang.
  - Cơ chế **Fallback an toàn**: Nếu database chưa có dữ liệu hoặc API gặp sự cố mạng, giao diện công khai tự động giữ nguyên các nội dung tĩnh gốc đã đóng gói sẵn trong HTML, không bị vỡ giao diện.
  - Kiểm duyệt an toàn: Lọc sạch thẻ HTML/XSS, xác thực định dạng URL an toàn (chỉ chấp nhận `http:`, `https:`).
  - API:
    - `GET /api/content`: Lấy nội dung thiệp công khai (có Cache-Control tối ưu).
    - `GET /api/admin/content`: Lấy nội dung cấu hình trong trang quản trị.
    - `PUT /api/admin/content`: Cập nhật nội dung thiệp (yêu cầu quyền quản trị).
- **Mừng Cưới & Mã VietQR Chuẩn Napas (Wedding Gift & VietQR Banking):**
  - Tự động sinh mã VietQR QuickLink chuẩn Napas Việt Nam (`https://img.vietqr.io/image/<BIN>-<ACC>-compact2.png`) từ số tài khoản và ngân hàng đã cấu hình.
  - Cho phép cấu hình tài khoản riêng biệt cho Chú Rể và Cô Dâu với công tắc bật/tắt độc lập.
  - Hỗ trợ danh mục 19+ ngân hàng lớn tại Việt Nam (Vietcombank, MB Bank, Techcombank, VietinBank, BIDV, ACB, VPBank, TPBank, Sacombank, Agribank...).
  - Tự động chuẩn hóa tên chủ tài khoản và nội dung chuyển khoản thành chữ hoa không dấu chuẩn ngân hàng.
  - **Bảo mật tuyệt đối:** Hệ thống chỉ lưu số tài khoản công khai và mã định danh ngân hàng. Tuyệt đối không yêu cầu hoặc lưu trữ mã PIN, mật khẩu, CVV, OTP hay can thiệp vào tài khoản ngân hàng.
  - **Tính năng trên thiệp công khai:**
    - Hiển thị thẻ ngân hàng trang trọng, khớp chuẩn thiết kế thiệp cưới.
    - Nút sao chép số tài khoản tức thì kèm thông báo toast trực quan.
    - Nút tải ảnh mã VietQR để khách mời lưu vào máy.
    - Hiển thị ghi chú cảnh báo khách mời kiểm tra chéo tên người nhận trên ứng dụng ngân hàng.
    - Thông báo rõ ràng website chỉ hỗ trợ hiển thị mã QR, không xác nhận trạng thái nhận tiền và không ghi nhận số dư hay giao dịch.
    - Nếu quản trị viên tắt hoặc chưa cấu hình thông tin mừng cưới: Hệ thống ẩn sạch sẽ khu vực mừng cưới, **tuyệt đối không hiển thị mã QR rác, lỗi hay dữ liệu mẫu**.
  - API:
    - `GET /api/banking`: API công khai cung cấp các tài khoản đang kích hoạt và URL mã VietQR.
    - `GET /api/admin/banking`: API quản trị lấy cấu hình tài khoản và danh sách ngân hàng hỗ trợ.
    - `PUT /api/admin/banking`: Lưu thông tin tài khoản ngân hàng nhận mừng cưới (bảo vệ quyền admin).
- **Database Schema & Migrations:**
  - `migrations/0001_create_rsvps.sql`: Bảng `rsvps` và `rate_limits`.
  - `migrations/0002_create_wishes.sql`: Bảng `wishes` (id, guest_name, message, status, created_at).
  - `migrations/0003_create_admin.sql`: Bảng `admin_users` và `admin_sessions`.
  - `migrations/0004_create_images.sql`: Bảng `images`, `site_media`, và `album_items`.
  - `migrations/0005_create_content_and_banking.sql`: Bảng `wedding_details` (id=1, thông tin thiệp, lịch trình JSON) và bảng `bank_accounts` (role, bank_bin, account_number, account_holder, transfer_note, enabled).
## Production Deployment, Backup, Restore & Rollback

### 1. Hướng dẫn Triển khai Production từng bước (Cloudflare Pages)

#### Bước 1: Khởi tạo D1 Database và R2 Storage trên Cloudflare (Chỉ thực hiện 1 lần duy nhất)
Đăng nhập tài khoản Cloudflare của bạn trên terminal:
```powershell
npx wrangler login
```
Khởi tạo cơ sở dữ liệu D1 và bucket R2 (nằm trọn trong gói miễn phí trọn đời của Cloudflare):
```powershell
# 1. Tạo database D1
npx wrangler d1 create thiepcuoi_d1

# Lệnh trên sẽ trả về 'database_id' (ví dụ: a1b2c3d4-e5f6-7890-abcd-1234567890ef)
# Sao chép database_id này và cập nhật vào trường "database_id" trong file wrangler.jsonc

# 2. Tạo bucket R2 lưu trữ hình ảnh
npx wrangler r2 bucket create thiepcuoi-media
```

#### Bước 2: Chạy migration để khởi tạo cấu trúc bảng trên Production
```powershell
npx wrangler d1 migrations apply thiepcuoi_d1 --remote
```

#### Bước 3: Khởi tạo tài khoản Quản trị viên (Admin) đầu tiên trên Production
Chạy script bảo mật CLI với mật khẩu mạnh tùy chọn của bạn:
```powershell
node scripts/provision_admin.js --username admin --password "MatKhauBaoMatCuaBan123!" --remote
```

#### Bước 4: Triển khai website lên Cloudflare Pages
* **Cách 1: Triển khai trực tiếp qua Wrangler CLI**
```powershell
npx wrangler pages deploy . --project-name thiepcuoi-v2
```
* **Cách 2: Kết nối tự động qua GitHub/GitLab (Khuyên dùng)**
1. Đẩy mã nguồn lên kho lưu trữ riêng (Private Git Repository).
2. Vào Cloudflare Dashboard > **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Chọn repo `ThiepCuoiV2`, thiết lập:
   - Framework preset: `None`
   - Build output directory: `.`
4. Vào **Settings** > **Functions** > **D1 database bindings**:
   - Variable name: `DB`
   - D1 database: `thiepcuoi_d1`
5. Vào **Settings** > **Functions** > **R2 bucket bindings**:
   - Variable name: `MEDIA_BUCKET`
   - R2 bucket: `thiepcuoi-media`

---

### 2. Hướng dẫn Sao lưu (Backup) & Khôi phục (Restore)

#### Sao lưu dữ liệu Database D1
Dữ liệu phản hồi RSVP, lời chúc, cấu hình thiệp và thông tin ngân hàng cần được sao lưu định kỳ:
```powershell
# Xuất toàn bộ dữ liệu production ra file SQL
npx wrangler d1 export thiepcuoi_d1 --remote --output ./backups/backup_d1_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql
```

#### Khôi phục dữ liệu Database D1
Khi cần phục hồi lại dữ liệu từ bản sao lưu:
```powershell
npx wrangler d1 execute thiepcuoi_d1 --remote --file=./backups/ten_file_backup.sql
```

---

### 3. Hướng dẫn Rollback (Quay về phiên bản trước)
Khi một bản cập nhật code mới gặp sự cố hoặc cần đảo ngược khẩn cấp:
1. Truy cập **Cloudflare Dashboard** > **Workers & Pages** > **thiepcuoi-v2**.
2. Chọn mục **Deployments**.
3. Tìm bản triển khai trước đó đang hoạt động ổn định.
4. Bấm vào biểu tượng ba chấm `...` bên cạnh bản triển khai đó > Chọn **Rollback to this deployment**.
5. Hệ thống sẽ ngay lập tức kích hoạt lại phiên bản cũ trong vòng vài giây mà không làm gián đoạn truy cập hay mất mát dữ liệu trong database D1.

---

## Danh Sách Kiểm Tra (Checklist) Trước Khi Công Khai Thiệp Cưới

Trước khi gửi thiệp cưới đến bạn bè, người thân và quan khách, hãy rà soát kỹ bảng kiểm tra sau:

| STT | Hạng mục kiểm tra | Chi tiết cần rà soát | Trạng thái |
|:---:|:---|:---|:---:|
| 1 | **Tên cô dâu & chú rể** | Kiểm tra hiển thị chuẩn xác **Văn Hiền & Thu Hà** trên trang bìa, lời mời, chân trang và tiêu đề tab trình duyệt. | [x] Chuẩn |
| 2 | **Thời gian & Đếm ngược** | Ngày cưới 28–29.11.2026 (20–21.10 âm lịch), đồng hồ đếm ngược chạy chính xác từng phút. | [x] Chuẩn |
| 3 | **Địa điểm & Google Maps** | Địa chỉ TDP Ninh Sơn, Phường Vân Hà. Bấm "Xem bản đồ" mở đúng vị trí chỉ đường Google Maps. | [x] Chuẩn |
| 4 | **Thêm vào lịch** | Bấm "Thêm vào lịch" tạo đúng sự kiện Google Calendar ngày 28–29.11.2026. | [x] Chuẩn |
| 5 | **Album ảnh cưới lớn** | Khung ảnh trung tâm thanh lịch, chuyển cảnh mượt mà, `object-fit: contain` không cắt mặt hay váy cưới, phóng to Lightbox rõ nét. | [x] Chuẩn |
| 6 | **Thông tin mừng cưới VietQR** | Kiểm tra chéo: Chú Rể **NGUYEN VAN HIEN** (Vietcombank) & Cô Dâu **NGUYEN THU HA** (MB Bank). Thử quét mã bằng app ngân hàng thật. | [x] Chuẩn |
| 7 | **Quyền tác giả hình ảnh** | Thay thế ảnh mẫu Unsplash bằng ảnh cưới thật của cô dâu chú rể hoặc ảnh có bản quyền sở hữu hợp pháp. | [ ] Cần thực hiện |
| 8 | **Thử nghiệm trên điện thoại** | Mở bằng Safari (iOS) và Chrome (Android), kiểm tra không bị tràn màn hình ngang, vuốt ảnh mượt mà. | [x] Chuẩn |
| 9 | **Kiểm tra chức năng RSVP** | Gửi thử 1 phản hồi tham dự, đăng nhập trang `/admin.html` kiểm tra thống kê tăng chính xác. | [x] Chuẩn |
| 10 | **Kiểm duyệt lời chúc** | Gửi lời chúc thử, vào admin bấm "Duyệt" và xác nhận lời chúc xuất hiện công khai trên thiệp. | [x] Chuẩn |
| 11 | **Canonical URL & Chia sẻ MXH** | Cập nhật `CANONICAL_URL` trong `<link rel="canonical">` để khi gửi qua Zalo/Facebook hiển thị ảnh preview đẹp mắt. | [ ] Cần cấu hình |

## Updating the invitation

Edit the couple names, date, schedule, venue, map URL, gallery image URLs and page metadata in `index.html`. Update the countdown target in `app.js` to match the event date and local time. Verify links on a phone before sharing.

Replace demonstration photos with images the couple owns or has permission to use. Source links and license notes for the bundled, optimized WebP samples are in [images/ATTRIBUTION.md](images/ATTRIBUTION.md).

Background music uses Canon in D by Kevin MacLeod (CC BY 3.0), documented in [music/ATTRIBUTION.md](music/ATTRIBUTION.md).

QR code generator is vendored locally from `qrcode-generator@2.0.4` (MIT), documented in [vendor/ATTRIBUTION.md](vendor/ATTRIBUTION.md).

## Social Sharing & Canonical URL Configuration

When sharing the invitation via Zalo, Facebook, Messenger, SMS, or Telegram, the preview card (thumbnail, title, description) and the generated QR code rely on the canonical metadata in the `<head>` of `index.html`.

Before public sharing or after deploying to your domain/Cloudflare Pages:
1. Update `<link rel="canonical" href="https://your-domain.pages.dev">` to match your actual public URL.
2. Update `<meta property="og:url" content="https://your-domain.pages.dev">`.
3. Update `<meta property="og:image" content="https://your-domain.pages.dev/images/cover.webp">` with an **absolute HTTPS URL** (social preview cards on Facebook and Zalo require full absolute image URLs).
4. Update `<meta name="twitter:image" content="...">` to match.

> **Lưu ý về môi trường thử nghiệm (Localhost):**
> Khi chạy trên localhost (`http://localhost:4173`), trình duyệt sẽ tự động phát hiện và sử dụng URL trong thẻ `<link rel="canonical">` để tạo mã QR mở được trên điện thoại, đồng thời hiển thị thông báo chú thích rõ ràng. Nếu chưa cấu hình canonical URL, hệ thống sẽ cảnh báo thay vì tạo mã QR giả không thể truy cập.

## Deploying

See [08_DEPLOYMENT_RUNBOOK.md](08_DEPLOYMENT_RUNBOOK.md). The selected target is Cloudflare Pages on its free `pages.dev` subdomain. This repository has not been deployed and no hosting account was created.

## Project documents

- [01_SOURCE_AUDIT.md](01_SOURCE_AUDIT.md)
- [02_PRODUCT_SCOPE.md](02_PRODUCT_SCOPE.md)
- [03_ARCHITECTURE.md](03_ARCHITECTURE.md)
- [04_DEPLOYMENT_OPTIONS.md](04_DEPLOYMENT_OPTIONS.md)
- [05_DATABASE_DESIGN.md](05_DATABASE_DESIGN.md)
- [06_UI_UX_PLAN.md](06_UI_UX_PLAN.md)
- [07_IMPLEMENTATION_PLAN.md](07_IMPLEMENTATION_PLAN.md)
- [08_DEPLOYMENT_RUNBOOK.md](08_DEPLOYMENT_RUNBOOK.md)

## Technical choices and limitations

- Plain HTML/CSS/JS; no package manager/build step for P0.
- No persistent user data is collected by P0.
- If RSVP is added, use a managed database such as D1, not a local database or ephemeral host filesystem.
- Review asset rights, provider limits and privacy needs before adding uploads or storing guest data.
