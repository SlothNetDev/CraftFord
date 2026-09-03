/**
 * DevForge — Learning Notes module
 */

import * as db from './database.js';
import {
  todayISO, formatDate, formatShortDate, escapeHtml, debounce, showToast, addDays
} from './utils.js';

let container = null;
let selectedDate = todayISO();

export function renderNotes() {
  container = document.getElementById('notes-content');
  const notes = db.getNotesByDate(selectedDate) || {
    learned: '', confused: '', built: '', review: ''
  };
  const allNotes = db.getAllNotes().filter(n => n.date !== selectedDate);

  container.innerHTML = `
    <div class="toolbar">
      <div class="form-group" style="margin-bottom: 0; min-width: 200px;">
        <label class="form-label" for="notes-date">Date</label>
        <input type="date" id="notes-date" class="form-input" value="${selectedDate}">
      </div>
      <div class="toolbar-actions">
        <button class="btn btn-secondary btn-sm" id="notes-prev">← Previous</button>
        <button class="btn btn-secondary btn-sm" id="notes-next" ${selectedDate >= todayISO() ? 'disabled' : ''}>Next →</button>
        <button class="btn btn-secondary btn-sm" id="notes-today">Today</button>
      </div>
    </div>

    <p style="color: var(--text-secondary); margin-bottom: 1.5rem; font-size: 0.9375rem;">
      ${formatDate(selectedDate)}
    </p>

    <div class="grid-2">
      <div class="card">
        <div class="form-group">
          <label class="form-label" for="notes-learned">What I learned</label>
          <textarea id="notes-learned" class="form-textarea" rows="5" placeholder="New concepts, patterns, or insights…">${escapeHtml(notes.learned)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="notes-confused">What confused me</label>
          <textarea id="notes-confused" class="form-textarea" rows="4" placeholder="Topics that need more study…">${escapeHtml(notes.confused)}</textarea>
        </div>
      </div>
      <div class="card">
        <div class="form-group">
          <label class="form-label" for="notes-built">What I built</label>
          <textarea id="notes-built" class="form-textarea" rows="5" placeholder="Code, features, or experiments…">${escapeHtml(notes.built)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label" for="notes-review">What I should review</label>
          <textarea id="notes-review" class="form-textarea" rows="4" placeholder="Topics to revisit…">${escapeHtml(notes.review)}</textarea>
        </div>
      </div>
    </div>

    <p id="notes-save-status" style="font-size: 0.8125rem; color: var(--text-muted); margin-top: 0.75rem;" aria-live="polite"></p>

    ${allNotes.length ? `
      <div class="card" style="margin-top: 1.5rem;">
        <div class="card-header">
          <span class="card-title">Previous Notes</span>
        </div>
        ${allNotes.slice(0, 10).map(n => renderNotePreview(n)).join('')}
      </div>
    ` : ''}
  `;

  bindEvents();
}

function renderNotePreview(note) {
  const hasContent = note.learned || note.confused || note.built || note.review;
  if (!hasContent) return '';

  const preview = note.learned || note.built || note.confused || note.review;
  return `
    <div class="history-item" style="cursor: pointer;" data-note-date="${note.date}">
      <div class="history-date">${formatShortDate(note.date)}</div>
      <p style="font-size: 0.875rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        ${escapeHtml(preview.substring(0, 120))}${preview.length > 120 ? '…' : ''}
      </p>
    </div>
  `;
}

function saveNotes() {
  const fields = {
    learned: document.getElementById('notes-learned').value,
    confused: document.getElementById('notes-confused').value,
    built: document.getElementById('notes-built').value,
    review: document.getElementById('notes-review').value
  };
  db.upsertNotes(selectedDate, fields);
  const status = document.getElementById('notes-save-status');
  if (status) {
    status.textContent = 'Saved';
    setTimeout(() => { status.textContent = ''; }, 2000);
  }
}

const debouncedSave = debounce(saveNotes, 600);

function bindEvents() {
  document.getElementById('notes-date').addEventListener('change', (e) => {
    saveNotes();
    selectedDate = e.target.value;
    renderNotes();
  });

  document.getElementById('notes-prev').addEventListener('click', () => {
    saveNotes();
    selectedDate = addDays(selectedDate, -1);
    renderNotes();
  });

  document.getElementById('notes-next').addEventListener('click', () => {
    saveNotes();
    selectedDate = addDays(selectedDate, 1);
    renderNotes();
  });

  document.getElementById('notes-today').addEventListener('click', () => {
    saveNotes();
    selectedDate = todayISO();
    renderNotes();
  });

  ['notes-learned', 'notes-confused', 'notes-built', 'notes-review'].forEach(id => {
    document.getElementById(id).addEventListener('input', debouncedSave);
  });

  container.querySelectorAll('[data-note-date]').forEach(el => {
    el.addEventListener('click', () => {
      saveNotes();
      selectedDate = el.dataset.noteDate;
      renderNotes();
    });
  });
}
