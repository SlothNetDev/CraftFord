/**
 * DevForge — Settings module (backup & preferences)
 */

import * as db from './database.js';
import { logout, updateCredentials, getStoredUsername } from './auth.js';
import { getTheme, setTheme } from './theme.js';
import { showToast, toLocalISO, escapeHtml } from './utils.js';

let container = null;

export function renderSettings() {
  container = document.getElementById('settings-content');

  container.innerHTML = `
    <div class="settings-section card">
      <h3>Appearance</h3>
      <p>Choose your preferred color theme.</p>
      <div class="form-group">
        <label class="form-label" for="theme-select">Theme</label>
        <select id="theme-select" class="form-select" style="max-width: 240px;">
          <option value="dark" ${getTheme() === 'dark' ? 'selected' : ''}>Dark</option>
          <option value="light" ${getTheme() === 'light' ? 'selected' : ''}>Light</option>
        </select>
      </div>
    </div>

    <div class="settings-section card">
      <h3>Login Credentials</h3>
      <p>Change your local login username and password. Stored only in this browser.</p>
      <form id="credentials-form">
        <div class="form-group">
          <label class="form-label" for="cred-username">Username</label>
          <input type="text" id="cred-username" class="form-input" value="${escapeHtml(getStoredUsername())}" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="cred-password">New Password</label>
          <input type="password" id="cred-password" class="form-input" required minlength="4" autocomplete="new-password">
        </div>
        <button type="submit" class="btn btn-primary">Update Credentials</button>
      </form>
      <button class="btn btn-secondary" id="logout-btn" style="margin-top: 1rem;">Log Out</button>
    </div>

    <div class="settings-section card">
      <h3>Export Backup</h3>
      <p>Download all your learning data as a JSON file. Store it somewhere safe.</p>
      <button class="btn btn-primary" id="export-btn">Export Data</button>
    </div>

    <div class="settings-section card">
      <h3>Import Backup</h3>
      <p>Restore your data from a previously exported backup file. This will replace all current data.</p>
      <div class="file-input-wrapper">
        <button class="btn btn-secondary">Choose File</button>
        <input type="file" id="import-file" accept=".json,application/json">
      </div>
    </div>

    <div class="settings-section card">
      <h3>About DevForge</h3>
      <p style="font-size: 0.875rem; color: var(--text-secondary); line-height: 1.7;">
        DevForge is a personal daily learning and coding dashboard for backend developers.
        All data is stored locally in your browser using SQLite (WebAssembly) with IndexedDB persistence.
        No data is sent to any server.
      </p>
      <p style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.75rem;">
        Version 1.1 · Static frontend · SQLite WASM
      </p>
    </div>

    <div class="settings-section card" style="border-color: var(--danger);">
      <h3 style="color: var(--danger);">Danger Zone</h3>
      <p>Permanently delete all local data. This cannot be undone.</p>
      <button class="btn btn-danger" id="clear-data-btn">Clear All Data</button>
    </div>
  `;

  bindEvents();
}

function bindEvents() {
  document.getElementById('theme-select').addEventListener('change', (e) => {
    setTheme(e.target.value);
    showToast(`Theme set to ${e.target.value} mode`, 'info');
  });

  document.getElementById('credentials-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('cred-username').value.trim();
    const password = document.getElementById('cred-password').value;
    if (!username || password.length < 4) {
      showToast('Username and password (min 4 chars) required', 'error');
      return;
    }
    await updateCredentials(username, password);
    showToast('Credentials updated', 'success');
    document.getElementById('cred-password').value = '';
  });

  document.getElementById('logout-btn').addEventListener('click', () => logout());

  document.getElementById('export-btn').addEventListener('click', () => {
    const data = db.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devforge-backup-${toLocalISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported successfully', 'success');
  });

  document.getElementById('import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('Importing will replace all current data. Continue?')) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version) throw new Error('Invalid backup file');
      await db.importAllData(data);
      showToast('Data imported successfully. Reloading…', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      showToast('Import failed: ' + err.message, 'error');
      e.target.value = '';
    }
  });

  document.getElementById('clear-data-btn').addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;
    if (!confirm('Really delete everything? Consider exporting a backup first.')) return;

    indexedDB.deleteDatabase('devforge-db');
    showToast('Data cleared. Reloading…', 'info');
    setTimeout(() => window.location.reload(), 1000);
  });
}
