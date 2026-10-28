-- Migration 0004: Create images, site_media, and album_items tables
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storage_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  alt_text TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC);

CREATE TABLE IF NOT EXISTS site_media (
  slot_name TEXT PRIMARY KEY,
  image_id INTEGER REFERENCES images(id) ON DELETE RESTRICT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS album_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id INTEGER NOT NULL REFERENCES images(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK(is_visible IN (0, 1)),
  caption TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_album_items_order ON album_items(is_visible, sort_order ASC, id ASC);
