import { initLanguageToggle, onLanguageChange, t } from '/static/i18n.js';

const state = {
  bootstrap: null,
  projects: [],
  currentProjectId: null,
  projectState: null,
  currentFilePath: null,
  currentFileEditable: false,
  dirty: false,
  autoCompile: localStorage.getItem('easy-latex:autoCompile') === '1',
  compileInFlight: false,
  pendingCompile: false,
  compileTimer: null,
  openMenu: null,
  submenu: {
    project: 'select',
    files: 'explorer',
    build: 'settings'
  },
  onboardingVisible: false,
  guideModalOpen: false,
  lastCompileResult: {
    success: null,
    errors: [],
    warnings: [],
    hints: [],
    logText: ''
  }
};

const elements = {
  statusBanner: document.getElementById('statusBanner'),
  sessionBadge: document.getElementById('sessionBadge'),
  quotaBadge: document.getElementById('quotaBadge'),
  helpButton: document.getElementById('helpButton'),
  loginButton: document.getElementById('loginButton'),
  logoutButton: document.getElementById('logoutButton'),
  adminButton: document.getElementById('adminButton'),
  projectMenuButton: document.getElementById('projectMenuButton'),
  filesMenuButton: document.getElementById('filesMenuButton'),
  buildMenuButton: document.getElementById('buildMenuButton'),
  projectMenuPanel: document.getElementById('projectMenuPanel'),
  filesMenuPanel: document.getElementById('filesMenuPanel'),
  buildMenuPanel: document.getElementById('buildMenuPanel'),
  projectSubButtonSelect: document.getElementById('projectSubButtonSelect'),
  projectSubButtonManage: document.getElementById('projectSubButtonManage'),
  projectSubSectionSelect: document.getElementById('projectSubSectionSelect'),
  projectSubSectionManage: document.getElementById('projectSubSectionManage'),
  filesSubButtonActions: document.getElementById('filesSubButtonActions'),
  filesSubButtonExplorer: document.getElementById('filesSubButtonExplorer'),
  filesSubSectionActions: document.getElementById('filesSubSectionActions'),
  filesSubSectionExplorer: document.getElementById('filesSubSectionExplorer'),
  buildSubButtonSettings: document.getElementById('buildSubButtonSettings'),
  buildSubButtonLogs: document.getElementById('buildSubButtonLogs'),
  buildSubSectionSettings: document.getElementById('buildSubSectionSettings'),
  buildSubSectionLogs: document.getElementById('buildSubSectionLogs'),
  projectSelect: document.getElementById('projectSelect'),
  newProjectButton: document.getElementById('newProjectButton'),
  renameProjectButton: document.getElementById('renameProjectButton'),
  deleteProjectButton: document.getElementById('deleteProjectButton'),
  engineSelect: document.getElementById('engineSelect'),
  mainFileSelect: document.getElementById('mainFileSelect'),
  compileModeBadge: document.getElementById('compileModeBadge'),
  fileTree: document.getElementById('fileTree'),
  newFileButton: document.getElementById('newFileButton'),
  deleteFileButton: document.getElementById('deleteFileButton'),
  uploadFilesButton: document.getElementById('uploadFilesButton'),
  uploadFolderButton: document.getElementById('uploadFolderButton'),
  fileUploadInput: document.getElementById('fileUploadInput'),
  folderUploadInput: document.getElementById('folderUploadInput'),
  saveButton: document.getElementById('saveButton'),
  compileButton: document.getElementById('compileButton'),
  exportButton: document.getElementById('exportButton'),
  autoCompileToggle: document.getElementById('autoCompileToggle'),
  currentFileLabel: document.getElementById('currentFileLabel'),
  fileAccessLink: document.getElementById('fileAccessLink'),
  editorStateLabel: document.getElementById('editorStateLabel'),
  editor: document.getElementById('editor'),
  compileSummary: document.getElementById('compileSummary'),
  compileErrors: document.getElementById('compileErrors'),
  compileLog: document.getElementById('compileLog'),
  previewFrame: document.getElementById('previewFrame'),
  previewPlaceholder: document.getElementById('previewPlaceholder'),
  previewLabel: document.getElementById('previewLabel'),
  guideModal: document.getElementById('guideModal'),
  guideStartButton: document.getElementById('guideStartButton'),
  exportModal: document.getElementById('exportModal'),
  exportDownloadButton: document.getElementById('exportDownloadButton'),
  exportSaveButton: document.getElementById('exportSaveButton'),
  exportCancelButton: document.getElementById('exportCancelButton')
};

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function showBanner(message, tone = 'info') {
  elements.statusBanner.textContent = message;
  elements.statusBanner.className = `status-banner ${tone}`;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {})
    }
  });

  let payload = null;
  const isJson = response.headers.get('content-type')?.includes('application/json');
  if (isJson) {
    payload = await response.json();
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed: ${response.status}`);
  }

  return payload;
}

function getCurrentProject() {
  return state.projectState?.project || null;
}

function getProjectOptions() {
  return state.projects || [];
}

function getCurrentFileEntry() {
  return state.projectState?.tree?.find((entry) => entry.path === state.currentFilePath) || null;
}

function setOpenMenu(menuName) {
  state.openMenu = state.openMenu === menuName ? null : menuName;
  renderMenuPanels();
}

function openMenu(menuName, submenuName = null) {
  state.openMenu = menuName;
  if (submenuName) {
    state.submenu[menuName] = submenuName;
  }
  renderMenuPanels();
}

function renderMenuPanels() {
  const menuMap = {
    project: [elements.projectMenuButton, elements.projectMenuPanel],
    files: [elements.filesMenuButton, elements.filesMenuPanel],
    build: [elements.buildMenuButton, elements.buildMenuPanel]
  };

  for (const [name, [button, panel]] of Object.entries(menuMap)) {
    const active = state.openMenu === name;
    button.classList.toggle('menu-active', active);
    panel.classList.toggle('is-open', active);
  }

  renderSubmenus();
}

function setSubmenu(menuName, submenuName) {
  state.submenu[menuName] = submenuName;
  renderSubmenus();
}

function renderSubmenus() {
  const submenuMap = {
    project: [
      [elements.projectSubButtonSelect, elements.projectSubSectionSelect, 'select'],
      [elements.projectSubButtonManage, elements.projectSubSectionManage, 'manage']
    ],
    files: [
      [elements.filesSubButtonActions, elements.filesSubSectionActions, 'actions'],
      [elements.filesSubButtonExplorer, elements.filesSubSectionExplorer, 'explorer']
    ],
    build: [
      [elements.buildSubButtonSettings, elements.buildSubSectionSettings, 'settings'],
      [elements.buildSubButtonLogs, elements.buildSubSectionLogs, 'logs']
    ]
  };

  for (const [menuName, entries] of Object.entries(submenuMap)) {
    for (const [button, section, value] of entries) {
      const active = state.submenu[menuName] === value;
      button.classList.toggle('submenu-active', active);
      section.classList.toggle('hidden', !active);
    }
  }
}

function renderSession() {
  const user = state.bootstrap?.currentUser;
  const guestMode = state.bootstrap?.guestMode;
  elements.autoCompileToggle.checked = state.autoCompile;

  if (user) {
    elements.sessionBadge.textContent = t('session.signed_in_as', { username: user.username });
    elements.loginButton.classList.add('hidden');
    elements.logoutButton.classList.remove('hidden');
  } else if (guestMode) {
    elements.sessionBadge.textContent = t('session.guest');
    elements.loginButton.classList.remove('hidden');
    elements.logoutButton.classList.add('hidden');
  } else {
    elements.sessionBadge.textContent = t('session.login_required');
    elements.loginButton.classList.remove('hidden');
    elements.logoutButton.classList.add('hidden');
  }

  const quota = state.projectState?.quota;
  if (quota) {
    elements.quotaBadge.textContent = t('quota.storage', {
      used: formatBytes(quota.usedBytes),
      limit: formatBytes(quota.limitBytes)
    });
  } else {
    elements.quotaBadge.textContent = '';
  }
}

function renderProjects() {
  const projects = getProjectOptions();
  elements.projectSelect.innerHTML = '';
  for (const project of projects) {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    if (project.id === state.currentProjectId) {
      option.selected = true;
    }
    elements.projectSelect.append(option);
  }

  const loggedIn = Boolean(state.bootstrap?.currentUser);
  elements.newProjectButton.disabled = !loggedIn;
  elements.renameProjectButton.disabled = !state.currentProjectId;
  elements.deleteProjectButton.disabled = !state.currentProjectId;
}

function renderFileTree() {
  const tree = state.projectState?.tree || [];
  elements.fileTree.innerHTML = '';

  if (!tree.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = t('tree.empty');
    elements.fileTree.append(empty);
    return;
  }

  for (const entry of tree) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tree-row${entry.path === state.currentFilePath ? ' active' : ''}`;
    button.dataset.path = entry.path;
    button.dataset.kind = entry.type;

    const kind = document.createElement('span');
    kind.className = 'kind';
    kind.textContent = entry.type === 'dir'
      ? t('tree.dir')
      : (entry.editable ? t('tree.text') : t('tree.binary'));

    const filePath = document.createElement('span');
    filePath.className = 'path';
    filePath.textContent = entry.path;

    button.append(kind, filePath);
    if (entry.type === 'file') {
      button.addEventListener('click', () => openFile(entry.path));
    } else {
      button.disabled = true;
    }
    elements.fileTree.append(button);
  }
}

