import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import mime from 'mime-types';
import multer from 'multer';
import { config, ensureAppDirectories } from './config.js';
import { compileProject, detectDocumentProfile } from './compiler.js';
import { runCleanup } from './cleanup.js';
import { db, getAuthEnabled, hasAdminUser, now, setSetting } from './db.js';
import {
  calculateDirectorySize,
  ensureDirectory,
  ensureProjectWorkspace,
  findMainTex,
  formatProjectName,
  listProjectEntries,
  pathExists,
  previewDirectory,
  projectRootDirectory,
  projectWorkspaceDirectory,
  readFileForEditor,
  removePath,
  resolveWorkspacePath,
  sanitizeRelativePath,
  uniqueFileName,
  writeStarterProject
} from './storage.js';

ensureAppDirectories();

const app = express();
const upload = multer({
  dest: config.uploadTmpDir,
  limits: {
    fileSize: config.maxUploadFileBytes,
    files: config.maxUploadFiles
  }
});

const SESSION_SELECT_SQL = `
  SELECT s.id, s.user_id, s.last_seen_at, s.expires_at, u.username, u.role, u.onboarding_seen_at
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.id = ? AND s.expires_at > ?
`;

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function parseCookies(cookieHeader) {
  const cookies = {};
  const source = String(cookieHeader ?? '');
  for (const part of source.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) {
      continue;
    }
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
  }
  return cookies;
}

function appendCookie(res, cookieValue) {
  const current = res.getHeader('Set-Cookie');
  if (!current) {
    res.setHeader('Set-Cookie', [cookieValue]);
    return;
  }
  if (Array.isArray(current)) {
    res.setHeader('Set-Cookie', [...current, cookieValue]);
    return;
  }
  res.setHeader('Set-Cookie', [current, cookieValue]);
}

function setCookie(res, name, value, { maxAgeMs } = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];
  if (Number.isFinite(maxAgeMs)) {
    parts.push(`Max-Age=${Math.max(0, Math.floor(maxAgeMs / 1000))}`);
  }
  appendCookie(res, parts.join('; '));
}

function clearCookie(res, name) {
  appendCookie(res, `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function validateUsername(username) {
  const normalized = String(username ?? '').trim();
  if (!/^[A-Za-z0-9_-]{3,24}$/.test(normalized)) {
    throw new Error('Username must be 3-24 characters using letters, digits, "_" or "-".');
  }
  return normalized;
}

function validatePassword(password) {
  const normalized = String(password ?? '');
  if (normalized.length < 8 || normalized.length > 128) {
    throw new Error('Password length must be between 8 and 128 characters.');
  }
  return normalized;
}

function sendError(res, statusCode, message, extra = {}) {
  res.status(statusCode).json({
    error: message,
    ...extra
  });
}

function serializeSessionUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    onboardingSeenAt: user.onboarding_seen_at ?? null
  };
}

function serializeProject(project) {
  return {
    id: project.id,
    name: project.name,
    engine: project.engine,
    mainFile: project.main_file,
    compileMode: project.compile_mode,
    ownerType: project.owner_type,
    updatedAt: project.updated_at,
    lastCompileStatus: project.last_compile_status,
    lastCompileAt: project.last_compile_at
  };
}

function getOwnerStorageRoot(ownerType, ownerId) {
  if (ownerType === 'user') {
    return path.join(config.storageDir, 'users', String(ownerId));
  }
  return path.join(config.storageDir, 'guests', String(ownerId));
}

async function getStorageUsageBytes(ownerType, ownerId) {
  return calculateDirectorySize(getOwnerStorageRoot(ownerType, ownerId));
}

function getQuotaBytes(actor) {
  return actor.type === 'user' ? config.userQuotaBytes : config.guestQuotaBytes;
}

function findUserByUsername(username, role) {
  return db.prepare(`
    SELECT id, username, password_hash, role, onboarding_seen_at
    FROM users
    WHERE username = ? COLLATE NOCASE AND role = ?
    LIMIT 1
  `).get(username, role);
}

function getUserById(userId) {
  return db.prepare(`
    SELECT id, username, role, onboarding_seen_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `).get(userId);
}

function createSessionForUser(userId, res) {
  const token = generateToken();
  const currentTime = now();
  db.prepare(`
    INSERT INTO sessions(id, user_id, created_at, last_seen_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, userId, currentTime, currentTime, currentTime + config.sessionTtlMs);
  setCookie(res, config.sessionCookieName, token, { maxAgeMs: config.sessionTtlMs });
  return token;
}

function markUserOnboardingSeen(userId) {
  db.prepare(`
    UPDATE users
    SET onboarding_seen_at = COALESCE(onboarding_seen_at, ?)
    WHERE id = ?
  `).run(now(), userId);
}

function destroyCurrentSession(req, res) {
  if (req.sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId);
  }
  clearCookie(res, config.sessionCookieName);
}

