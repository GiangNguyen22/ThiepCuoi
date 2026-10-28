-- Migration 0002: Create wishes table
CREATE TABLE IF NOT EXISTS wishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'hidden')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wishes_status_created ON wishes(status, created_at DESC);
