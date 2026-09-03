/**
 * DevForge — Learning trackers (C# and SQL)
 */

import * as db from './database.js';
import { LEARNING_STATUSES, escapeHtml } from './utils.js';

let sqlContainer = null;
let csharpContainer = null;

function renderTopicGrid(topics) {
  const sections = {};
  for (const t of topics) {
    const sec = t.section || 'General';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(t);
  }

  return Object.entries(sections).map(([section, items]) => `
    <div class="topic-section">
      <h3 class="topic-section-title">${escapeHtml(section)}</h3>
      <div class="topic-grid">
        ${items.map(t => `
          <div class="topic-item">
            <span class="topic-name">${escapeHtml(t.name)}</span>
            <select class="status-select" data-topic-id="${t.id}" aria-label="Status for ${escapeHtml(t.name)}">
              ${LEARNING_STATUSES.map(s => `
                <option value="${s.value}" ${t.status === s.value ? 'selected' : ''}>${s.label}</option>
              `).join('')}
            </select>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderProgressSummary(topics) {
  const total = topics.length;
  const counts = { not_started: 0, learning: 0, practicing: 0, comfortable: 0 };
  for (const t of topics) counts[t.status] = (counts[t.status] || 0) + 1;
  const pct = total > 0 ? Math.round((counts.comfortable / total) * 100) : 0;

  return `
    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-label">Comfortable</div>
        <div class="stat-value success">${counts.comfortable} / ${total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Practicing</div>
        <div class="stat-value accent">${counts.practicing}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Learning</div>
        <div class="stat-value warning">${counts.learning}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Not Started</div>
        <div class="stat-value">${counts.not_started}</div>
      </div>
    </div>
    <div class="progress-label"><span>Progress toward comfortable</span><span>${pct}%</span></div>
    <div class="progress-bar" style="margin-bottom: 1.5rem;"><div class="progress-fill success" style="width: ${pct}%"></div></div>
  `;
}

function bindTopicEvents(container) {
  container.querySelectorAll('.status-select').forEach(sel => {
    sel.addEventListener('change', (e) => {
      db.updateLearningTopic(Number(e.target.dataset.topicId), e.target.value);
    });
  });
}

export function renderSqlTracker() {
  sqlContainer = document.getElementById('sql-content');
  const topics = db.getLearningTopics('sql');

  sqlContainer.innerHTML = `
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9375rem;">
      Track your SQL learning journey. Status reflects your current comfort level — not objective mastery.
    </p>
    ${renderProgressSummary(topics)}
    ${renderTopicGrid(topics)}
  `;

  bindTopicEvents(sqlContainer);
}

export function renderCsharpTracker() {
  csharpContainer = document.getElementById('csharp-content');
  const topics = db.getLearningTopics('csharp');

  csharpContainer.innerHTML = `
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9375rem;">
      Track your C# learning progress across core language and framework concepts.
    </p>
    ${renderProgressSummary(topics)}
    ${renderTopicGrid(topics)}
  `;

  bindTopicEvents(csharpContainer);
}