function getActiveNormalUserCount() {
  const row = db.prepare(`
    SELECT COUNT(DISTINCT s.user_id) AS total
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > ? AND u.role = 'user'
  `).get(now());
  return row?.total ?? 0;
}

function isUserActive(userId) {
  const row = db.prepare(`
    SELECT 1
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > ? AND s.user_id = ? AND u.role = 'user'
    LIMIT 1
  `).get(now(), userId);
  return Boolean(row);
}

function createProjectRecord(ownerType, ownerId, name) {
  const projectId = crypto.randomUUID();
  const currentTime = now();
  const project = {
    id: projectId,
    owner_type: ownerType,
    owner_id: String(ownerId),
    name,
    engine: config.defaultEngine,
    main_file: 'main.tex',
    compile_mode: 'safe',
    created_at: currentTime,
    updated_at: currentTime,
    last_compile_status: null,
    last_compile_at: null
  };

  db.prepare(`
    INSERT INTO projects(
      id, owner_type, owner_id, name, engine, main_file, compile_mode, created_at, updated_at, last_compile_status, last_compile_at
    )
    VALUES (
      @id, @owner_type, @owner_id, @name, @engine, @main_file, @compile_mode, @created_at, @updated_at, @last_compile_status, @last_compile_at
    )
  `).run(project);

  return project;
}

async function initializeProjectWorkspace(project) {
  await ensureProjectWorkspace(project);
  const mainPath = path.join(projectWorkspaceDirectory(project), 'main.tex');
  if (!(await pathExists(mainPath))) {
    await writeStarterProject(project);
  }
}

async function ensureDefaultProject(ownerType, ownerId) {
  let project = db.prepare(`
    SELECT *
    FROM projects
    WHERE owner_type = ? AND owner_id = ?
    ORDER BY updated_at DESC, created_at ASC
    LIMIT 1
  `).get(ownerType, String(ownerId));

  if (!project) {
    project = createProjectRecord(
      ownerType,
      ownerId,
      ownerType === 'user' ? 'Welcome Project' : 'Temporary Project'
    );
    await initializeProjectWorkspace(project);
  }

  return project;
}

function listProjectsForOwner(ownerType, ownerId) {
  return db.prepare(`
    SELECT *
    FROM projects
    WHERE owner_type = ? AND owner_id = ?
    ORDER BY updated_at DESC, created_at DESC
  `).all(ownerType, String(ownerId));
}

function getProjectById(projectId) {
  return db.prepare('SELECT * FROM projects WHERE id = ? LIMIT 1').get(projectId);
}

function updateProjectTimestamp(projectId) {
  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now(), projectId);
}

async function synchronizeMainFile(project, tree = null) {
  const entries = tree ?? await listProjectEntries(project);
  const texEntries = entries.filter((entry) => entry.type === 'file' && entry.path.toLowerCase().endsWith('.tex'));
  const validMainFile = project.main_file && texEntries.some((entry) => entry.path === project.main_file);
  const nextMainFile = validMainFile ? project.main_file : (texEntries[0]?.path ?? null);

  if (nextMainFile !== project.main_file) {
    db.prepare('UPDATE projects SET main_file = ?, updated_at = ? WHERE id = ?').run(nextMainFile, now(), project.id);
    project.main_file = nextMainFile;
    project.updated_at = now();
  }

  return {
    project,
    entries
  };
}

