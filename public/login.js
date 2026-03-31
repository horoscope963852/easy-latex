import { initLanguageToggle, onLanguageChange, t } from '/static/i18n.js';

const elements = {
  form: document.getElementById('loginForm'),
  status: document.getElementById('loginStatus'),
  description: document.getElementById('loginDescription')
};

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

async function init() {
  initLanguageToggle();
  onLanguageChange(() => {
    if (!elements.description.dataset.dynamicText) {
      elements.description.textContent = t('login.description');
    }
  });

  try {
    const bootstrap = await apiRequest('/api/bootstrap');
    if (bootstrap.currentUser) {
      window.location.href = '/';
      return;
    }
    if (!bootstrap.authEnabled) {
      elements.description.dataset.dynamicText = '1';
      elements.description.textContent = t('login.description.optional');
      showStatus(t('login.status.guest_enabled'), 'success');
    } else {
      delete elements.description.dataset.dynamicText;
      elements.description.textContent = t('login.description');
      showStatus(t('login.status.required'), 'info');
    }
  } catch (error) {
    showStatus(error.message, 'error');
  }
}

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.form);
  try {
    showStatus(t('login.status.signing_in'), 'info');
    await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: formData.get('username'),
        password: formData.get('password')
      })
    });
    window.location.href = '/';
  } catch (error) {
    showStatus(error.message, 'error');
  }
});

init();
