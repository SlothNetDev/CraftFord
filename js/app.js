/**
 * DevForge — Main application entry point
 */

import { initDatabase } from './database.js';
import { renderDashboard, refreshDashboard, updateDashboardClock } from './dashboard.js';
import { renderTasks } from './tasks.js';
import { renderTimer } from './timer.js';
import { renderNotes } from './notes.js';
import { renderSqlTracker, renderCsharpTracker } from './learning.js';
import { renderRoadmap } from './roadmap.js';
import { renderReview } from './review.js';
import { renderHistory } from './history.js';
import { renderSettings } from './settings.js';
import { isAuthenticated, setupLoginForm, showLoginScreen } from './auth.js';
import { initTheme, setupThemeToggle } from './theme.js';
import { hideModal, todayISO } from './utils.js';

const sections = {
  dashboard: { render: renderDashboard, el: 'section-dashboard' },
  tasks: { render: renderTasks, el: 'section-tasks' },
  timer: { render: renderTimer, el: 'section-timer' },
  notes: { render: renderNotes, el: 'section-notes' },
  sql: { render: renderSqlTracker, el: 'section-sql' },
  csharp: { render: renderCsharpTracker, el: 'section-csharp' },
  roadmap: { render: renderRoadmap, el: 'section-roadmap' },
  review: { render: renderReview, el: 'section-review' },
  history: { render: renderHistory, el: 'section-history' },
  settings: { render: renderSettings, el: 'section-settings' }
};

let currentSection = 'dashboard';
let lastKnownDate = todayISO();
let clockInterval = null;

function navigateTo(sectionId) {
  if (!sections[sectionId]) return;
  currentSection = sectionId;

  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(sections[sectionId].el).classList.add('active');

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });

  sections[sectionId].render();

  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }

  history.replaceState(null, '', `#${sectionId}`);
}

function handleHashChange() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigateTo(sections[hash] ? hash : 'dashboard');
}

function setupNavigation() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('.nav-link[data-section]');
    if (!link) return;
    e.preventDefault();
    navigateTo(link.dataset.section);
  });

  window.addEventListener('hashchange', handleHashChange);
}

function setupSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        e.target !== toggle) {
      sidebar.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function setupModal() {
  document.querySelector('.modal-close').addEventListener('click', hideModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideModal();
  });
}

function setupLiveClock() {
  updateDashboardClock();
  if (clockInterval) clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    updateDashboardClock();

    const currentDate = todayISO();
    if (currentDate !== lastKnownDate) {
      lastKnownDate = currentDate;
      sections[currentSection]?.render();
    }
  }, 1000);
}

async function startApp() {
  try {
    document.getElementById('app').classList.remove('hidden');
    await initDatabase();
    setupNavigation();
    setupSidebar();
    setupModal();
    initTheme();
    setupThemeToggle();
    setupLiveClock();

    const hash = window.location.hash.slice(1);
    navigateTo(sections[hash] ? hash : 'dashboard');

    document.getElementById('loading-screen').classList.add('hidden');
  } catch (err) {
    console.error('Failed to initialize DevForge:', err);
    document.getElementById('loading-screen').innerHTML = `
      <div class="loading-content">
        <p style="color: var(--danger);">Failed to initialize DevForge.</p>
        <p style="font-size: 0.875rem; margin-top: 0.5rem;">${err.message}</p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; margin-top: 1rem;">
          <button class="btn btn-primary" onclick="location.reload()">Retry</button>
          <button class="btn btn-danger" id="reset-db-btn">Reset Local Data</button>
        </div>
      </div>
    `;
    document.getElementById('reset-db-btn')?.addEventListener('click', async () => {
      await new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase('devforge-db');
        req.onsuccess = resolve;
        req.onerror = reject;
      });
      location.reload();
    });
  }
}

async function init() {
  document.getElementById('loading-screen').classList.remove('hidden');

  if (!isAuthenticated()) {
    document.getElementById('loading-screen').classList.add('hidden');
    showLoginScreen();
    setupLoginForm(startApp);
    return;
  }

  await startApp();
}

document.addEventListener('DOMContentLoaded', init);

export { navigateTo, refreshDashboard };
