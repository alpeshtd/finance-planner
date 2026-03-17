# Finance Planner

This repo contains a **FastAPI backend** (`backend/`) and a **Vite + React frontend** (`frontend/`).

## ✅ Deploying the Backend on Render (with Neon PostgreSQL)
1. Push this repo to GitHub.
2. In Render, create a new **Web Service** and connect your GitHub repo.
3. Set the build command to:
   - `pip install -r requirements.txt`
   - (Render will run `uvicorn` via the `Procfile`)
4. Add a **Neon PostgreSQL** database (Render has a Neon integration) and copy the provided connection string.
5. In Render service settings, set these environment variables:
   - `DATABASE_URL` → the Neon connection string
   - `ALLOWED_ORIGINS` → your frontend URL (e.g. `https://your-frontend.vercel.app`)
6. Deploy! Render will build and run your app according to `Procfile`.

## ✅ Database migrations (production-safe)
This project now uses **Alembic** for schema migrations.

### Generate a new migration (local/dev)
```bash
alembic revision --autogenerate -m "Add my new table"
```

### Apply migrations (local/dev)
```bash
alembic upgrade head
```

### Apply migrations on Render
Set Render’s **Start Command** to run migrations before the server:
```bash
alembic upgrade head && uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT
```

(This ensures your schema stays in sync with your code when you deploy.)

## 🚀 Running Locally
### Backend
```bash
cd backend
python -m venv venv
# Activate venv (PowerShell): .\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Frontend Deployment (Vercel)
1. Deploy the `frontend/` folder to Vercel.
2. Set an environment variable in Vercel:
   - `VITE_API_URL` → your Render backend URL (e.g. `https://your-backend.onrender.com/api`).
3. The `vercel.json` file handles SPA routing (refreshes/scrolls won't 404).
4. Deploy and confirm the frontend can reach the backend.

---

If you want a single deploy target (one service for both frontend + backend), let me know and I can add a build step that outputs the frontend build into the backend static folder and serves it from FastAPI.