async function maybePromoteProjectEngine(project) {
  if (project.engine !== 'pdflatex' || !project.main_file) {
    return {
      changed: false,
      engine: project.engine
    };
  }

  const workspaceDir = projectWorkspaceDirectory(project);
  const { resolved } = resolveWorkspacePath(workspaceDir, project.main_file);
  if (!(await pathExists(resolved))) {
    return {
      changed: false,
      engine: project.engine
    };
  }

  const sourceText = await fs.readFile(resolved, 'utf8');
  const profile = detectDocumentProfile(sourceText);
  if (!(profile.usesFontspec || profile.usesCtex || profile.containsCjk)) {
    return {
      changed: false,
      engine: project.engine
    };
  }

  project.engine = 'xelatex';
  db.prepare('UPDATE projects SET engine = ?, updated_at = ? WHERE id = ?').run(project.engine, now(), project.id);
  return {
    changed: true,
    engine: project.engine
  };
}

async function resolveEditorActor(req, res) {
  if (req.currentUser?.role === 'user') {
    return {
      type: 'user',
      id: String(req.currentUser.id),
      user: req.currentUser
    };
  }

  if (!getAuthEnabled()) {
    const guestId = ensureGuestIdentity(req, res);
    return {
      type: 'guest',
      id: guestId
    };
  }

  return null;
}

function ensureGuestIdentity(req, res) {
  const existing = req.cookies[config.guestCookieName];
  if (existing && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) {
    return existing;
  }
  const guestId = generateToken();
  setCookie(res, config.guestCookieName, guestId, { maxAgeMs: config.guestRetentionMs });
  req.cookies[config.guestCookieName] = guestId;
  return guestId;
}

async function requireEditorActor(req, res) {
  const actor = await resolveEditorActor(req, res);
  if (!actor) {
    sendError(res, 401, 'Login required.');
    return null;
  }
  await ensureDefaultProject(actor.type, actor.id);
  return actor;
}

function requireAdmin(req, res) {
  if (req.currentUser?.role !== 'admin') {
    sendError(res, 401, 'Admin login required.');
    return false;
  }
  return true;
}

function requireLoggedUser(req, res) {
  if (req.currentUser?.role !== 'user') {
    sendError(res, 401, 'Login required.');
    return false;
  }
  return true;
}

function getProjectForActor(projectId, actor) {
  return db.prepare(`
    SELECT *
    FROM projects
    WHERE id = ? AND owner_type = ? AND owner_id = ?
    LIMIT 1
  `).get(projectId, actor.type, String(actor.id));
}

async function buildProjectState(project, actor) {
  const synced = await synchronizeMainFile(project);
  const previewPdfPath = path.join(previewDirectory(project.id), 'latest.pdf');
  const usageBytes = await getStorageUsageBytes(actor.type, actor.id);

  return {
    project: serializeProject(synced.project),
    tree: synced.entries,
    quota: {
      usedBytes: usageBytes,
      limitBytes: getQuotaBytes(actor)
    },
    canSaveToCloud: actor.type === 'user',
    previewAvailable: await pathExists(previewPdfPath),
    previewUrl: `/api/projects/${project.id}/preview`
  };
}

async function saveTextFile(project, actor, relativePath, content) {
  const workspaceDir = projectWorkspaceDirectory(project);
  await ensureDirectory(workspaceDir);
  const { sanitized, resolved } = resolveWorkspacePath(workspaceDir, relativePath);
  const buffer = Buffer.from(String(content ?? ''), 'utf8');
  let previousSize = 0;

  if (await pathExists(resolved)) {
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) {
      throw new Error('Target path is not a file.');
    }
    previousSize = stat.size;
  }

  const usageBytes = await getStorageUsageBytes(actor.type, actor.id);
  const nextUsage = usageBytes - previousSize + buffer.length;
  if (nextUsage > getQuotaBytes(actor)) {
    throw new Error('Storage quota exceeded.');
  }

  await ensureDirectory(path.dirname(resolved));
  await fs.writeFile(resolved, buffer);
  updateProjectTimestamp(project.id);
  return sanitized;
}

async function deleteProjectFiles(project) {
  await removePath(projectRootDirectory(project));
  await removePath(previewDirectory(project.id));
}

