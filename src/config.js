import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const srcDir = path.dirname(currentFile);
const appRoot = path.resolve(srcDir, '..');

function parseNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function mbToBytes(value, fallbackMb) {
  return parseNumber(value, fallbackMb) * 1024 * 1024;
}

export const config = {
  appName: 'easy-latex',
  appRoot,
  publicDir: path.join(appRoot, 'public'),
  dataDir: process.env.EASY_LATEX_DATA_DIR ?? '/var/lib/easy-latex',
  port: parseNumber(process.env.EASY_LATEX_PORT, 9999),
  sessionCookieName: 'easy_latex_sid',
  guestCookieName: 'easy_latex_gid',
  sessionTtlMs: parseNumber(process.env.EASY_LATEX_SESSION_TTL_HOURS, 12) * 60 * 60 * 1000,
  guestRetentionMs: parseNumber(process.env.EASY_LATEX_GUEST_RETENTION_HOURS, 24) * 60 * 60 * 1000,
  maxConcurrentUsers: parseNumber(process.env.EASY_LATEX_MAX_CONCURRENT_USERS, 10),
  userQuotaBytes: mbToBytes(process.env.EASY_LATEX_USER_QUOTA_MB, 256),
  guestQuotaBytes: mbToBytes(process.env.EASY_LATEX_GUEST_QUOTA_MB, 256),
  compileConcurrency: parseNumber(process.env.EASY_LATEX_COMPILE_CONCURRENCY, 2),
  safeWallSeconds: parseNumber(process.env.EASY_LATEX_SAFE_WALL_SECONDS, 45),
  relaxedWallSeconds: parseNumber(process.env.EASY_LATEX_RELAXED_WALL_SECONDS, 60),
  safeMemoryBytes: mbToBytes(process.env.EASY_LATEX_SAFE_MEMORY_MB, 768),
  relaxedMemoryBytes: mbToBytes(process.env.EASY_LATEX_RELAXED_MEMORY_MB, 1024),
  touchThrottleMs: 5 * 60 * 1000,
  cleanupIntervalMs: 60 * 60 * 1000,
  maxEditableFileBytes: 5 * 1024 * 1024,
  maxCompileLogChars: 40000,
  maxUploadFileBytes: 64 * 1024 * 1024,
  maxUploadFiles: 200,
  defaultEngine: process.env.EASY_LATEX_DEFAULT_ENGINE ?? 'xelatex',
  allowedEngines: ['pdflatex', 'xelatex', 'lualatex'],
  allowedCompileModes: ['safe', 'relaxed']
};

config.databasePath = path.join(config.dataDir, 'app.db');
config.storageDir = path.join(config.dataDir, 'storage');
config.runtimeDir = path.join(config.dataDir, 'runtime');
config.previewDir = path.join(config.runtimeDir, 'previews');
config.tempDir = path.join(config.runtimeDir, 'tmp');
config.uploadTmpDir = path.join(config.runtimeDir, 'uploads');

export function ensureAppDirectories() {
  for (const directory of [
    config.dataDir,
    config.storageDir,
    config.runtimeDir,
    config.previewDir,
    config.tempDir,
    config.uploadTmpDir
  ]) {
    fs.mkdirSync(directory, { recursive: true });
  }
}
