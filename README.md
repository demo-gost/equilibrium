# Equilibrium — AI-Powered Student Workload Balancing Platform

> **Plan → Execute → Observe → Learn → Rebalance → Repeat**

Equilibrium is a production-grade adaptive workload management system for students. It continuously understands your tasks, deadlines, working patterns, and actual behavior, then dynamically creates and adjusts a realistic schedule using a fully closed-loop AI engine.

---

## 🏗 Architecture

```
frontend/       → React + Vite + TypeScript + Ionic + Tailwind CSS (PWA + Mobile)
backend/        → Node.js + Express + TypeScript + MongoDB
ml-service/     → Python + FastAPI + scikit-learn (Incremental ML)
```

```
┌────────────────────────────────────────────────────┐
│      Frontend (React + Ionic + Capacitor)          │
│  Dashboard · Schedule · Tasks · Analytics · Profile│
└────────────────────┬───────────────────────────────┘
                     │ REST API (JWT) + SSE Stream
┌────────────────────▼───────────────────────────────┐
│     Backend (Node.js + Express + TypeScript)       │
│  Auth · Tasks · Schedule Engine · Reschedule       │
│  Analytics · Feedback · SSE · EquilibriumEngine    │
└──────────┬──────────────────────┬──────────────────┘
           │ Mongoose             │ HTTP
  ┌────────▼──────────┐  ┌────────▼──────────────────┐
  │  MongoDB           │  │  Python ML Service        │
  │  (Atlas or local)  │  │  /predict/duration        │
  └───────────────────┘  │  /train (online retrain)  │
                          └───────────────────────────┘
```

---

## ✅ Completed Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Project scaffolding (React + Node + Python + Docker) | ✅ Done |
| 2 | Data models + JWT Auth (User, Task, ScheduleBlock, Feedback, TaskHistory, ActivityLog) | ✅ Done |
| 3 | Task CRUD + complete/extend/skip + frontend task manager | ✅ Done |
| 4 | Core scheduling engine (urgency scoring, sleep enforcement, breaks, buffers) | ✅ Done |
| 5 | Dynamic rescheduling (cascade delay, SSE push to frontend) | ✅ Done |
| 6 | Feedback system + analytics (completion rate, estimation error, vibe score) | ✅ Done |
| 7 | Python ML service (cold/warm/hot predictor, cold start rule-based) | ✅ Done |
| 8 | AI insights (personalized text explanations from analytics data) | ✅ Done |
| 9 | Mobile UI (Ionic tabs, Framer Motion, responsive PWA, Capacitor) | ✅ Done |
| 10 | **Autonomous Equilibrium Engine** (15-min cron: deviation detection, overload alerts, ML retraining) | ✅ Done |

---

## 🚀 Quick Start (Local Development — 3 Terminals)

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB running locally **or** a MongoDB Atlas connection string

### Step 1 — Setup backend environment

```powershell
cd backend
copy .env.example .env
# Open .env and set MONGODB_URI and JWT secrets
```

### Step 2 — Start Backend (Terminal 1)

```powershell
cd backend
npm install
npm run dev
# → http://localhost:5000
# → Health: http://localhost:5000/health
```

### Step 3 — Start Frontend (Terminal 2)

```powershell
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Step 4 — Start ML Service (Terminal 3)

```powershell
cd ml-service
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# → http://localhost:8000
# → Docs: http://localhost:8000/docs
```

### Step 5 — Open the App

Navigate to **http://localhost:5173**, register an account, and start adding tasks.

---

## 🐳 Docker Compose (One-Command Production)

No separate MongoDB needed — it's included.

```powershell
# 1. Create .env with JWT secrets (MongoDB included via container)
copy .env.example .env
# Edit .env — only JWT_SECRET and JWT_REFRESH_SECRET are required

# 2. Build and start all 4 services (Frontend + Backend + ML + MongoDB)
docker-compose up --build

# Services:
# Frontend  → http://localhost:3000
# Backend   → http://localhost:5000
# ML Docs   → http://localhost:8000/docs
# MongoDB   → localhost:27017 (internal)
```

**To use MongoDB Atlas instead of the local container**, set `MONGODB_URI` in `.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/equilibrium
```

---

## 📱 Mobile (Android / iOS via Capacitor)

```powershell
cd frontend
npm run build
npx cap sync

# Android (requires Android Studio)
npx cap run android

# iOS (requires Xcode on macOS)
npx cap run ios
```

---

## 🧠 How the AI Works

### ML Duration Predictor (3 stages)

| User History | Mode | Method |
|---|---|---|
| < 10 tasks | Cold Start | Rule-based multipliers (category + difficulty) |
| 10–30 tasks | Warm | Blend user estimate with personal historical average |
| 30+ tasks | Hot | Trained GradientBoostingRegressor with cyclical time features |

### Equilibrium Engine (Autonomous Cron)

Runs every **15 minutes**:
1. **Deviation detection** — if a scheduled block has slipped >30min, auto-reschedule
2. **Overload alert** — if upcoming 48h workload exceeds 130% of daily limit, push SSE warning
3. **ML retraining** — when 10+ new task completions accumulate, retrain the model automatically

Also runs at **23:45 every night** to pre-generate next-day schedules for all active users.

---

## 🔌 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with onboarding preferences |
| POST | `/api/auth/login` | Login → access + refresh tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |
| PUT | `/api/auth/me` | Update preferences (sleep, breaks, limits) |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks` | List tasks (optional `?status=` filter) |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/:id/complete` | Complete + capture actual duration |
| POST | `/api/tasks/:id/extend` | Extend + trigger auto-reschedule |
| POST | `/api/tasks/:id/skip` | Skip task |

### Schedule
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/schedule/generate` | Generate AI schedule for next N days |
| GET | `/api/schedule` | Get schedule blocks for date range |
| GET | `/api/schedule/today` | Get today's schedule |
| POST | `/api/schedule/reschedule` | Manual reschedule trigger |
| POST | `/api/schedule/protected-block` | Add fixed block (college, personal) |
| GET | `/api/schedule/sse?token=<jwt>` | Real-time SSE stream |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analytics/feedback` | Submit vibe/difficulty/workload feedback |
| GET | `/api/analytics/summary` | Completion rate, estimation error, adherence |
| GET | `/api/analytics/trends` | Weekly workload trend data |
| GET | `/api/analytics/insights` | AI-generated insight strings |

---

## 📊 North Star Metric

**Sustainable On-Time Completion Rate:**
```
Tasks completed on time (within sleep + break + workload constraints)
────────────────────────────────────────────────────────────────────
Total scheduled tasks
```

Target: > 80%

---

## 🗺 Roadmap (Future)

- [ ] Push notifications via Capacitor (task starting in 5min, deadline in 2h)
- [ ] Calendar integration (Google Calendar / iCal)
- [ ] Team/group task coordination
- [ ] Voice input for quick task capture
- [ ] Weekly AI report email