async function cleanupTempUploads(files) {
  for (const uploadFile of files || []) {
    if (uploadFile?.path) {
      await removePath(uploadFile.path);
    }
  }
}

async function sendProjectFile(project, relativePath, res, asAttachment = false) {
  const workspaceDir = projectWorkspaceDirectory(project);
  const { sanitized, resolved } = resolveWorkspacePath(workspaceDir, relativePath);
  if (!(await pathExists(resolved))) {
    throw new Error('File not found.');
  }
  const stat = await fs.stat(resolved);
  if (!stat.isFile()) {
    throw new Error('Only files can be downloaded.');
  }
  const contentType = mime.lookup(sanitized) || 'application/octet-stream';
  res.type(contentType);
  if (asAttachment) {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(sanitized)}"`);
  }
  res.sendFile(resolved);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use('/static', express.static(config.publicDir, { index: false, fallthrough: false }));

app.use((req, res, next) => {
  req.cookies = parseCookies(req.headers.cookie);
  req.currentUser = null;
  req.sessionId = null;

  const sessionId = req.cookies[config.sessionCookieName];
  if (sessionId && /^[A-Za-z0-9_-]{16,64}$/.test(sessionId)) {
    const currentTime = now();
    const session = db.prepare(SESSION_SELECT_SQL).get(sessionId, currentTime);
    if (session) {
      req.sessionId = session.id;
      req.currentUser = {
        id: session.user_id,
        username: session.username,
        role: session.role,
        onboarding_seen_at: session.onboarding_seen_at ?? null
      };

      if (currentTime - session.last_seen_at > config.touchThrottleMs) {
        db.prepare(`
          UPDATE sessions
          SET last_seen_at = ?, expires_at = ?
          WHERE id = ?
        `).run(currentTime, currentTime + config.sessionTtlMs, session.id);
        setCookie(res, config.sessionCookieName, session.id, { maxAgeMs: config.sessionTtlMs });
      }
    } else {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
      clearCookie(res, config.sessionCookieName);
    }
  }

  next();
});

app.get('/', (req, res) => {
  res.sendFile(path.join(config.publicDir, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(config.publicDir, 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(config.publicDir, 'admin.html'));
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/bootstrap', asyncRoute(async (req, res) => {
  const authEnabled = getAuthEnabled();
  let projects = [];
  let selectedProjectId = null;

  if (req.currentUser?.role === 'user') {
    const ensured = await ensureDefaultProject('user', req.currentUser.id);
    projects = listProjectsForOwner('user', req.currentUser.id).map(serializeProject);
    selectedProjectId = ensured.id;
  } else if (!authEnabled) {
    const guestId = ensureGuestIdentity(req, res);
    const ensured = await ensureDefaultProject('guest', guestId);
    projects = listProjectsForOwner('guest', guestId).map(serializeProject);
    selectedProjectId = ensured.id;
  }

  res.json({
    authEnabled,
    currentUser: serializeSessionUser(req.currentUser?.role === 'user' ? req.currentUser : null),
    showOnboarding: Boolean(req.currentUser?.role === 'user' && !req.currentUser?.onboarding_seen_at),
    guestMode: !req.currentUser && !authEnabled,
    loginAvailable: hasAdminUser(),
    projects,
    selectedProjectId
  });
}));

app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const username = validateUsername(req.body.username);
  const password = validatePassword(req.body.password);
  const user = findUserByUsername(username, 'user');

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return sendError(res, 401, 'Invalid username or password.');
  }

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
  if (!isUserActive(user.id) && getActiveNormalUserCount() >= config.maxConcurrentUsers) {
    return sendError(res, 403, 'The maximum number of concurrently logged-in users has been reached.');
  }

  destroyCurrentSession(req, res);
  createSessionForUser(user.id, res);
  await ensureDefaultProject('user', user.id);
  res.json({ ok: true });
}));

app.post('/api/auth/logout', (req, res) => {
  destroyCurrentSession(req, res);
  res.json({ ok: true });
});

app.post('/api/me/onboarding', (req, res) => {
  if (!requireLoggedUser(req, res)) {
    return;
  }
  markUserOnboardingSeen(req.currentUser.id);
  req.currentUser.onboarding_seen_at = now();
  res.json({ ok: true });
});

