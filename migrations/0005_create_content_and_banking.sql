-- Migration 0005: Create wedding details and bank accounts tables
CREATE TABLE IF NOT EXISTS wedding_details (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  groom_name TEXT NOT NULL DEFAULT 'Văn Hiền',
  bride_name TEXT NOT NULL DEFAULT 'Thu Hà',
  event_date_text TEXT NOT NULL DEFAULT '28–29 tháng 11, 2026',
  lunar_date_text TEXT NOT NULL DEFAULT '20–21 tháng 10 âm lịch',
  event_date_iso TEXT NOT NULL DEFAULT '2026-11-28T09:00:00+07:00',
  invitation_title TEXT NOT NULL DEFAULT 'Cùng chúng mình viết nên ngày vui.',
  invitation_copy TEXT NOT NULL DEFAULT 'Sau những tháng ngày thương mến và đồng hành, chúng mình sẽ cùng nhau bước sang một chặng đường mới. Sự hiện diện của bạn sẽ làm ngày vui ấy thêm đầy đủ và đáng nhớ.',
  venue_name TEXT NOT NULL DEFAULT 'TDP Ninh Sơn',
  venue_address TEXT NOT NULL DEFAULT 'Phường Vân Hà, TP Bắc Ninh',
  venue_note TEXT NOT NULL DEFAULT 'Rất mong được đón bạn tại đây.',
  map_url TEXT NOT NULL DEFAULT 'https://maps.google.com/?q=TDP+Ninh+Son%2C+Phuong+Van+Ha%2C+TP+Bac+Ninh',
  schedule_json TEXT NOT NULL DEFAULT '[{"date":"28.11","day":"Thứ Bảy","desc":"Ngày cưới thứ nhất. Chương trình sẽ được cập nhật."},{"date":"29.11","day":"Chủ nhật","desc":"Ngày cưới thứ hai. Chương trình sẽ được cập nhật."}]',
  closing_heading TEXT NOT NULL DEFAULT 'Khi có bạn bên cạnh.',
  closing_names TEXT NOT NULL DEFAULT 'Văn Hiền & Thu Hà',
  closing_date TEXT NOT NULL DEFAULT '28–29 · 11 · 2026 — Bắc Ninh',
  updated_at TEXT NOT NULL
);

-- Seed initial row
INSERT OR IGNORE INTO wedding_details (id, updated_at) VALUES (1, '2026-10-28T18:00:00Z');

CREATE TABLE IF NOT EXISTS bank_accounts (
  role TEXT PRIMARY KEY CHECK (role IN ('groom', 'bride')),
  enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0, 1)),
  bank_bin TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT '',
  bank_short_name TEXT NOT NULL DEFAULT '',
  account_number TEXT NOT NULL DEFAULT '',
  account_holder TEXT NOT NULL DEFAULT '',
  transfer_note TEXT NOT NULL DEFAULT 'Mung cuoi',
  updated_at TEXT NOT NULL
);

-- Seed initial groom & bride rows (disabled by default)
INSERT OR IGNORE INTO bank_accounts (role, enabled, updated_at) VALUES ('groom', 0, '2026-10-28T18:00:00Z');
INSERT OR IGNORE INTO bank_accounts (role, enabled, updated_at) VALUES ('bride', 0, '2026-10-28T18:00:00Z');