function renderMainFileSelect() {
  const project = getCurrentProject();
  const texFiles = (state.projectState?.tree || []).filter((entry) => entry.type === 'file' && entry.path.endsWith('.tex'));
  elements.mainFileSelect.innerHTML = '';

  if (!texFiles.length) {
    const option = document.createElement('option');
    option.textContent = t('main_file.none');
    option.value = '';
    elements.mainFileSelect.append(option);
    elements.mainFileSelect.disabled = true;
  } else {
    elements.mainFileSelect.disabled = false;
    for (const entry of texFiles) {
      const option = document.createElement('option');
      option.value = entry.path;
      option.textContent = entry.path;
      option.selected = entry.path === project?.mainFile;
      elements.mainFileSelect.append(option);
    }
  }
}

function renderEditor() {
  const project = getCurrentProject();
  elements.engineSelect.value = project?.engine || 'xelatex';
  elements.compileModeBadge.textContent = project ? t('compile.mode', { mode: project.compileMode }) : '';
  elements.deleteFileButton.disabled = !state.currentFilePath;
  elements.saveButton.disabled = !state.currentFileEditable || !state.dirty;
  elements.compileButton.disabled = !state.currentProjectId || state.compileInFlight;
  elements.exportButton.disabled = !state.currentProjectId;
  elements.editor.readOnly = !state.currentFileEditable;
  elements.editorStateLabel.textContent = state.currentFileEditable
    ? (state.dirty ? t('editor.unsaved') : t('editor.editable'))
    : t('app.read_only');

  if (!state.currentFilePath) {
    elements.currentFileLabel.textContent = t('app.no_file_selected');
    elements.fileAccessLink.classList.add('hidden');
    elements.fileAccessLink.removeAttribute('href');
    elements.editor.value = '';
    return;
  }

  elements.currentFileLabel.textContent = state.currentFilePath;
}