app.get('/api/projects', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }
  const projects = listProjectsForOwner(actor.type, actor.id);
  res.json({
    projects: projects.map(serializeProject)
  });
}));

app.post('/api/projects', asyncRoute(async (req, res) => {
  if (!requireLoggedUser(req, res)) {
    return;
  }

  const name = formatProjectName(req.body.name || 'Untitled Project');
  const project = createProjectRecord('user', req.currentUser.id, name);
  await initializeProjectWorkspace(project);

  res.json({
    ok: true,
    project: serializeProject(project)
  });
}));

app.patch('/api/projects/:projectId', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }
  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }
  const name = formatProjectName(req.body.name);
  db.prepare('UPDATE projects SET name = ?, updated_at = ? WHERE id = ?').run(name, now(), project.id);
  res.json({ ok: true });
}));

app.delete('/api/projects/:projectId', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }
  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  await deleteProjectFiles(project);
  db.prepare('DELETE FROM projects WHERE id = ?').run(project.id);
  res.json({ ok: true });
}));

app.get('/api/projects/:projectId/state', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const state = await buildProjectState(project, actor);
  res.json(state);
}));

app.get('/api/projects/:projectId/file', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const relativePath = sanitizeRelativePath(req.query.path);
  const result = await readFileForEditor(project, relativePath);
  res.json({
    ...result,
    downloadUrl: `/api/projects/${project.id}/raw?path=${encodeURIComponent(relativePath)}`
  });
}));

app.put('/api/projects/:projectId/file', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const relativePath = sanitizeRelativePath(req.body.path);
  if (Buffer.byteLength(String(req.body.content ?? ''), 'utf8') > config.maxEditableFileBytes) {
    return sendError(res, 400, 'File is too large for in-browser editing.');
  }

  await saveTextFile(project, actor, relativePath, req.body.content ?? '');
  const synced = await synchronizeMainFile(project);
  res.json({
    ok: true,
    path: relativePath,
    mainFile: synced.project.main_file
  });
}));

app.post('/api/projects/:projectId/files/create', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }
  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }
  const relativePath = sanitizeRelativePath(req.body.path);
  await saveTextFile(project, actor, relativePath, req.body.content ?? '');
  const synced = await synchronizeMainFile(project);
  res.json({
    ok: true,
    path: relativePath,
    mainFile: synced.project.main_file
  });
}));

app.delete('/api/projects/:projectId/file', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const workspaceDir = projectWorkspaceDirectory(project);
  const { resolved } = resolveWorkspacePath(workspaceDir, req.query.path);
  if (!(await pathExists(resolved))) {
    return sendError(res, 404, 'File not found.');
  }

  await removePath(resolved);
  updateProjectTimestamp(project.id);
  const synced = await synchronizeMainFile(project);
  res.json({
    ok: true,
    mainFile: synced.project.main_file
  });
}));

app.post('/api/projects/:projectId/upload', upload.any(), asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) {
    return sendError(res, 400, 'No files were uploaded.');
  }

  try {
    let relativePaths = [];
    if (req.body.relativePaths) {
      try {
        relativePaths = JSON.parse(req.body.relativePaths);
      } catch {
        return sendError(res, 400, 'Invalid relativePaths payload.');
      }
    }

    if (relativePaths.length && relativePaths.length !== files.length) {
      return sendError(res, 400, 'Uploaded file metadata is incomplete.');
    }

    const workspaceDir = projectWorkspaceDirectory(project);
    await ensureDirectory(workspaceDir);

    const seenPaths = new Set();
    let overwriteBytes = 0;
    let incomingBytes = 0;
    const plan = [];

    for (let index = 0; index < files.length; index += 1) {
      const uploadFile = files[index];
      const desiredPath = relativePaths[index] || uploadFile.originalname;
      const sanitized = sanitizeRelativePath(desiredPath);
      if (seenPaths.has(sanitized)) {
        return sendError(res, 400, `Duplicate destination path: ${sanitized}`);
      }
      seenPaths.add(sanitized);

      const destination = resolveWorkspacePath(workspaceDir, sanitized).resolved;
      if (await pathExists(destination)) {
        const stat = await fs.stat(destination);
        if (stat.isFile()) {
          overwriteBytes += stat.size;
        } else {
          return sendError(res, 400, `Cannot overwrite directory: ${sanitized}`);
        }
      }
      incomingBytes += uploadFile.size;
      plan.push({ uploadFile, sanitized, destination });
    }

    const currentUsage = await getStorageUsageBytes(actor.type, actor.id);
    const nextUsage = currentUsage - overwriteBytes + incomingBytes;
    if (nextUsage > getQuotaBytes(actor)) {
      return sendError(res, 400, 'Storage quota exceeded.');
    }

    for (const item of plan) {
      await ensureDirectory(path.dirname(item.destination));
      await fs.rename(item.uploadFile.path, item.destination);
    }

    updateProjectTimestamp(project.id);
    const synced = await synchronizeMainFile(project);
    res.json({
      ok: true,
      mainFile: synced.project.main_file
    });
  } finally {
    await cleanupTempUploads(files);
  }
}));

