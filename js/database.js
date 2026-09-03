/**
 * DevForge — Database layer (SQLite WASM + IndexedDB persistence)
 *
 * Provides a clean data-access abstraction so the storage implementation
 * can be swapped later without changing consumer modules.
 */

const DB_NAME = 'devforge-db';
const DB_STORE = 'database';
const DB_KEY = 'sqlite';
const SCHEMA_VERSION = 1;

let db = null;
let SQL = null;
let savePending = false;

const SQL_TOPICS = {
  'Basic SQL': ['SELECT', 'WHERE', 'ORDER BY', 'INSERT', 'UPDATE', 'DELETE', 'NULL', 'CASE'],
  'Relationships': ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN'],
  'Aggregation': ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'GROUP BY', 'HAVING'],
  'Advanced': ['Subqueries', 'EXISTS', 'CTE', 'UNION', 'Window Functions'],
  'Database Engineering': ['Primary Keys', 'Foreign Keys', 'Constraints', 'Indexes', 'Execution Plans', 'Transactions', 'Isolation Levels']
};

const CSHARP_TOPICS = [
  'OOP', 'Classes', 'Interfaces', 'Abstract Classes', 'Inheritance', 'Composition',
  'Generics', 'Collections', 'Exceptions', 'Delegates', 'Events', 'Lambda Expressions',
  'LINQ', 'Records', 'Nullable Reference Types', 'Pattern Matching', 'Async/Await',
  'Task', 'CancellationToken', 'IEnumerable', 'IQueryable', 'IDisposable', 'IAsyncDisposable', 'Concurrency'
];

const ROADMAP_SECTIONS = {
  'Architecture': ['Clean Architecture', 'Dependency Injection', 'CQRS', 'Validation', 'Middleware', 'Logging'],
  'Database': ['EF Core', 'Code First', 'Migrations', 'Relationships', 'Indexes', 'Transactions', 'SQL optimization'],
  'Authentication': ['ASP.NET Core Identity', 'JWT', 'Access Tokens', 'Refresh Tokens', 'Refresh Token Rotation', 'Token Revocation', 'Authorization'],
  'Testing': ['Unit Tests', 'Integration Tests', 'Authentication Tests', 'Authorization Tests', 'Database Tests'],
  'Infrastructure': ['Docker', 'CI/CD', 'Azure', 'Deployment', 'Monitoring']
};

/* ── IndexedDB persistence ── */

