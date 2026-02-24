# CLAW COMMAND CENTER

Personal Operating System — Pip-Boy Edition

A React-based personal dashboard that integrates health tracking, task management, training programming, family logistics, and AI-powered voice briefings into a single command center interface.

![React](https://img.shields.io/badge/React-19-blue) ![Python](https://img.shields.io/badge/Python-3.x-green) ![License](https://img.shields.io/badge/License-ISC-yellow)

## Features

- **Morning & Evening Briefings** — Automated daily briefings with voice synthesis via Piper TTS
- **Oura Ring Integration** — Sleep, readiness, activity scores, steps, calories, HRV, resting heart rate, and body temperature via local proxy server
- **Task Management** — Create, complete, and carry forward tasks with 7-day glide path tracking
- **Training Tracker** — 4-day/week strength training split (Mon/Tue/Thu/Fri) with weekly rotation
- **Health Logging** — Bodyweight, macros (protein/carbs/fat), water intake, and medication tracking
- **Family Logistics** — Custody week detection and calendar event management
- **News Feed** — Integrated news reader
- **PWA Support** — Installable as a progressive web app with service worker

## Project Structure

```
claw_command_center/
├── src/                  # React frontend
│   ├── App.jsx           # Main dashboard (all tabs)
│   └── index.jsx         # Entry point
├── core/                 # Python engines
│   ├── scheduler.py      # Scheduling logic
│   ├── task_engine.py    # Task management
│   ├── health_engine.py  # Health data processing
│   └── family_logic.py   # Custody & family calendar
├── memory/               # Persistent state (JSON)
│   ├── state.json        # Master state
│   ├── task_db.json      # Task history
│   └── health_log.json   # Health entries
├── config/               # User profile & rules
├── outputs/              # Generated briefings
├── voice/                # Piper TTS voice model
├── proxy_server.py       # Oura API proxy (port 5111)
└── voice_server.py       # TTS server
```

## Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **STAT** | Morning briefing with Oura scores, glide path, task status |
| **TASKS** | Task list with add/complete/carry-forward |
| **TRAIN** | Training program with exercise logging |
| **HEALTH** | Full Oura data, weight log, macros, water, meds |
| **MEDS** | Medication tracking and reminders |
| **CAL** | Calendar and upcoming events |
| **S/R** | Saved reports and briefing history |
| **FAM** | Family logistics and custody tracking |
| **BKST** | Bookmarks and saved links |
| **ASSIST** | AI assistant interface |
| **NEWS** | News feed |
| **SYS** | System settings and configuration |

## Setup

### Prerequisites

- Node.js 18+
- Python 3.x
- [Oura Ring](https://ouraring.com/) personal access token

### Install & Run

```bash
# Install dependencies
npm install

# Start the proxy server (Oura API)
python3 proxy_server.py &

# Start the React dev server
npm start
```

The dashboard will be available at `http://localhost:3000`.

### Oura Proxy

The proxy server runs on port 5111 and forwards requests to the Oura API. Set your Oura personal access token in the proxy server configuration.

## Built With

- [React 19](https://react.dev/) — UI framework
- [Create React App](https://create-react-app.dev/) — Build tooling
- [Piper TTS](https://github.com/rhasspy/piper) — Voice synthesis for briefings
- [Oura API v2](https://cloud.ouraring.com/v2/docs) — Health & activity data