app.post('/api/projects/:projectId/main-file', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const mainFile = sanitizeRelativePath(req.body.mainFile);
  if (!mainFile.toLowerCase().endsWith('.tex')) {
    return sendError(res, 400, 'Main file must end with .tex.');
  }

  const workspaceDir = projectWorkspaceDirectory(project);
  const { resolved } = resolveWorkspacePath(workspaceDir, mainFile);
  if (!(await pathExists(resolved))) {
    return sendError(res, 404, 'Selected main file does not exist.');
  }

  db.prepare('UPDATE projects SET main_file = ?, updated_at = ? WHERE id = ?').run(mainFile, now(), project.id);
  res.json({ ok: true });
}));

app.post('/api/projects/:projectId/engine', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const engine = String(req.body.engine ?? '');
  if (!config.allowedEngines.includes(engine)) {
    return sendError(res, 400, 'Unsupported LaTeX engine.');
  }

  db.prepare('UPDATE projects SET engine = ?, updated_at = ? WHERE id = ?').run(engine, now(), project.id);
  res.json({ ok: true });
}));

app.post('/api/projects/:projectId/compile', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  if (req.body.currentFile && typeof req.body.currentContent === 'string') {
    await saveTextFile(project, actor, req.body.currentFile, req.body.currentContent);
  }

  const engineAdjustment = await maybePromoteProjectEngine(project);
  const result = await compileProject(project);
  db.prepare(`
    UPDATE projects
    SET last_compile_status = ?, last_compile_at = ?, updated_at = ?
    WHERE id = ?
  `).run(result.success ? 'success' : 'failed', now(), now(), project.id);

  res.json({
    ok: true,
    success: result.success,
    previewAvailable: result.previewAvailable,
    previewUrl: `/api/projects/${project.id}/preview?ts=${Date.now()}`,
    engineUsed: project.engine,
    engineAdjusted: engineAdjustment.changed,
    logText: result.logText,
    errors: result.errors,
    warnings: result.warnings,
    hints: result.hints,
    recommendedEngine: result.recommendedEngine
  });
}));

app.get('/api/projects/:projectId/preview', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }

  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const pdfPath = path.join(previewDirectory(project.id), 'latest.pdf');
  if (!(await pathExists(pdfPath))) {
    return sendError(res, 404, 'No preview PDF is available yet.');
  }

  res.type('application/pdf');
  res.sendFile(pdfPath);
}));

app.post('/api/projects/:projectId/export', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }
  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const previewPdfPath = path.join(previewDirectory(project.id), 'latest.pdf');
  if (!(await pathExists(previewPdfPath))) {
    return sendError(res, 400, 'Compile the project successfully before exporting.');
  }

  const action = String(req.body.action ?? '');
  if (action === 'download') {
    return res.json({
      ok: true,
      downloadUrl: `/api/projects/${project.id}/download?ts=${Date.now()}`
    });
  }

  if (action === 'save') {
    if (actor.type !== 'user') {
      return sendError(res, 403, 'Only logged-in users can save PDF files into cloud storage.');
    }

    const workspaceDir = projectWorkspaceDirectory(project);
    const exportDir = path.join(workspaceDir, 'exports');
    await ensureDirectory(exportDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const mainBase = project.main_file ? path.parse(project.main_file).name : 'document';
    const fileName = uniqueFileName(exportDir, `${mainBase}-${timestamp}.pdf`);
    const destination = path.join(exportDir, fileName);

    const previewStat = await fs.stat(previewPdfPath);
    const currentUsage = await getStorageUsageBytes(actor.type, actor.id);
    if (currentUsage + previewStat.size > getQuotaBytes(actor)) {
      return sendError(res, 400, 'Storage quota exceeded.');
    }

    await fs.copyFile(previewPdfPath, destination);
    updateProjectTimestamp(project.id);
    return res.json({
      ok: true,
      savedPath: `exports/${fileName}`
    });
  }

  return sendError(res, 400, 'Invalid export action.');
}));

