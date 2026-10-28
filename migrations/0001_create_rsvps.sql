-- Migration 0001: Create RSVPs and Rate Limits tables
CREATE TABLE IF NOT EXISTS rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('attending', 'declined')),
  party_size INTEGER NOT NULL DEFAULT 1 CHECK(party_size >= 0 AND party_size <= 10),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rsvps_status_created ON rsvps(status, created_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_action_ip ON rate_limits(action, ip_hash, created_at);