function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function loadFromIDB() {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get(DB_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(data) {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(data, DB_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function scheduleSave() {
  if (savePending) return;
  savePending = true;
  requestAnimationFrame(async () => {
    savePending = false;
    if (!db) return;
    try {
      const data = db.export();
      await saveToIDB(data);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  });
}

/* ── Schema & migrations ── */

function getSchemaVersion() {
  try {
    const tables = db.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
    );
    if (!tables.length || !tables[0].values.length) return 0;

    const result = db.exec('SELECT version FROM schema_version LIMIT 1');
    if (!result.length || !result[0].values.length) return 0;
    return result[0].values[0][0];
  } catch {
    return 0;
  }
}

function runMigrations() {
  // Always ensure tables exist (handles fresh DB and partial/corrupt saves)
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);

    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      estimated_duration INTEGER DEFAULT 30,
      completed INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS coding_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT DEFAULT '',
      task_id INTEGER,
      task_title TEXT DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      learned TEXT DEFAULT '',
      confused TEXT DEFAULT '',
      built TEXT DEFAULT '',
      review TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learning_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      name TEXT NOT NULL,
      section TEXT DEFAULT '',
      status TEXT DEFAULT 'not_started',
      UNIQUE(track, name)
    );

    CREATE TABLE IF NOT EXISTS roadmap_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      UNIQUE(section, name)
    );

    CREATE TABLE IF NOT EXISTS weekly_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      week_end TEXT NOT NULL,
      total_coding_time INTEGER DEFAULT 0,
      total_tasks INTEGER DEFAULT 0,
      csharp_time INTEGER DEFAULT 0,
      sql_time INTEGER DEFAULT 0,
      tenant_time INTEGER DEFAULT 0,
      testing_time INTEGER DEFAULT 0,
      devops_time INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      achievement TEXT DEFAULT '',
      problem TEXT DEFAULT '',
      learned TEXT DEFAULT '',
      improve TEXT DEFAULT '',
      next_priority TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS quick_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT DEFAULT ''
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON daily_tasks(date);
    CREATE INDEX IF NOT EXISTS idx_sessions_date ON coding_sessions(date);
    CREATE INDEX IF NOT EXISTS idx_notes_date ON learning_notes(date);
  `);

  const current = getSchemaVersion();
  if (current >= SCHEMA_VERSION) return;

  db.run('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
}

function seedLearningTopics() {
  for (const [section, topics] of Object.entries(SQL_TOPICS)) {
    for (const name of topics) {
      db.run(
        'INSERT OR IGNORE INTO learning_topics (track, name, section) VALUES (?, ?, ?)',
        ['sql', name, section]
      );
    }
  }
  for (const name of CSHARP_TOPICS) {
    db.run(
      'INSERT OR IGNORE INTO learning_topics (track, name, section) VALUES (?, ?, ?)',
      ['csharp', name, '']
    );
  }
}

function seedRoadmapItems() {
  for (const [section, items] of Object.entries(ROADMAP_SECTIONS)) {
    for (const name of items) {
      db.run(
        'INSERT OR IGNORE INTO roadmap_items (section, name) VALUES (?, ?)',
        [section, name]
      );
    }
  }
}

/* ── Query helpers ── */

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function run(sql, params = []) {
  db.run(sql, params);
  scheduleSave();
  return db.getRowsModified();
}

function insert(sql, params = []) {
  db.run(sql, params);
  scheduleSave();
  const r = db.exec('SELECT last_insert_rowid()');
  return r[0].values[0][0];
}

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    estimated_duration: row.estimated_duration,
    completed: !!row.completed,
    date: row.date,
    notes: row.notes,
    created_at: row.created_at
  };
}

async function clearIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function initializeFreshDatabase() {
  db = new SQL.Database();
  runMigrations();
  seedLearningTopics();
  seedRoadmapItems();
  scheduleSave();
}

/* ── Public API ── */

export async function initDatabase() {
  SQL = await initSqlJs({
    locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  const saved = await loadFromIDB();

  try {
    if (saved) {
      db = new SQL.Database(saved);
    } else {
      db = new SQL.Database();
    }
    runMigrations();
    seedLearningTopics();
    seedRoadmapItems();
    scheduleSave();
  } catch (err) {
    console.warn('Database init failed, resetting local storage:', err);
    await clearIDB();
    initializeFreshDatabase();
  }

  return db;
}

export function exportDatabase() {
  if (!db) return null;
  return db.export();
}

export async function importDatabase(data) {
  if (!SQL) throw new Error('Database not initialized');
  db = new SQL.Database(data);
  runMigrations();
  seedLearningTopics();
  seedRoadmapItems();
  await saveToIDB(data);
}

/* ── Daily Tasks ── */

export function getTasksByDate(date) {
  return queryAll(
    'SELECT * FROM daily_tasks WHERE date = ? ORDER BY completed ASC, id ASC',
    [date]
  ).map(rowToTask);
}

export function getTaskById(id) {
  const row = queryOne('SELECT * FROM daily_tasks WHERE id = ?', [id]);
  return row ? rowToTask(row) : null;
}

export function createTask(task) {
  const id = insert(
    `INSERT INTO daily_tasks (title, category, description, estimated_duration, completed, date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      task.title,
      task.category,
      task.description || '',
      task.estimated_duration || 30,
      task.completed ? 1 : 0,
      task.date,
      task.notes || ''
    ]
  );
  return getTaskById(id);
}

