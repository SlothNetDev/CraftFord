/**
 * DevForge — Dashboard module
 */

import * as db from './database.js';
import {
  todayISO, formatDate, getDayOfWeek, formatDuration,
  categoryBadgeClass, escapeHtml, debounce
} from './utils.js';
import { getScheduleForDay, getDayFocus, getDayThemes } from './schedule.js';

let container = null;

function ensureTodayTasks(date) {
  if (!db.hasTasksForDate(date)) {
    const dayOfWeek = getDayOfWeek(date);
    const schedule = getScheduleForDay(dayOfWeek);
    if (schedule.length) {
      db.seedDailyTasks(date, schedule);
    }
  }
}

export function renderDashboard() {
  container = document.getElementById('dashboard-content');
  const date = todayISO();
  ensureTodayTasks(date);

  const dayOfWeek = getDayOfWeek(date);
  const themes = getDayThemes(dayOfWeek);
  const focus = getDayFocus(dayOfWeek);
  const tasks = db.getTasksByDate(date);
  const { total, done } = db.countCompletedTasks(date);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const codingTime = db.getTotalCodingTime(date);
  const streak = db.calculateStreak();
  const quickNotes = db.getQuickNotes(date);

  container.innerHTML = `
    <div class="dashboard-date">${formatDate(date)}</div>
    <div class="dashboard-day">${themes.name}</div>

    <div class="schedule-overview">
      <h3>Today's Focus</h3>
      <div class="schedule-tags">
        ${themes.themes.map(t => `<span class="schedule-tag">${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>

    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-label">Completion</div>
        <div class="stat-value accent">${pct}%</div>
        <div class="progress-bar"><div class="progress-fill ${pct === 100 ? 'success' : ''}" style="width: ${pct}%"></div></div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tasks Done</div>
        <div class="stat-value">${done} / ${total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Coding Time</div>
        <div class="stat-value success">${formatDuration(codingTime)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Streak</div>
        <div class="stat-value warning">${streak} day${streak !== 1 ? 's' : ''}</div>
      </div>
    </div>

    <div class="focus-cards">
      <div class="focus-card">
        <div class="focus-card-label badge badge-csharp">C# Focus</div>
        <div class="focus-card-value">${escapeHtml(focus.csharp)}</div>
      </div>
      <div class="focus-card">
        <div class="focus-card-label badge badge-sql">SQL Focus</div>
        <div class="focus-card-value">${escapeHtml(focus.sql)}</div>
      </div>
      <div class="focus-card">
        <div class="focus-card-label badge badge-tenant">Tenant API Focus</div>
        <div class="focus-card-value">${escapeHtml(focus.tenant)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Today's Schedule</span>
          <a href="#tasks" class="btn btn-ghost btn-sm nav-link" data-section="tasks">View All</a>
        </div>
        ${tasks.length ? renderTaskList(tasks) : renderEmptyTasks()}
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Quick Notes</span>
        </div>
        <textarea
          id="quick-notes-input"
          class="quick-notes-area"
          placeholder="Jot down quick thoughts for today…"
          aria-label="Quick notes for today"
        >${escapeHtml(quickNotes)}</textarea>
        ${codingTime >= 420 ? '<div class="health-reminder">You\'ve logged 7+ hours today. Consider wrapping up and reviewing your progress.</div>' : ''}
      </div>
    </div>
  `;

  bindEvents();
}

function renderTaskList(tasks) {
  return `<ul class="task-list">
    ${tasks.map(t => `
      <li class="task-item">
        <label class="checkbox-label ${t.completed ? 'completed' : ''}">
          <input type="checkbox" data-task-id="${t.id}" ${t.completed ? 'checked' : ''} aria-label="Mark ${escapeHtml(t.title)} complete">
          <div class="task-info">
            <div class="task-title-text">${escapeHtml(t.title)}</div>
            <div class="task-meta">
              <span class="badge ${categoryBadgeClass(t.category)}">${escapeHtml(t.category)}</span>
              <span>${t.estimated_duration}m</span>
            </div>
          </div>
        </label>
      </li>
    `).join('')}
  </ul>`;
}

function renderEmptyTasks() {
  return `<div class="empty-state">
    <div class="empty-state-icon">☑</div>
    <h3>No tasks for today</h3>
    <p>Tasks are auto-generated from your weekly schedule. Add custom tasks in Daily Tasks.</p>
  </div>`;
}

function bindEvents() {
  container.querySelectorAll('input[data-task-id]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      db.toggleTaskComplete(Number(e.target.dataset.taskId));
      renderDashboard();
    });
  });

  const notesInput = document.getElementById('quick-notes-input');
  if (notesInput) {
    notesInput.addEventListener('input', debounce((e) => {
      db.saveQuickNotes(todayISO(), e.target.value);
    }, 500));
  }
}

export function refreshDashboard() {
  if (container) renderDashboard();
}