app.get('/api/projects/:projectId/download', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }
  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }

  const pdfPath = path.join(previewDirectory(project.id), 'latest.pdf');
  if (!(await pathExists(pdfPath))) {
    return sendError(res, 404, 'No compiled PDF is available.');
  }

  const fileName = `${path.parse(project.main_file || 'document').name}.pdf`;
  res.type('application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.sendFile(pdfPath);
}));

app.get('/api/projects/:projectId/raw', asyncRoute(async (req, res) => {
  const actor = await requireEditorActor(req, res);
  if (!actor) {
    return;
  }
  const project = getProjectForActor(req.params.projectId, actor);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }
  await sendProjectFile(project, req.query.path, res, false);
}));

app.get('/api/admin/bootstrap', asyncRoute(async (req, res) => {
  if (!hasAdminUser()) {
    return res.json({
      needsSetup: true,
      needsLogin: false
    });
  }

  if (req.currentUser?.role !== 'admin') {
    return res.json({
      needsSetup: false,
      needsLogin: true
    });
  }

  const users = db.prepare(`
    SELECT u.id, u.username, u.created_at,
      EXISTS(
        SELECT 1 FROM sessions s
        WHERE s.user_id = u.id AND s.expires_at > ?
      ) AS is_online,
      (
        SELECT COUNT(*) FROM projects p
        WHERE p.owner_type = 'user' AND p.owner_id = CAST(u.id AS TEXT)
      ) AS project_count
    FROM users u
    WHERE u.role = 'user'
    ORDER BY u.username COLLATE NOCASE
  `).all(now());

  const enrichedUsers = [];
  for (const user of users) {
    enrichedUsers.push({
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
      isOnline: Boolean(user.is_online),
      projectCount: user.project_count,
      usageBytes: await getStorageUsageBytes('user', user.id),
      quotaBytes: config.userQuotaBytes
    });
  }

  const projects = db.prepare(`
    SELECT p.*, u.username
    FROM projects p
    LEFT JOIN users u
      ON p.owner_type = 'user' AND p.owner_id = CAST(u.id AS TEXT)
    ORDER BY p.updated_at DESC
  `).all().map((project) => ({
    id: project.id,
    name: project.name,
    ownerLabel: project.owner_type === 'user'
      ? project.username
      : `guest:${String(project.owner_id).slice(0, 8)}`,
    ownerType: project.owner_type,
    engine: project.engine,
    mainFile: project.main_file,
    compileMode: project.compile_mode,
    updatedAt: project.updated_at
  }));

  res.json({
    needsSetup: false,
    needsLogin: false,
    authEnabled: getAuthEnabled(),
    adminUser: serializeSessionUser(req.currentUser),
    onlineUserCount: getActiveNormalUserCount(),
    users: enrichedUsers,
    projects
  });
}));

app.post('/api/admin/setup', asyncRoute(async (req, res) => {
  if (hasAdminUser()) {
    return sendError(res, 400, 'Admin account has already been initialized.');
  }

  const username = validateUsername(req.body.username);
  const password = validatePassword(req.body.password);
  const passwordHash = await bcrypt.hash(password, 12);

  const result = db.prepare(`
    INSERT INTO users(username, password_hash, role, created_at)
    VALUES (?, ?, 'admin', ?)
  `).run(username, passwordHash, now());

  destroyCurrentSession(req, res);
  createSessionForUser(result.lastInsertRowid, res);
  res.json({ ok: true });
}));