export function updateTask(id, updates) {
  const fields = [];
  const params = [];
  for (const [key, val] of Object.entries(updates)) {
    if (key === 'id') continue;
    fields.push(`${key} = ?`);
    params.push(key === 'completed' ? (val ? 1 : 0) : val);
  }
  params.push(id);
  run(`UPDATE daily_tasks SET ${fields.join(', ')} WHERE id = ?`, params);
  return getTaskById(id);
}

export function deleteTask(id) {
  run('DELETE FROM daily_tasks WHERE id = ?', [id]);
}

export function toggleTaskComplete(id) {
  const task = getTaskById(id);
  if (!task) return null;
  return updateTask(id, { completed: !task.completed });
}

export function getTasksInRange(startDate, endDate) {
  return queryAll(
    'SELECT * FROM daily_tasks WHERE date >= ? AND date <= ? ORDER BY date DESC, id ASC',
    [startDate, endDate]
  ).map(rowToTask);
}

export function countCompletedTasks(date) {
  const r = queryOne(
    'SELECT COUNT(*) as total, SUM(completed) as done FROM daily_tasks WHERE date = ?',
    [date]
  );
  return { total: r?.total || 0, done: r?.done || 0 };
}

export function hasTasksForDate(date) {
  const r = queryOne('SELECT COUNT(*) as c FROM daily_tasks WHERE date = ?', [date]);
  return (r?.c || 0) > 0;
}

/* ── Coding Sessions ── */

