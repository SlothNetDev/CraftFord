# DevForge

A personal daily learning and coding dashboard for backend developers specializing in C#, ASP.NET Core, SQL Server, and the Tenant Management API project.

## Features

- **Dashboard** — Daily schedule, progress tracking, streak, and quick notes
- **Daily Tasks** — Create, edit, and complete learning tasks
- **Focus Timer** — Countdown timer with session tracking
- **Learning Notes** — Daily reflection journal
- **SQL Practice** — Topic tracker with learning status
- **C# Tracker** — Language concept progress
- **Tenant API Roadmap** — Project milestone tracker
- **Weekly Review** — End-of-week reflection and stats
- **History** — Browse past tasks, sessions, notes, and reviews
- **Backup** — Export/import JSON backups

## Tech Stack

- Plain HTML, CSS, JavaScript (no frameworks)
- SQLite via [sql.js](https://sql.js.org/) (WebAssembly)
- IndexedDB for browser persistence

## Getting Started

DevForge is a static site. Serve it with any static file server:

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve .

# PHP
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

> **Note:** A local server is required because ES modules and WASM need to be served over HTTP (not `file://`).

## Project Structure

```
index.html          Main HTML shell
css/                Stylesheets
js/                 JavaScript modules
  app.js            Application entry point
  database.js       SQLite data access layer
  dashboard.js      Dashboard view
  tasks.js          Daily tasks
  timer.js          Focus timer
  notes.js          Learning notes
  learning.js       C# and SQL trackers
  roadmap.js        Tenant API roadmap
  review.js         Weekly review
  history.js        History browser
  settings.js       Backup and settings
  schedule.js       Weekly schedule definitions
  utils.js          Shared utilities
data/               Static data assets
assets/             Images and icons
```

## Weekly Schedule

The app auto-generates daily tasks based on the day of the week:

| Day | Focus |
|-----|-------|
| Monday | C# Foundation, SQL, Tenant API |
| Tuesday | C# + SQL Deep Dive, Tenant API |
| Wednesday | ASP.NET Core, SQL, Tenant API |
| Thursday | C# Deep Dive, SQL Deep Dive, Tenant API |
| Friday | Integration, Testing, Tenant API |
| Saturday | Experiment Day (Docker, Azure, etc.) |
| Sunday | Weekly Review, Rest |

## Data Storage

All data is stored locally in your browser. No server or account required. Use **Settings → Export Backup** to create portable backups.

## License

Personal use.