app.post('/api/admin/login', asyncRoute(async (req, res) => {
  const username = validateUsername(req.body.username);
  const password = validatePassword(req.body.password);
  const adminUser = findUserByUsername(username, 'admin');

  if (!adminUser || !(await bcrypt.compare(password, adminUser.password_hash))) {
    return sendError(res, 401, 'Invalid admin username or password.');
  }

  destroyCurrentSession(req, res);
  createSessionForUser(adminUser.id, res);
  res.json({ ok: true });
}));

app.post('/api/admin/logout', (req, res) => {
  destroyCurrentSession(req, res);
  res.json({ ok: true });
});

app.post('/api/admin/settings/auth', (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }
  const enabled = Boolean(req.body.enabled);
  setSetting('auth_enabled', enabled ? '1' : '0');
  res.json({ ok: true, authEnabled: enabled });
});

app.get('/api/admin/users', asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }
  const users = db.prepare(`
    SELECT id, username, created_at
    FROM users
    WHERE role = 'user'
    ORDER BY username COLLATE NOCASE
  `).all();

  const payload = [];
  for (const user of users) {
    payload.push({
      id: user.id,
      username: user.username,
      createdAt: user.created_at,
      usageBytes: await getStorageUsageBytes('user', user.id),
      quotaBytes: config.userQuotaBytes,
      isOnline: isUserActive(user.id)
    });
  }

  res.json({ users: payload });
}));

app.post('/api/admin/users', asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }
  const username = validateUsername(req.body.username);
  const password = validatePassword(req.body.password);
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    db.prepare(`
      INSERT INTO users(username, password_hash, role, created_at, onboarding_seen_at)
      VALUES (?, ?, 'user', ?, NULL)
    `).run(username, passwordHash, now());
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return sendError(res, 400, 'Username already exists.');
    }
    throw error;
  }

  res.json({ ok: true });
}));

app.delete('/api/admin/users/:userId', asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }

  const user = getUserById(req.params.userId);
  if (!user || user.role !== 'user') {
    return sendError(res, 404, 'User not found.');
  }

  const projects = listProjectsForOwner('user', user.id);
  for (const project of projects) {
    await deleteProjectFiles(project);
  }

  await removePath(getOwnerStorageRoot('user', user.id));
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  res.json({ ok: true });
}));

app.get('/api/admin/projects', asyncRoute(async (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }
  const projects = db.prepare(`
    SELECT p.*, u.username
    FROM projects p
    LEFT JOIN users u
      ON p.owner_type = 'user' AND p.owner_id = CAST(u.id AS TEXT)
    ORDER BY p.updated_at DESC
  `).all().map((project) => ({
    id: project.id,
    name: project.name,
    ownerLabel: project.owner_type === 'user'
      ? project.username
      : `guest:${String(project.owner_id).slice(0, 8)}`,
    ownerType: project.owner_type,
    engine: project.engine,
    mainFile: project.main_file,
    compileMode: project.compile_mode,
    updatedAt: project.updated_at
  }));
  res.json({ projects });
}));

app.patch('/api/admin/projects/:projectId/mode', (req, res) => {
  if (!requireAdmin(req, res)) {
    return;
  }
  const project = getProjectById(req.params.projectId);
  if (!project) {
    return sendError(res, 404, 'Project not found.');
  }
  const compileMode = String(req.body.compileMode ?? '');
  if (!config.allowedCompileModes.includes(compileMode)) {
    return sendError(res, 400, 'Invalid compile mode.');
  }
  db.prepare('UPDATE projects SET compile_mode = ?, updated_at = ? WHERE id = ?').run(compileMode, now(), project.id);
  res.json({ ok: true });
});

app.use((error, _req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  if (error instanceof multer.MulterError) {
    return sendError(res, 400, error.message);
  }

  const message = error?.message || 'Internal server error.';
  const statusCode = /not found/i.test(message) ? 404 : 400;
  console.error(error);
  sendError(res, statusCode, message);
});

await runCleanup();
setInterval(() => {
  runCleanup().catch((error) => {
    console.error('cleanup failed', error);
  });
}, config.cleanupIntervalMs).unref();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`${config.appName} listening on 0.0.0.0:${config.port}`);
});