function formatIssueItem(item, level) {
  if (level === 'error') {
    return item.file ? `${item.file}:${item.line ?? '?'} ${item.message}` : item.message;
  }

  if (level === 'warning') {
    if (item.code === 'missing_glyphs') {
      return t('compile.warning.missing_glyphs', { chars: item.characters.join(' ') });
    }
    if (item.code === 'latin_fallback') {
      return t('compile.warning.latin_fallback');
    }
    if (item.code === 'missing_package') {
      return t('compile.warning.missing_package', { packageName: item.packageName });
    }
    return JSON.stringify(item);
  }

  if (item.code === 'switch_to_xelatex') {
    return t('compile.hint.switch_to_xelatex');
  }
  if (item.code === 'configure_cjk_support') {
    return t('compile.hint.configure_cjk_support');
  }
  if (item.code === 'fontspec_requires_unicode_engine') {
    return t('compile.hint.fontspec_requires_unicode');
  }
  if (item.code === 'fontspec_not_enough_for_cjk') {
    return t('compile.hint.fontspec_not_enough_for_cjk');
  }
  if (item.code === 'set_cjk_font_family') {
    return t('compile.hint.set_cjk_font_family');
  }
  if (item.code === 'use_installed_cjk_fonts') {
    return t('compile.hint.use_installed_cjk_fonts');
  }
  return JSON.stringify(item);
}

