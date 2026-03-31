import { initLanguageToggle, onLanguageChange, t } from '/static/i18n.js';

const elements = {
  status: document.getElementById('adminStatus'),
  logoutButton: document.getElementById('adminLogoutButton'),
  setupCard: document.getElementById('adminSetupCard'),
  setupForm: document.getElementById('adminSetupForm'),
  loginCard: document.getElementById('adminLoginCard'),
  loginForm: document.getElementById('adminLoginForm'),
  dashboard: document.getElementById('adminDashboard'),
  identity: document.getElementById('adminIdentity'),
  authToggle: document.getElementById('authToggle'),
  authToggleLabel: document.getElementById('authToggleLabel'),
  onlineCount: document.getElementById('onlineCount'),
  createUserForm: document.getElementById('createUserForm'),
  usersTableBody: document.getElementById('usersTableBody'),
  projectsTableBody: document.getElementById('projectsTableBody')
};

const state = {
  users: [],
  projects: [],
  adminUser: null,
  authEnabled: true
};

function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Number(bytes || 0);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function showStatus(message, tone = 'info') {
  elements.status.textContent = message;
  elements.status.className = `status-banner ${tone}`;
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

function setView(viewName) {
  elements.setupCard.classList.toggle('hidden', viewName !== 'setup');
  elements.loginCard.classList.toggle('hidden', viewName !== 'login');
  elements.dashboard.classList.toggle('hidden', viewName !== 'dashboard');
}

function renderUsers() {
  elements.usersTableBody.innerHTML = '';
  for (const user of state.users) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.isOnline ? t('admin.online') : t('admin.offline')}</td>
      <td>${user.projectCount ?? '-'}</td>
      <td>${formatBytes(user.usageBytes)} / ${formatBytes(user.quotaBytes)}</td>
      <td></td>
    `;
    const actions = document.createElement('div');
    actions.className = 'table-actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary danger';
    button.textContent = t('admin.delete');
    button.addEventListener('click', async () => {
      if (!window.confirm(t('admin.delete_user_prompt', { username: user.username }))) {
        return;
      }
      try {
        await apiRequest(`/api/admin/users/${user.id}`, { method: 'DELETE', body: JSON.stringify({}) });
        showStatus(t('admin.user_deleted', { username: user.username }), 'success');
        await loadState();
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });
    actions.append(button);
    row.lastElementChild.append(actions);
    elements.usersTableBody.append(row);
  }
}

function renderProjects() {
  elements.projectsTableBody.innerHTML = '';
  for (const project of state.projects) {
    const row = document.createElement('tr');
    const modeCell = document.createElement('td');
    row.innerHTML = `
      <td>${project.name}</td>
      <td>${project.ownerLabel}</td>
      <td>${project.engine}</td>
      <td>${project.mainFile || '—'}</td>
    `;
    const select = document.createElement('select');
    select.innerHTML = `
      <option value="safe">safe</option>
      <option value="relaxed">relaxed</option>
    `;
    select.value = project.compileMode;
    select.addEventListener('change', async () => {
      try {
        await apiRequest(`/api/admin/projects/${project.id}/mode`, {
          method: 'PATCH',
          body: JSON.stringify({ compileMode: select.value })
        });
        showStatus(t('admin.project_mode_updated', { name: project.name }), 'success');
      } catch (error) {
        showStatus(error.message, 'error');
      }
    });
    modeCell.append(select);
    row.append(modeCell);
    elements.projectsTableBody.append(row);
  }
}

function rerender() {
  if (state.adminUser) {
    elements.identity.textContent = t('admin.identity', { username: state.adminUser.username });
  }
  elements.authToggleLabel.textContent = state.authEnabled ? t('admin.enabled') : t('admin.disabled');
  renderUsers();
  renderProjects();
}

async function loadState() {
  try {
    const payload = await apiRequest('/api/admin/bootstrap');
    if (payload.needsSetup) {
      setView('setup');
      showStatus(t('admin.bootstrap_setup'), 'info');
      return;
    }
    if (payload.needsLogin) {
      setView('login');
      showStatus(t('admin.login_required'), 'info');
      return;
    }

    state.users = payload.users;
    state.projects = payload.projects;
    state.adminUser = payload.adminUser;
    state.authEnabled = Boolean(payload.authEnabled);

    setView('dashboard');
    elements.authToggle.checked = state.authEnabled;
    elements.onlineCount.textContent = String(payload.onlineUserCount);
    rerender();
    showStatus(t('admin.ready'), 'success');
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

elements.setupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.setupForm);
  try {
    showStatus(t('admin.creating_admin'), 'info');
    await apiRequest('/api/admin/setup', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password')
      })
    });
    await loadState();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

elements.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.loginForm);
  try {
    showStatus(t('admin.signing_in'), 'info');
    await apiRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password')
      })
    });
    await loadState();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

elements.authToggle.addEventListener('change', async (event) => {
  try {
    await apiRequest('/api/admin/settings/auth', {
      method: 'POST',
      body: JSON.stringify({ enabled: event.target.checked })
    });
    state.authEnabled = event.target.checked;
    elements.authToggleLabel.textContent = state.authEnabled ? t('admin.enabled') : t('admin.disabled');
    showStatus(state.authEnabled ? t('admin.auth_enabled') : t('admin.auth_disabled'), 'success');
  } catch (error) {
    event.target.checked = !event.target.checked;
    showStatus(error.message, 'error');
  }
});

elements.createUserForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.createUserForm);
  try {
    await apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password')
      })
    });
    elements.createUserForm.reset();
    showStatus(t('admin.user_created'), 'success');
    await loadState();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

elements.logoutButton.addEventListener('click', async () => {
  try {
    await apiRequest('/api/admin/logout', { method: 'POST', body: JSON.stringify({}) });
    await loadState();
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

initLanguageToggle();
onLanguageChange(rerender);
loadState();
