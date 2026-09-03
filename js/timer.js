/**
 * DevForge — Focus Timer module
 */

import * as db from './database.js';
import {
  todayISO, formatDuration, formatTime, CATEGORIES,
  categoryBadgeClass, escapeHtml, showToast
} from './utils.js';
import { getTodayTasks } from './tasks.js';

let container = null;
let timerInterval = null;
let remainingSeconds = 0;
let totalSeconds = 0;
let isRunning = false;
let isPaused = false;
let sessionStart = null;
let selectedCategory = 'C#';
let selectedTaskId = null;
let selectedTaskTitle = '';

const DEFAULT_MINUTES = 25;

export function renderTimer() {
  container = document.getElementById('timer-content');
  const today = todayISO();
  const sessions = db.getSessionsByDate(today);
  const totalTime = db.getTotalCodingTime(today);
  const tasks = getTodayTasks();

  if (remainingSeconds === 0 && !isRunning && !isPaused) {
    remainingSeconds = DEFAULT_MINUTES * 60;
    totalSeconds = remainingSeconds;
  }

  container.innerHTML = `
    <div class="grid-2">
      <div class="card">
        <div class="timer-setup">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="timer-category">Category</label>
              <select id="timer-category" class="form-select" ${isRunning ? 'disabled' : ''}>
                ${CATEGORIES.map(c => `<option value="${c}" ${c === selectedCategory ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="timer-task">Task (optional)</label>
              <select id="timer-task" class="form-select" ${isRunning ? 'disabled' : ''}>
                <option value="">— None —</option>
                ${tasks.map(t => `<option value="${t.id}" data-title="${escapeHtml(t.title)}" ${t.id === selectedTaskId ? 'selected' : ''}>${escapeHtml(t.title)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="timer-minutes">Duration (minutes)</label>
            <input type="number" id="timer-minutes" class="form-input" min="1" max="180" value="${Math.ceil(totalSeconds / 60) || DEFAULT_MINUTES}" ${isRunning ? 'disabled' : ''}>
          </div>
        </div>

        <div class="timer-display ${getTimerClass()}" id="timer-display">${formatTimerDisplay(remainingSeconds)}</div>

        <div class="timer-controls">
          ${!isRunning && !isPaused ? `
            <button class="btn btn-primary btn-lg" id="timer-start">Start</button>
          ` : isPaused ? `
            <button class="btn btn-primary btn-lg" id="timer-resume">Resume</button>
          ` : `
            <button class="btn btn-secondary btn-lg" id="timer-pause">Pause</button>
          `}
          <button class="btn btn-secondary" id="timer-reset" ${!isRunning && !isPaused && remainingSeconds === totalSeconds ? 'disabled' : ''}>Reset</button>
        </div>

        <div class="health-reminder" style="margin-top: 1.5rem; text-align: center;">
          Target: 5–7 hours of focused work per day. It's okay to stop and review.
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Today's Sessions</span>
          <span class="stat-value-sm" style="color: var(--success);">${formatDuration(totalTime)}</span>
        </div>
        ${sessions.length ? renderSessions(sessions) : `
          <div class="empty-state" style="padding: 2rem 1rem;">
            <div class="empty-state-icon">⏱</div>
            <h3>No sessions yet</h3>
            <p>Start a focus timer to track your coding time.</p>
          </div>
        `}
      </div>
    </div>
  `;

  bindEvents();
}

function renderSessions(sessions) {
  return `<div>
    ${sessions.map(s => `
      <div class="session-item">
        <div>
          <span class="badge ${categoryBadgeClass(s.category)}">${escapeHtml(s.category)}</span>
          ${s.task_title ? `<span style="margin-left: 0.5rem; color: var(--text-secondary);">${escapeHtml(s.task_title)}</span>` : ''}
          <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.125rem;">
            ${formatTime(s.start_time)}${s.end_time ? ' – ' + formatTime(s.end_time) : ''}
          </div>
        </div>
        <span class="session-duration">${formatDuration(s.duration)}</span>
      </div>
    `).join('')}
  </div>`;
}

function formatTimerDisplay(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getTimerClass() {
  if (remainingSeconds <= 60 && (isRunning || isPaused)) return 'danger';
  if (remainingSeconds <= 300 && (isRunning || isPaused)) return 'warning';
  return '';
}

function updateDisplay() {
  const display = document.getElementById('timer-display');
  if (display) {
    display.textContent = formatTimerDisplay(remainingSeconds);
    display.className = `timer-display ${getTimerClass()}`;
  }
}

function startTimer() {
  const minutes = parseInt(document.getElementById('timer-minutes').value, 10) || DEFAULT_MINUTES;
  selectedCategory = document.getElementById('timer-category').value;
  const taskSelect = document.getElementById('timer-task');
  selectedTaskId = taskSelect.value ? Number(taskSelect.value) : null;
  selectedTaskTitle = taskSelect.selectedOptions[0]?.dataset?.title || '';

  if (!isPaused) {
    remainingSeconds = minutes * 60;
    totalSeconds = remainingSeconds;
    sessionStart = new Date().toISOString();
  }

  isRunning = true;
  isPaused = false;

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateDisplay();

    if (remainingSeconds <= 0) {
      completeSession();
    }
  }, 1000);

  renderTimer();
}

function pauseTimer() {
  isRunning = false;
  isPaused = true;
  clearInterval(timerInterval);
  renderTimer();
}

function resetTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  isPaused = false;
  sessionStart = null;
  const minutes = parseInt(document.getElementById('timer-minutes')?.value, 10) || DEFAULT_MINUTES;
  remainingSeconds = minutes * 60;
  totalSeconds = remainingSeconds;
  renderTimer();
}

function completeSession() {
  clearInterval(timerInterval);
  isRunning = false;
  isPaused = false;

  const endTime = new Date().toISOString();
  const durationMinutes = Math.round(totalSeconds / 60);

  db.createSession({
    category: selectedCategory,
    task_id: selectedTaskId,
    task_title: selectedTaskTitle,
    start_time: sessionStart,
    end_time: endTime,
    duration: durationMinutes,
    date: todayISO()
  });

  showToast(`Session complete! ${formatDuration(durationMinutes)} logged.`, 'success');

  sessionStart = null;
  remainingSeconds = DEFAULT_MINUTES * 60;
  totalSeconds = remainingSeconds;
  renderTimer();
}

function bindEvents() {
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resumeBtn = document.getElementById('timer-resume');
  const resetBtn = document.getElementById('timer-reset');

  if (startBtn) startBtn.addEventListener('click', startTimer);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
  if (resumeBtn) resumeBtn.addEventListener('click', startTimer);
  if (resetBtn) resetBtn.addEventListener('click', resetTimer);

  const minutesInput = document.getElementById('timer-minutes');
  if (minutesInput && !isRunning && !isPaused) {
    minutesInput.addEventListener('change', (e) => {
      remainingSeconds = parseInt(e.target.value, 10) * 60;
      totalSeconds = remainingSeconds;
      updateDisplay();
    });
  }
}

export function isTimerActive() {
  return isRunning;
}

export function refreshTimer() {
  if (container) renderTimer();
}
