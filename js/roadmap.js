/**
 * DevForge — Tenant API Roadmap module
 */

import * as db from './database.js';
import { ROADMAP_STATUSES, escapeHtml } from './utils.js';

let container = null;

export function renderRoadmap() {
  container = document.getElementById('roadmap-content');
  const items = db.getRoadmapItems();

  const sections = {};
  for (const item of items) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }

  const totalItems = items.length;
  const completed = items.filter(i => i.status === 'completed').length;
  const inProgress = items.filter(i => i.status === 'in_progress').length;
  const overallPct = totalItems > 0 ? Math.round((completed / totalItems) * 100) : 0;

  container.innerHTML = `
    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9375rem;">
      Track progress on the Tenant Management API project across architecture, database, auth, testing, and infrastructure.
    </p>

    <div class="grid-3" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-label">Completed</div>
        <div class="stat-value success">${completed} / ${totalItems}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">In Progress</div>
        <div class="stat-value accent">${inProgress}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Overall</div>
        <div class="stat-value">${overallPct}%</div>
      </div>
    </div>
    <div class="progress-bar" style="margin-bottom: 2rem;"><div class="progress-fill success" style="width: ${overallPct}%"></div></div>

    ${Object.entries(sections).map(([section, sectionItems]) => {
      const secCompleted = sectionItems.filter(i => i.status === 'completed').length;
      const secPct = sectionItems.length > 0 ? Math.round((secCompleted / sectionItems.length) * 100) : 0;
      return `
        <div class="roadmap-section card" style="margin-bottom: 1rem;">
          <div class="roadmap-progress">
            <h3 style="font-size: 1rem; font-weight: 600; flex: 1;">${escapeHtml(section)}</h3>
            <span class="roadmap-progress-text">${secCompleted}/${sectionItems.length}</span>
          </div>
          <div class="progress-bar" style="margin-bottom: 1rem;"><div class="progress-fill" style="width: ${secPct}%"></div></div>
          <div class="topic-grid">
            ${sectionItems.map(item => `
              <div class="topic-item">
                <span class="topic-name">${escapeHtml(item.name)}</span>
                <select class="status-select" data-roadmap-id="${item.id}" aria-label="Status for ${escapeHtml(item.name)}">
                  ${ROADMAP_STATUSES.map(s => `
                    <option value="${s.value}" ${item.status === s.value ? 'selected' : ''}>${s.label}</option>
                  `).join('')}
                </select>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('')}
  `;

  container.querySelectorAll('[data-roadmap-id]').forEach(sel => {
    sel.addEventListener('change', (e) => {
      db.updateRoadmapItem(Number(e.target.dataset.roadmapId), e.target.value);
    });
  });
}
