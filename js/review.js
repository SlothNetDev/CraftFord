/**
 * DevForge — Weekly Review module
 */

import * as db from './database.js';
import {
  todayISO, formatShortDate, formatDuration, getWeekRange,
  escapeHtml, debounce
} from './utils.js';

let container = null;

function computeWeekStats(weekStart, weekEnd) {
  const sessions = db.getSessionsInRange(weekStart, weekEnd);
  const tasks = db.getTasksInRange(weekStart, weekEnd);
  const categoryTime = db.getWeeklyCategoryTime(weekStart, weekEnd);

  const catMap = {};
  for (const c of categoryTime) catMap[c.category] = c.total;

  return {
    total_coding_time: sessions.reduce((sum, s) => sum + s.duration, 0),
    total_tasks: tasks.filter(t => t.completed).length,
    csharp_time: catMap['C#'] || 0,
    sql_time: catMap['SQL'] || 0,
    tenant_time: catMap['Tenant API'] || 0,
    testing_time: catMap['Testing'] || 0,
    devops_time: catMap['DevOps'] || 0,
    streak: db.calculateStreak()
  };
}

export function renderReview() {
  container = document.getElementById('review-content');
  const { start, end } = getWeekRange(todayISO());
  const stats = computeWeekStats(start, end);
  const existing = db.getWeeklyReview(start) || {};

  const review = { ...stats, ...existing, week_start: start, week_end: end };

  container.innerHTML = `
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9375rem;">
      Week of ${formatShortDate(start)} – ${formatShortDate(end)}
    </p>

    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-label">Total Coding Time</div>
        <div class="stat-value success">${formatDuration(stats.total_coding_time)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tasks Completed</div>
        <div class="stat-value accent">${stats.total_tasks}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Current Streak</div>
        <div class="stat-value warning">${stats.streak} day${stats.streak !== 1 ? 's' : ''}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Tenant API Time</div>
        <div class="stat-value">${formatDuration(stats.tenant_time)}</div>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-label">C# Time</div>
        <div class="stat-value card-value-sm">${formatDuration(stats.csharp_time)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">SQL Time</div>
        <div class="stat-value card-value-sm">${formatDuration(stats.sql_time)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Testing + DevOps</div>
        <div class="stat-value card-value-sm">${formatDuration(stats.testing_time + stats.devops_time)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <span class="card-title">Weekly Reflection</span>
      </div>
      <div class="form-group">
        <label class="form-label" for="review-achievement">Biggest achievement</label>
        <textarea id="review-achievement" class="form-textarea" rows="3">${escapeHtml(review.achievement || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="review-problem">Biggest problem</label>
        <textarea id="review-problem" class="form-textarea" rows="3">${escapeHtml(review.problem || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="review-learned">What I learned</label>
        <textarea id="review-learned" class="form-textarea" rows="3">${escapeHtml(review.learned || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="review-improve">What I should improve</label>
        <textarea id="review-improve" class="form-textarea" rows="3">${escapeHtml(review.improve || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label" for="review-priority">Next week's priority</label>
        <textarea id="review-priority" class="form-textarea" rows="3">${escapeHtml(review.next_priority || '')}</textarea>
      </div>
      <p id="review-save-status" style="font-size: 0.8125rem; color: var(--text-muted);" aria-live="polite"></p>
    </div>

    ${renderPastReviews(start)}
  `;

  bindEvents(review);
}

function renderPastReviews(currentStart) {
  const reviews = db.getAllWeeklyReviews().filter(r => r.week_start !== currentStart);
  if (!reviews.length) return '';

  return `
    <div class="card" style="margin-top: 1.5rem;">
      <div class="card-header"><span class="card-title">Past Reviews</span></div>
      ${reviews.slice(0, 5).map(r => `
        <div class="history-item">
          <div class="history-date">${formatShortDate(r.week_start)} – ${formatShortDate(r.week_end)}</div>
          ${r.achievement ? `<p style="font-size: 0.875rem;"><strong>Achievement:</strong> ${escapeHtml(r.achievement)}</p>` : ''}
          ${r.next_priority ? `<p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;"><strong>Priority:</strong> ${escapeHtml(r.next_priority)}</p>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function saveReview(review) {
  const data = {
    ...review,
    achievement: document.getElementById('review-achievement').value,
    problem: document.getElementById('review-problem').value,
    learned: document.getElementById('review-learned').value,
    improve: document.getElementById('review-improve').value,
    next_priority: document.getElementById('review-priority').value
  };
  db.upsertWeeklyReview(data);
  const status = document.getElementById('review-save-status');
  if (status) {
    status.textContent = 'Saved';
    setTimeout(() => { status.textContent = ''; }, 2000);
  }
}

const debouncedSave = debounce((review) => saveReview(review), 600);

function bindEvents(review) {
  ['review-achievement', 'review-problem', 'review-learned', 'review-improve', 'review-priority'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => debouncedSave(review));
  });
}