function renderCompileOutput(result = state.lastCompileResult) {
  state.lastCompileResult = {
    success: result.success ?? null,
    errors: result.errors || [],
    warnings: result.warnings || [],
    hints: result.hints || [],
    logText: result.logText || ''
  };

  elements.compileErrors.innerHTML = '';

  const appendIssue = (level, item) => {
    const row = document.createElement('li');
    row.className = level;
    row.textContent = `${t(`compile.item.${level}`)}: ${formatIssueItem(item, level)}`;
    elements.compileErrors.append(row);
  };

  for (const error of state.lastCompileResult.errors) {
    appendIssue('error', error);
  }
  for (const warning of state.lastCompileResult.warnings) {
    appendIssue('warning', warning);
  }
  for (const hint of state.lastCompileResult.hints) {
    appendIssue('hint', hint);
  }

  elements.compileLog.textContent = state.lastCompileResult.logText || t('editor.no_output');
}

function updateCompileSummary(success, warningsCount) {
  if (success === null) {
    elements.compileSummary.textContent = '';
    return;
  }
  if (success && warningsCount > 0) {
    elements.compileSummary.textContent = t('summary.success_warnings');
    return;
  }
  elements.compileSummary.textContent = success ? t('summary.success') : t('summary.failed');
}

function updatePreview(previewUrl, available) {
  if (available && previewUrl) {
    elements.previewFrame.src = previewUrl;
    elements.previewFrame.classList.remove('hidden');
    elements.previewPlaceholder.classList.add('hidden');
    elements.previewLabel.textContent = t('preview.ready');
  } else {
    elements.previewFrame.src = 'about:blank';
    elements.previewFrame.classList.add('hidden');
    elements.previewPlaceholder.classList.remove('hidden');
    elements.previewLabel.textContent = t('preview.none');
  }
}

