/**
 * DevForge — History module
 */

import * as db from './database.js';
import {
  todayISO, formatShortDate, formatDuration, formatTime,
  categoryBadgeClass, escapeHtml, CATEGORIES, addDays
} from './utils.js';

let container = null;
let activeTab = 'tasks';
let filterCategory = '';
let filterStart = addDays(todayISO(), -30);
let filterEnd = todayISO();

export function renderHistory() {
  container = document.getElementById('history-content');

  container.innerHTML = `
    <div class="tabs" role="tablist">
      <button class="tab ${activeTab === 'tasks' ? 'active' : ''}" data-tab="tasks" role="tab">Tasks</button>
      <button class="tab ${activeTab === 'sessions' ? 'active' : ''}" data-tab="sessions" role="tab">Sessions</button>
      <button class="tab ${activeTab === 'notes' ? 'active' : ''}" data-tab="notes" role="tab">Notes</button>
      <button class="tab ${activeTab === 'reviews' ? 'active' : ''}" data-tab="reviews" role="tab">Reviews</button>
    </div>

    <div class="filter-bar">
      <div class="form-group">
        <label class="form-label" for="history-start">From</label>
        <input type="date" id="history-start" class="form-input" value="${filterStart}">
      </div>
      <div class="form-group">
        <label class="form-label" for="history-end">To</label>
        <input type="date" id="history-end" class="form-input" value="${filterEnd}">
      </div>
      ${activeTab === 'tasks' || activeTab === 'sessions' ? `
        <div class="form-group">
          <label class="form-label" for="history-category">Category</label>
          <select id="history-category" class="form-select">
            <option value="">All categories</option>
            ${CATEGORIES.map(c => `<option value="${c}" ${filterCategory === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      ` : ''}
      <div class="form-group" style="flex: 0;">
        <label class="form-label">&nbsp;</label>
        <button class="btn btn-secondary" id="history-apply">Apply</button>
      </div>
    </div>

    <div class="card" id="history-results">
      ${renderTabContent()}
    </div>
  `;

  bindEvents();
}

function renderTabContent() {
  switch (activeTab) {
    case 'tasks': return renderTasksHistory();
    case 'sessions': return renderSessionsHistory();
    case 'notes': return renderNotesHistory();
    case 'reviews': return renderReviewsHistory();
    default: return '';
  }
}

function renderTasksHistory() {
  let tasks = db.getTasksInRange(filterStart, filterEnd);
  if (filterCategory) tasks = tasks.filter(t => t.category === filterCategory);

  if (!tasks.length) return emptyState('No tasks found for this period.');

  const byDate = groupByDate(tasks);
  return Object.entries(byDate).map(([date, items]) => `
    <div class="history-item">
      <div class="history-date">${formatShortDate(date)} — ${items.filter(t => t.completed).length}/${items.length} completed</div>
      ${items.map(t => `
        <div style="display: flex; align-items: center; gap: 0.5rem; padding: 0.375rem 0; font-size: 0.875rem;">
          <span>${t.completed ? '✓' : '○'}</span>
          <span class="badge ${categoryBadgeClass(t.category)}">${escapeHtml(t.category)}</span>
          <span ${t.completed ? 'style="text-decoration: line-through; color: var(--text-muted);"' : ''}>${escapeHtml(t.title)}</span>
          <span style="color: var(--text-muted); margin-left: auto;">${t.estimated_duration}m</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderSessionsHistory() {
  let sessions = db.getSessionsInRange(filterStart, filterEnd);
  if (filterCategory) sessions = sessions.filter(s => s.category === filterCategory);

  if (!sessions.length) return emptyState('No coding sessions found for this period.');

  const byDate = groupByDate(sessions);
  return Object.entries(byDate).map(([date, items]) => {
    const dayTotal = items.reduce((s, i) => s + i.duration, 0);
    return `
      <div class="history-item">
        <div class="history-date">${formatShortDate(date)} — ${formatDuration(dayTotal)}</div>
        ${items.map(s => `
          <div class="session-item" style="padding-left: 0; padding-right: 0;">
            <div>
              <span class="badge ${categoryBadgeClass(s.category)}">${escapeHtml(s.category)}</span>
              ${s.task_title ? `<span style="margin-left: 0.5rem;">${escapeHtml(s.task_title)}</span>` : ''}
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.5rem;">${formatTime(s.start_time)}</span>
            </div>
            <span class="session-duration">${formatDuration(s.duration)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function renderNotesHistory() {
  const notes = db.getNotesInRange(filterStart, filterEnd);
  const withContent = notes.filter(n => n.learned || n.confused || n.built || n.review);

  if (!withContent.length) return emptyState('No learning notes found for this period.');

  return withContent.map(n => `
    <div class="history-item">
      <div class="history-date">${formatShortDate(n.date)}</div>
      ${n.learned ? `<p style="font-size: 0.875rem; margin-bottom: 0.375rem;"><strong>Learned:</strong> ${escapeHtml(n.learned)}</p>` : ''}
      ${n.confused ? `<p style="font-size: 0.875rem; margin-bottom: 0.375rem;"><strong>Confused:</strong> ${escapeHtml(n.confused)}</p>` : ''}
      ${n.built ? `<p style="font-size: 0.875rem; margin-bottom: 0.375rem;"><strong>Built:</strong> ${escapeHtml(n.built)}</p>` : ''}
      ${n.review ? `<p style="font-size: 0.875rem;"><strong>Review:</strong> ${escapeHtml(n.review)}</p>` : ''}
    </div>
  `).join('');
}

function renderReviewsHistory() {
  const reviews = db.getAllWeeklyReviews().filter(r =>
    r.week_start >= filterStart && r.week_start <= filterEnd
  );

  if (!reviews.length) return emptyState('No weekly reviews found for this period.');

  return reviews.map(r => `
    <div class="history-item">
      <div class="history-date">${formatShortDate(r.week_start)} – ${formatShortDate(r.week_end)}</div>
      <div style="display: flex; gap: 1.5rem; font-size: 0.8125rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
        <span>Time: ${formatDuration(r.total_coding_time)}</span>
        <span>Tasks: ${r.total_tasks}</span>
        <span>Streak: ${r.streak}</span>
      </div>
      ${r.achievement ? `<p style="font-size: 0.875rem;"><strong>Achievement:</strong> ${escapeHtml(r.achievement)}</p>` : ''}
      ${r.problem ? `<p style="font-size: 0.875rem; margin-top: 0.25rem;"><strong>Problem:</strong> ${escapeHtml(r.problem)}</p>` : ''}
      ${r.next_priority ? `<p style="font-size: 0.875rem; margin-top: 0.25rem;"><strong>Next priority:</strong> ${escapeHtml(r.next_priority)}</p>` : ''}
    </div>
  `).join('');
}

function groupByDate(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  }
  return groups;
}

function emptyState(msg) {
  return `<div class="empty-state"><p>${msg}</p></div>`;
}

function bindEvents() {
  container.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      renderHistory();
    });
  });

  document.getElementById('history-apply').addEventListener('click', () => {
    filterStart = document.getElementById('history-start').value;
    filterEnd = document.getElementById('history-end').value;
    const catEl = document.getElementById('history-category');
    filterCategory = catEl ? catEl.value : '';
    document.getElementById('history-results').innerHTML = renderTabContent();
  });
}