export function createSession(session) {
  const id = insert(
    `INSERT INTO coding_sessions (category, task_id, task_title, start_time, end_time, duration, date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      session.category || '',
      session.task_id || null,
      session.task_title || '',
      session.start_time,
      session.end_time || null,
      session.duration || 0,
      session.date
    ]
  );
  return queryOne('SELECT * FROM coding_sessions WHERE id = ?', [id]);
}

export function getSessionsByDate(date) {
  return queryAll(
    'SELECT * FROM coding_sessions WHERE date = ? ORDER BY start_time DESC',
    [date]
  );
}

export function getTotalCodingTime(date) {
  const r = queryOne(
    'SELECT COALESCE(SUM(duration), 0) as total FROM coding_sessions WHERE date = ?',
    [date]
  );
  return r?.total || 0;
}

export function getCodingTimeByCategory(date) {
  return queryAll(
    `SELECT category, COALESCE(SUM(duration), 0) as total
     FROM coding_sessions WHERE date = ? GROUP BY category`,
    [date]
  );
}

export function getSessionsInRange(startDate, endDate) {
  return queryAll(
    'SELECT * FROM coding_sessions WHERE date >= ? AND date <= ? ORDER BY date DESC, start_time DESC',
    [startDate, endDate]
  );
}

export function getWeeklyCategoryTime(startDate, endDate) {
  return queryAll(
    `SELECT category, COALESCE(SUM(duration), 0) as total
     FROM coding_sessions WHERE date >= ? AND date <= ? GROUP BY category`,
    [startDate, endDate]
  );
}

/* ── Learning Notes ── */

export function getNotesByDate(date) {
  return queryOne('SELECT * FROM learning_notes WHERE date = ?', [date]);
}

export function upsertNotes(date, fields) {
  const existing = getNotesByDate(date);
  if (existing) {
    run(
      `UPDATE learning_notes SET learned=?, confused=?, built=?, review=?, updated_at=datetime('now') WHERE date=?`,
      [fields.learned || '', fields.confused || '', fields.built || '', fields.review || '', date]
    );
  } else {
    run(
      `INSERT INTO learning_notes (date, learned, confused, built, review) VALUES (?, ?, ?, ?, ?)`,
      [date, fields.learned || '', fields.confused || '', fields.built || '', fields.review || '']
    );
  }
  return getNotesByDate(date);
}

export function getAllNotes() {
  return queryAll('SELECT * FROM learning_notes ORDER BY date DESC');
}

export function getNotesInRange(startDate, endDate) {
  return queryAll(
    'SELECT * FROM learning_notes WHERE date >= ? AND date <= ? ORDER BY date DESC',
    [startDate, endDate]
  );
}

/* ── Quick Notes ── */

export function getQuickNotes(date) {
  const r = queryOne('SELECT content FROM quick_notes WHERE date = ?', [date]);
  return r?.content || '';
}

export function saveQuickNotes(date, content) {
  const existing = queryOne('SELECT id FROM quick_notes WHERE date = ?', [date]);
  if (existing) {
    run('UPDATE quick_notes SET content = ? WHERE date = ?', [content, date]);
  } else {
    run('INSERT INTO quick_notes (date, content) VALUES (?, ?)', [date, content]);
  }
}

/* ── Learning Topics ── */

export function getLearningTopics(track) {
  return queryAll(
    'SELECT * FROM learning_topics WHERE track = ? ORDER BY section, name',
    [track]
  );
}

export function updateLearningTopic(id, status) {
  run('UPDATE learning_topics SET status = ? WHERE id = ?', [status, id]);
}

/* ── Roadmap ── */

export function getRoadmapItems() {
  return queryAll('SELECT * FROM roadmap_items ORDER BY section, name');
}

export function updateRoadmapItem(id, status) {
  run('UPDATE roadmap_items SET status = ? WHERE id = ?', [status, id]);
}

/* ── Weekly Reviews ── */

export function getWeeklyReview(weekStart) {
  return queryOne('SELECT * FROM weekly_reviews WHERE week_start = ?', [weekStart]);
}

export function upsertWeeklyReview(review) {
  const existing = getWeeklyReview(review.week_start);
  if (existing) {
    run(
      `UPDATE weekly_reviews SET
        week_end=?, total_coding_time=?, total_tasks=?, csharp_time=?, sql_time=?,
        tenant_time=?, testing_time=?, devops_time=?, streak=?,
        achievement=?, problem=?, learned=?, improve=?, next_priority=?
       WHERE week_start=?`,
      [
        review.week_end, review.total_coding_time, review.total_tasks,
        review.csharp_time, review.sql_time, review.tenant_time,
        review.testing_time, review.devops_time, review.streak,
        review.achievement, review.problem, review.learned,
        review.improve, review.next_priority, review.week_start
      ]
    );
  } else {
    run(
      `INSERT INTO weekly_reviews (
        week_start, week_end, total_coding_time, total_tasks,
        csharp_time, sql_time, tenant_time, testing_time, devops_time, streak,
        achievement, problem, learned, improve, next_priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        review.week_start, review.week_end, review.total_coding_time, review.total_tasks,
        review.csharp_time, review.sql_time, review.tenant_time,
        review.testing_time, review.devops_time, review.streak,
        review.achievement, review.problem, review.learned,
        review.improve, review.next_priority
      ]
    );
  }
  return getWeeklyReview(review.week_start);
}

export function getAllWeeklyReviews() {
  return queryAll('SELECT * FROM weekly_reviews ORDER BY week_start DESC');
}

/* ── Streak ── */

export function calculateStreak() {
  const dates = queryAll(
    `SELECT DISTINCT date FROM daily_tasks WHERE completed = 1
     UNION
     SELECT DISTINCT date FROM coding_sessions WHERE duration > 0
     ORDER BY date DESC`
  ).map(r => r.date);

  if (!dates.length) return 0;

  const today = new Date().toISOString().split('T')[0];
  let streak = 0;
  let checkDate = today;

  const dateSet = new Set(dates);

  if (!dateSet.has(today)) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    checkDate = yesterday.toISOString().split('T')[0];
    if (!dateSet.has(checkDate)) return 0;
  }

  while (dateSet.has(checkDate)) {
    streak++;
    const d = new Date(checkDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().split('T')[0];
  }

  return streak;
}