async function openFile(filePath, { silent = false } = {}) {
  if (state.dirty && state.currentFileEditable) {
    const shouldSave = window.confirm(t('prompt.unsaved_switch'));
    if (shouldSave) {
      const saved = await saveCurrentFile();
      if (!saved) {
        return;
      }
    } else {
      state.dirty = false;
    }
  }

  try {
    const file = await apiRequest(`/api/projects/${state.currentProjectId}/file?path=${encodeURIComponent(filePath)}`);
    state.currentFilePath = file.path;
    state.currentFileEditable = Boolean(file.editable);
    state.dirty = false;
    if (file.editable) {
      elements.editor.value = file.content || '';
      elements.fileAccessLink.classList.add('hidden');
      elements.fileAccessLink.removeAttribute('href');
      if (!silent) {
        showBanner(t('banner.opened_file', { path: file.path }), 'info');
      }
    } else {
      elements.editor.value = '';
      elements.fileAccessLink.href = file.downloadUrl;
      elements.fileAccessLink.classList.remove('hidden');
      const reason = file.tooLarge ? t('binary.too_large') : t('binary.not_editable');
      if (!silent) {
        showBanner(t('banner.binary_file', { reason }), 'info');
      }
    }
    renderFileTree();
    renderEditor();
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

async function fetchBootstrap() {
  state.bootstrap = await apiRequest('/api/bootstrap');
  state.projects = state.bootstrap.projects || [];

  if (state.bootstrap.authEnabled && !state.bootstrap.currentUser) {
    window.location.href = '/login';
    return false;
  }

  state.onboardingVisible = Boolean(state.bootstrap.showOnboarding);
  state.guideModalOpen = state.onboardingVisible;
  state.currentProjectId = state.projects[0]?.id || state.bootstrap.selectedProjectId || null;
  renderSession();
  renderProjects();
  return true;
}

async function loadProjectState({ preserveFile = true } = {}) {
  if (!state.currentProjectId) {
    state.projectState = null;
    state.currentFilePath = null;
    state.currentFileEditable = false;
    renderProjects();
    renderFileTree();
    renderMainFileSelect();
    renderEditor();
    updatePreview('', false);
    return;
  }

  state.projectState = await apiRequest(`/api/projects/${state.currentProjectId}/state`);
  state.projects = getProjectOptions().map((project) => (
    project.id === state.currentProjectId ? state.projectState.project : project
  ));
  renderSession();
  renderProjects();
  renderFileTree();
  renderMainFileSelect();
  renderEditor();
  updatePreview(
    `${state.projectState.previewUrl}?ts=${state.projectState.project.lastCompileAt || Date.now()}`,
    state.projectState.previewAvailable
  );

  const chosenPath = preserveFile && getCurrentFileEntry()
    ? state.currentFilePath
    : (
      state.projectState.project.mainFile ||
      state.projectState.tree.find((entry) => entry.type === 'file' && entry.editable)?.path ||
      state.projectState.tree.find((entry) => entry.type === 'file')?.path ||
      null
    );

  if (chosenPath) {
    await openFile(chosenPath, { silent: true });
  } else {
    state.currentFilePath = null;
    state.currentFileEditable = false;
    elements.editor.value = '';
    renderEditor();
  }
}

async function refreshProjectsList() {
  const payload = await apiRequest('/api/projects');
  state.projects = payload.projects || [];
  if (!state.projects.some((project) => project.id === state.currentProjectId)) {
    state.currentProjectId = state.projects[0]?.id || null;
  }
  renderProjects();
}

async function saveCurrentFile() {
  if (!state.currentProjectId || !state.currentFilePath || !state.currentFileEditable) {
    return true;
  }

  if (!state.dirty) {
    return true;
  }

  try {
    const payload = await apiRequest(`/api/projects/${state.currentProjectId}/file`, {
      method: 'PUT',
      body: JSON.stringify({
        path: state.currentFilePath,
        content: elements.editor.value
      })
    });
    state.dirty = false;
    showBanner(t('banner.saved_file', { path: payload.path }), 'success');
    await loadProjectState({ preserveFile: true });
    return true;
  } catch (error) {
    showBanner(error.message, 'error');
    return false;
  }
}

function queueAutoCompile() {
  if (!state.autoCompile || !state.currentFileEditable) {
    return;
  }

  clearTimeout(state.compileTimer);
  state.compileTimer = window.setTimeout(() => {
    compileProject(true);
  }, 1200);
}

async function compileProject(fromAuto = false) {
  if (!state.currentProjectId) {
    return;
  }

  if (state.compileInFlight) {
    if (fromAuto) {
      state.pendingCompile = true;
    }
    return;
  }

  state.compileInFlight = true;
  elements.compileButton.disabled = true;
  elements.compileSummary.textContent = t('summary.compiling');
  showBanner(t('banner.running_compile'), 'info');

  try {
    const payload = {};
    if (state.currentFileEditable && state.currentFilePath && state.dirty) {
      payload.currentFile = state.currentFilePath;
      payload.currentContent = elements.editor.value;
    }

    const result = await apiRequest(`/api/projects/${state.currentProjectId}/compile`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.dirty = false;
    renderCompileOutput(result);
    updateCompileSummary(result.success, result.warnings?.length || 0);
    updatePreview(result.previewUrl, result.previewAvailable);

    if (result.engineAdjusted) {
      showBanner(t('banner.engine_auto_switched', { engine: result.engineUsed }), 'success');
      openMenu('build', 'logs');
    } else if (result.success && (result.warnings?.length || 0) > 0) {
      showBanner(t('banner.compile_success_warnings'), 'info');
      openMenu('build', 'logs');
    } else {
      showBanner(result.success ? t('banner.compile_success') : t('banner.compile_failed'), result.success ? 'success' : 'error');
      if (!result.success) {
        openMenu('build', 'logs');
      }
    }

    await loadProjectState({ preserveFile: true });
  } catch (error) {
    elements.compileSummary.textContent = t('summary.failed');
    showBanner(error.message, 'error');
    openMenu('build', 'logs');
  } finally {
    state.compileInFlight = false;
    renderEditor();
    if (state.pendingCompile) {
      state.pendingCompile = false;
      compileProject(true);
    }
  }
}

async function createProject() {
  const name = window.prompt(t('prompt.new_project'), t('default.untitled_project'));
  if (!name) {
    return;
  }
  try {
    const payload = await apiRequest('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    await refreshProjectsList();
    state.currentProjectId = payload.project.id;
    await loadProjectState({ preserveFile: false });
    showBanner(t('banner.created_project', { name: payload.project.name }), 'success');
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

async function renameProject() {
  const project = getCurrentProject();
  if (!project) {
    return;
  }
  const name = window.prompt(t('prompt.rename_project'), project.name);
  if (!name) {
    return;
  }
  try {
    await apiRequest(`/api/projects/${project.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    });
    await refreshProjectsList();
    await loadProjectState({ preserveFile: true });
    showBanner(t('banner.renamed_project'), 'success');
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

async function deleteProject() {
  const project = getCurrentProject();
  if (!project) {
    return;
  }
  if (!window.confirm(t('prompt.delete_project', { name: project.name }))) {
    return;
  }
  try {
    await apiRequest(`/api/projects/${project.id}`, { method: 'DELETE' });
    await refreshProjectsList();
    await loadProjectState({ preserveFile: false });
    showBanner(t('banner.deleted_project'), 'success');
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

async function createFile() {
  if (!state.currentProjectId) {
    return;
  }
  const pathValue = window.prompt(t('prompt.new_file'), t('default.new_file'));
  if (!pathValue) {
    return;
  }
  try {
    await apiRequest(`/api/projects/${state.currentProjectId}/files/create`, {
      method: 'POST',
      body: JSON.stringify({
        path: pathValue,
        content: pathValue.endsWith('.tex') ? t('default.new_section') : ''
      })
    });
    await loadProjectState({ preserveFile: false });
    openMenu('files', 'explorer');
    await openFile(pathValue);
    showBanner(t('banner.created_file', { path: pathValue }), 'success');
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

async function deleteCurrentFile() {
  if (!state.currentProjectId || !state.currentFilePath) {
    return;
  }
  if (!window.confirm(t('prompt.delete_file', { path: state.currentFilePath }))) {
    return;
  }
  try {
    await apiRequest(`/api/projects/${state.currentProjectId}/file?path=${encodeURIComponent(state.currentFilePath)}`, {
      method: 'DELETE'
    });
    state.currentFilePath = null;
    state.currentFileEditable = false;
    state.dirty = false;
    await loadProjectState({ preserveFile: false });
    showBanner(t('banner.deleted_file'), 'success');
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

async function uploadFiles(fileList) {
  if (!state.currentProjectId || !fileList?.length) {
    return;
  }
  const formData = new FormData();
  const relativePaths = [];
  for (const file of fileList) {
    formData.append('files', file, file.name);
    relativePaths.push(file.webkitRelativePath || file.name);
  }
  formData.append('relativePaths', JSON.stringify(relativePaths));

  try {
    await apiRequest(`/api/projects/${state.currentProjectId}/upload`, {
      method: 'POST',
      body: formData
    });
    await loadProjectState({ preserveFile: true });
    openMenu('files', 'explorer');
    showBanner(t('banner.upload_complete'), 'success');
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

function openExportModal() {
  if (!state.bootstrap?.currentUser) {
    executeExport('download');
    return;
  }
  elements.exportSaveButton.classList.remove('hidden');
  elements.exportModal.classList.remove('hidden');
}

function closeExportModal() {
  elements.exportModal.classList.add('hidden');
}

async function executeExport(action) {
  closeExportModal();
  if (!state.currentProjectId) {
    return;
  }
  try {
    const payload = await apiRequest(`/api/projects/${state.currentProjectId}/export`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
    if (action === 'download') {
      window.location.href = payload.downloadUrl;
      showBanner(t('banner.download_started'), 'success');
    } else {
      await loadProjectState({ preserveFile: true });
      showBanner(t('banner.saved_pdf', { path: payload.savedPath }), 'success');
    }
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

async function completeOnboarding() {
  try {
    if (state.onboardingVisible) {
      await apiRequest('/api/me/onboarding', {
        method: 'POST',
        body: JSON.stringify({})
      });
    }
  } catch (error) {
    showBanner(error.message, 'error');
  } finally {
    state.onboardingVisible = false;
    state.guideModalOpen = false;
    elements.guideModal.classList.add('hidden');
  }
}

function showGuideModal() {
  state.guideModalOpen = true;
  elements.guideModal.classList.remove('hidden');
}

function renderOnboarding() {
  elements.guideModal.classList.toggle('hidden', !(state.onboardingVisible || state.guideModalOpen));
}

function rerenderForLanguage() {
  renderSession();
  renderProjects();
  renderFileTree();
  renderMainFileSelect();
  renderEditor();
  renderCompileOutput();
  updateCompileSummary(state.lastCompileResult.success, state.lastCompileResult.warnings.length);
  if (state.projectState) {
    updatePreview(
      `${state.projectState.previewUrl}?ts=${state.projectState.project.lastCompileAt || Date.now()}`,
      state.projectState.previewAvailable
    );
  } else {
    updatePreview('', false);
  }
  renderMenuPanels();
  renderOnboarding();
}

function wireEvents() {
  elements.helpButton.addEventListener('click', showGuideModal);

  elements.loginButton.addEventListener('click', () => {
    window.location.href = '/login';
  });

  elements.logoutButton.addEventListener('click', async () => {
    await apiRequest('/api/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    window.location.href = '/login';
  });

  elements.adminButton.addEventListener('click', () => {
    window.location.href = '/admin';
  });

  elements.projectMenuButton.addEventListener('click', () => setOpenMenu('project'));
  elements.filesMenuButton.addEventListener('click', () => setOpenMenu('files'));
  elements.buildMenuButton.addEventListener('click', () => setOpenMenu('build'));
  elements.projectSubButtonSelect.addEventListener('click', () => setSubmenu('project', 'select'));
  elements.projectSubButtonManage.addEventListener('click', () => setSubmenu('project', 'manage'));
  elements.filesSubButtonActions.addEventListener('click', () => setSubmenu('files', 'actions'));
  elements.filesSubButtonExplorer.addEventListener('click', () => setSubmenu('files', 'explorer'));
  elements.buildSubButtonSettings.addEventListener('click', () => setSubmenu('build', 'settings'));
  elements.buildSubButtonLogs.addEventListener('click', () => setSubmenu('build', 'logs'));

  elements.projectSelect.addEventListener('change', async (event) => {
    state.currentProjectId = event.target.value;
    await loadProjectState({ preserveFile: false });
  });

  elements.newProjectButton.addEventListener('click', createProject);
  elements.renameProjectButton.addEventListener('click', renameProject);
  elements.deleteProjectButton.addEventListener('click', deleteProject);
  elements.newFileButton.addEventListener('click', createFile);
  elements.deleteFileButton.addEventListener('click', deleteCurrentFile);
  elements.saveButton.addEventListener('click', saveCurrentFile);
  elements.compileButton.addEventListener('click', () => compileProject(false));
  elements.exportButton.addEventListener('click', openExportModal);

  elements.uploadFilesButton.addEventListener('click', () => elements.fileUploadInput.click());
  elements.uploadFolderButton.addEventListener('click', () => elements.folderUploadInput.click());
  elements.fileUploadInput.addEventListener('change', async (event) => {
    await uploadFiles(event.target.files);
    event.target.value = '';
  });
  elements.folderUploadInput.addEventListener('change', async (event) => {
    await uploadFiles(event.target.files);
    event.target.value = '';
  });

  elements.engineSelect.addEventListener('change', async (event) => {
    try {
      await apiRequest(`/api/projects/${state.currentProjectId}/engine`, {
        method: 'POST',
        body: JSON.stringify({ engine: event.target.value })
      });
      await loadProjectState({ preserveFile: true });
      openMenu('build', 'settings');
      showBanner(t('banner.engine_updated'), 'success');
    } catch (error) {
      showBanner(error.message, 'error');
    }
  });

  elements.mainFileSelect.addEventListener('change', async (event) => {
    if (!event.target.value) {
      return;
    }
    try {
      await apiRequest(`/api/projects/${state.currentProjectId}/main-file`, {
        method: 'POST',
        body: JSON.stringify({ mainFile: event.target.value })
      });
      await loadProjectState({ preserveFile: true });
      openMenu('build', 'settings');
      showBanner(t('banner.main_file_updated'), 'success');
    } catch (error) {
      showBanner(error.message, 'error');
    }
  });

  elements.autoCompileToggle.addEventListener('change', (event) => {
    state.autoCompile = event.target.checked;
    localStorage.setItem('easy-latex:autoCompile', state.autoCompile ? '1' : '0');
    showBanner(state.autoCompile ? t('banner.auto_compile_on') : t('banner.auto_compile_off'), 'info');
  });

  elements.editor.addEventListener('input', () => {
    if (!state.currentFileEditable) {
      return;
    }
    state.dirty = true;
    renderEditor();
    queueAutoCompile();
  });

  elements.exportDownloadButton.addEventListener('click', () => executeExport('download'));
  elements.exportSaveButton.addEventListener('click', () => executeExport('save'));
  elements.exportCancelButton.addEventListener('click', closeExportModal);
  elements.exportModal.addEventListener('click', (event) => {
    if (event.target === elements.exportModal) {
      closeExportModal();
    }
  });
  elements.guideModal.addEventListener('click', (event) => {
    if (event.target === elements.guideModal && !state.onboardingVisible) {
      state.guideModalOpen = false;
      elements.guideModal.classList.add('hidden');
    }
  });

  elements.guideStartButton.addEventListener('click', completeOnboarding);

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (
      target.closest('.control-deck') ||
      target.closest('.modal-card') ||
      target.closest('.chrome-bar')
    ) {
      return;
    }
    state.openMenu = null;
    renderMenuPanels();
  });

  document.addEventListener('keydown', async (event) => {
    const target = event.target;
    const inEditableControl = target instanceof HTMLElement && Boolean(target.closest('input, textarea, select'));
    const metaOrCtrl = event.metaKey || event.ctrlKey;

    if (metaOrCtrl && event.key.toLowerCase() === 's') {
      event.preventDefault();
      await saveCurrentFile();
      return;
    }

    if (metaOrCtrl && event.key === 'Enter') {
      event.preventDefault();
      await compileProject(false);
      return;
    }

    if (metaOrCtrl && event.shiftKey && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      openExportModal();
      return;
    }

    if (event.key === '?') {
      event.preventDefault();
      showGuideModal();
      return;
    }

    if (event.key === 'Escape') {
      if (!elements.exportModal.classList.contains('hidden')) {
        closeExportModal();
        return;
      }
      if (!elements.guideModal.classList.contains('hidden') && !state.onboardingVisible) {
        state.guideModalOpen = false;
        elements.guideModal.classList.add('hidden');
        return;
      }
      if (state.openMenu) {
        state.openMenu = null;
        renderMenuPanels();
      }
      return;
    }

    if (inEditableControl || metaOrCtrl) {
      return;
    }

    if (event.altKey) {
      if (event.key === '1') {
        event.preventDefault();
        setOpenMenu('project');
      } else if (event.key === '2') {
        event.preventDefault();
        setOpenMenu('files');
      } else if (event.key === '3') {
        event.preventDefault();
        setOpenMenu('build');
      }
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) {
      return;
    }
    event.preventDefault();
    event.returnValue = '';
  });
}

async function init() {
  initLanguageToggle();
  onLanguageChange(rerenderForLanguage);
  wireEvents();
  try {
    const proceed = await fetchBootstrap();
    if (!proceed) {
      return;
    }
    await loadProjectState({ preserveFile: false });
    renderCompileOutput();
    renderMenuPanels();
    renderOnboarding();
    showBanner(t('banner.workspace_ready'), 'success');
  } catch (error) {
    showBanner(error.message, 'error');
  }
}

init();
