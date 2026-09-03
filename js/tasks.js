/**
 * DevForge — Daily Tasks module
 */

import * as db from './database.js';
import {
  todayISO, formatShortDate, CATEGORIES, categoryBadgeClass,
  escapeHtml, showModal, hideModal, showToast, getDayOfWeek
} from './utils.js';
import { getScheduleForDay } from './schedule.js';

let container = null;
let selectedDate = todayISO();

function ensureTasksForDate(date) {
  if (!db.hasTasksForDate(date)) {
    const schedule = getScheduleForDay(getDayOfWeek(date));
    if (schedule.length) db.seedDailyTasks(date, schedule);
  }
}

export function renderTasks() {
  container = document.getElementById('tasks-content');
  ensureTasksForDate(selectedDate);
  const tasks = db.getTasksByDate(selectedDate);

  container.innerHTML = `
    <div class="toolbar">
      <div class="filter-bar" style="margin-bottom: 0; flex: 1;">
        <div class="form-group">
          <label class="form-label" for="task-date">Date</label>
          <input type="date" id="task-date" class="form-input" value="${selectedDate}">
        </div>
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-primary" id="add-task-btn">+ Add Task</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">${formatShortDate(selectedDate)} — ${tasks.length} task${tasks.length !== 1 ? 's' : ''}</span>
        <span>${tasks.filter(t => t.completed).length} completed</span>
      </div>
      ${tasks.length ? renderTaskList(tasks) : renderEmpty()}
    </div>
  `;

  bindEvents();
}

function renderTaskList(tasks) {
  return `<ul class="task-list">
    ${tasks.map(t => `
      <li class="task-item">
        <label class="checkbox-label ${t.completed ? 'completed' : ''}">
          <input type="checkbox" data-action="toggle" data-id="${t.id}" ${t.completed ? 'checked' : ''}>
          <div class="task-info">
            <div class="task-title-text">${escapeHtml(t.title)}</div>
            <div class="task-meta">
              <span class="badge ${categoryBadgeClass(t.category)}">${escapeHtml(t.category)}</span>
              <span>${t.estimated_duration}m</span>
              ${t.description ? `<span title="${escapeHtml(t.description)}">ℹ</span>` : ''}
            </div>
            ${t.notes ? `<div class="task-meta" style="margin-top: 0.25rem; font-style: italic;">${escapeHtml(t.notes)}</div>` : ''}
          </div>
        </label>
        <div class="task-actions">
          <button class="btn btn-ghost btn-sm btn-icon" data-action="edit" data-id="${t.id}" title="Edit" aria-label="Edit task">✎</button>
          <button class="btn btn-ghost btn-sm btn-icon" data-action="delete" data-id="${t.id}" title="Delete" aria-label="Delete task">✕</button>
        </div>
      </li>
    `).join('')}
  </ul>`;
}

function renderEmpty() {
  return `<div class="empty-state">
    <div class="empty-state-icon">☑</div>
    <h3>No tasks for this date</h3>
    <p>Add a task or select another date.</p>
  </div>`;
}

function showTaskForm(task = null) {
  const isEdit = !!task;
  const title = isEdit ? 'Edit Task' : 'Add Task';

  const body = `
    <form id="task-form">
      <div class="form-group">
        <label class="form-label" for="task-title">Title</label>
        <input type="text" id="task-title" class="form-input" required value="${task ? escapeHtml(task.title) : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label" for="task-category">Category</label>
          <select id="task-category" class="form-select">
            ${CATEGORIES.map(c => `<option value="${c}" ${task?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="task-duration">Duration (minutes)</label>
          <input type="number" id="task-duration" class="form-input" min="5" step="5" value="${task?.estimated_duration || 30}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="task-description">Description</label>
        <textarea id="task-description" class="form-textarea">${task ? escapeHtml(task.description) : ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="task-notes">Notes</label>
        <textarea id="task-notes" class="form-textarea">${task ? escapeHtml(task.notes) : ''}</textarea>
      </div>
    </form>
  `;

  const footer = `
    <button class="btn btn-secondary modal-cancel">Cancel</button>
    <button class="btn btn-primary" id="task-save-btn">${isEdit ? 'Save Changes' : 'Add Task'}</button>
  `;

  showModal(title, body, footer);

  document.getElementById('task-save-btn').addEventListener('click', () => {
    const form = document.getElementById('task-form');
    if (!form.checkValidity()) { form.reportValidity(); return; }

    const data = {
      title: document.getElementById('task-title').value.trim(),
      category: document.getElementById('task-category').value,
      estimated_duration: parseInt(document.getElementById('task-duration').value, 10),
      description: document.getElementById('task-description').value.trim(),
      notes: document.getElementById('task-notes').value.trim()
    };

    if (isEdit) {
      db.updateTask(task.id, data);
      showToast('Task updated', 'success');
    } else {
      db.createTask({ ...data, date: selectedDate, completed: false });
      showToast('Task added', 'success');
    }

    hideModal();
    renderTasks();
  });

  document.querySelector('.modal-cancel').addEventListener('click', hideModal);
}

function bindEvents() {
  document.getElementById('task-date').addEventListener('change', (e) => {
    selectedDate = e.target.value;
    renderTasks();
  });

  document.getElementById('add-task-btn').addEventListener('click', () => showTaskForm());

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;

    if (action === 'edit') {
      showTaskForm(db.getTaskById(id));
    } else if (action === 'delete') {
      if (confirm('Delete this task?')) {
        db.deleteTask(id);
        showToast('Task deleted', 'info');
        renderTasks();
      }
    }
  });

  container.addEventListener('change', (e) => {
    if (e.target.matches('[data-action="toggle"]')) {
      db.toggleTaskComplete(Number(e.target.dataset.id));
      renderTasks();
    }
  });
}

export function getSelectedDate() {
  return selectedDate;
}

export function getTodayTasks() {
  return db.getTasksByDate(todayISO());
}