/* ── Settings ── */

export function getSetting(key) {
  const r = queryOne('SELECT value FROM settings WHERE key = ?', [key]);
  return r?.value ?? null;
}

export function setSetting(key, value) {
  run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

/* ── Export/Import JSON ── */

export function exportAllData() {
  return {
    version: SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    daily_tasks: queryAll('SELECT * FROM daily_tasks'),
    coding_sessions: queryAll('SELECT * FROM coding_sessions'),
    learning_notes: queryAll('SELECT * FROM learning_notes'),
    learning_topics: queryAll('SELECT * FROM learning_topics'),
    roadmap_items: queryAll('SELECT * FROM roadmap_items'),
    weekly_reviews: queryAll('SELECT * FROM weekly_reviews'),
    settings: queryAll('SELECT * FROM settings'),
    quick_notes: queryAll('SELECT * FROM quick_notes')
  };
}

export async function importAllData(data) {
  const tables = [
    'daily_tasks', 'coding_sessions', 'learning_notes', 'learning_topics',
    'roadmap_items', 'weekly_reviews', 'settings', 'quick_notes'
  ];

  for (const table of tables) {
    run(`DELETE FROM ${table}`);
  }

  if (data.daily_tasks) {
    for (const row of data.daily_tasks) {
      run(
        `INSERT INTO daily_tasks (id, title, category, description, estimated_duration, completed, date, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.title, row.category, row.description, row.estimated_duration, row.completed, row.date, row.notes, row.created_at]
      );
    }
  }

  if (data.coding_sessions) {
    for (const row of data.coding_sessions) {
      run(
        `INSERT INTO coding_sessions (id, category, task_id, task_title, start_time, end_time, duration, date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.category, row.task_id, row.task_title, row.start_time, row.end_time, row.duration, row.date]
      );
    }
  }

  if (data.learning_notes) {
    for (const row of data.learning_notes) {
      run(
        `INSERT INTO learning_notes (id, date, learned, confused, built, review, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.date, row.learned, row.confused, row.built, row.review, row.updated_at]
      );
    }
  }

  if (data.learning_topics) {
    for (const row of data.learning_topics) {
      run(
        `INSERT OR REPLACE INTO learning_topics (id, track, name, section, status)
         VALUES (?, ?, ?, ?, ?)`,
        [row.id, row.track, row.name, row.section, row.status]
      );
    }
  }

  if (data.roadmap_items) {
    for (const row of data.roadmap_items) {
      run(
        `INSERT OR REPLACE INTO roadmap_items (id, section, name, status)
         VALUES (?, ?, ?, ?)`,
        [row.id, row.section, row.name, row.status]
      );
    }
  }

  if (data.weekly_reviews) {
    for (const row of data.weekly_reviews) {
      run(
        `INSERT INTO weekly_reviews (id, week_start, week_end, total_coding_time, total_tasks,
          csharp_time, sql_time, tenant_time, testing_time, devops_time, streak,
          achievement, problem, learned, improve, next_priority)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.week_start, row.week_end, row.total_coding_time, row.total_tasks,
         row.csharp_time, row.sql_time, row.tenant_time, row.testing_time, row.devops_time,
         row.streak, row.achievement, row.problem, row.learned, row.improve, row.next_priority]
      );
    }
  }

  if (data.settings) {
    for (const row of data.settings) {
      run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [row.key, row.value]);
    }
  }

  if (data.quick_notes) {
    for (const row of data.quick_notes) {
      run('INSERT INTO quick_notes (id, date, content) VALUES (?, ?, ?)', [row.id, row.date, row.content]);
    }
  }

  scheduleSave();
}

export function seedDailyTasks(date, tasks) {
  for (const t of tasks) {
    createTask({ ...t, date, completed: false });
  }
}
