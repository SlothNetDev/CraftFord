/**
 * DevForge — Simple local auth (no API)
 */

const SESSION_KEY = 'devforge-session';
const AUTH_CONFIG_KEY = 'devforge-auth-config';

// Default: username "devforge", password "devforge"
const DEFAULT_USERNAME = 'devforge';
const DEFAULT_PASSWORD = 'devforge';

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAuthConfig() {
  try {
    const stored = localStorage.getItem(AUTH_CONFIG_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* use defaults */ }
  return null;
}

async function getExpectedCredentials() {
  const config = getAuthConfig();
  if (config?.username && config?.passwordHash) {
    return config;
  }
  return {
    username: DEFAULT_USERNAME,
    passwordHash: await hashPassword(DEFAULT_PASSWORD)
  };
}

export function isAuthenticated() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

export async function login(username, password) {
  const expected = await getExpectedCredentials();
  const hash = await hashPassword(password);

  if (username === expected.username && hash === expected.passwordHash) {
    sessionStorage.setItem(SESSION_KEY, '1');
    return true;
  }
  return false;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.reload();
}

export async function updateCredentials(username, password) {
  const passwordHash = await hashPassword(password);
  localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify({ username, passwordHash }));
}

export function getStoredUsername() {
  const config = getAuthConfig();
  return config?.username || DEFAULT_USERNAME;
}

export function showLoginScreen() {
  document.getElementById('login-screen')?.classList.remove('hidden');
  document.getElementById('app')?.classList.add('hidden');
}

export function hideLoginScreen() {
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app')?.classList.remove('hidden');
}

export function setupLoginForm(onSuccess) {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';

    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!username || !password) {
      errorEl.textContent = 'Enter username and password.';
      return;
    }

    const ok = await login(username, password);
    if (ok) {
      hideLoginScreen();
      onSuccess();
    } else {
      errorEl.textContent = 'Invalid username or password.';
    }
  });
}
