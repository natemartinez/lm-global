-- Migration 0003: Track download attempt rates for rate limiting
-- Protects against brute-force bots cycling through download tokens

CREATE TABLE IF NOT EXISTS download_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for efficient time-range queries per IP
CREATE INDEX IF NOT EXISTS idx_download_attempts_ip_time
    ON download_attempts(ip_address, attempted_at);
