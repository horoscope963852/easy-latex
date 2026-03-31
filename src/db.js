import Database from 'better-sqlite3';
import { config, ensureAppDirectories } from './config.js';

ensureAppDirectories();

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    created_at INTEGER NOT NULL,
    onboarding_seen_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'guest')),
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    engine TEXT NOT NULL,
    main_file TEXT,
    compile_mode TEXT NOT NULL CHECK (compile_mode IN ('safe', 'relaxed')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_compile_status TEXT,
    last_compile_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_type, owner_id);
`);

const userColumns = new Set(
  db.prepare(`PRAGMA table_info(users)`).all().map((column) => column.name)
);

if (!userColumns.has('onboarding_seen_at')) {
  db.exec('ALTER TABLE users ADD COLUMN onboarding_seen_at INTEGER');
}

const authSetting = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('auth_enabled');
if (!authSetting) {
  db.prepare('INSERT INTO system_settings(key, value) VALUES (?, ?)').run('auth_enabled', '1');
}

export function now() {
  return Date.now();
}

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO system_settings(key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}

export function getAuthEnabled() {
  return getSetting('auth_enabled', '1') === '1';
}

export function hasAdminUser() {
  const row = db.prepare('SELECT 1 FROM users WHERE role = ? LIMIT 1').get('admin');
  return Boolean(row);
}
