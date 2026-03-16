# Finance Planner

This repo contains a **FastAPI backend** (`backend/`) and a **Vite + React frontend** (`frontend/`).

## ✅ Deploying the Backend on Railway.app
1. Push this repo to GitHub.
2. In Railway.app, create a new project and connect your GitHub repo.
3. Add a **PostgreSQL database** to your project (Railway provides this for free).
4. Railway will auto-detect:
   - `Procfile` → runs `uvicorn backend.app.main:app`
   - `requirements.txt` → installs dependencies (including `psycopg2-binary` for PostgreSQL)
   - `runtime.txt` → Python version
5. Set environment variables in Railway dashboard:
   - `ALLOWED_ORIGINS` → your frontend URL (e.g. `https://your-frontend.vercel.app`)
   - Railway auto-sets `DATABASE_URL` for your PostgreSQL DB.
6. Deploy! Railway will build and run your app.

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

## 🌐 Frontend Deployment
Deploy the `frontend/` folder to a static host (Vercel / Netlify) and set `VITE_API_URL` to your Railway backend URL (e.g. `https://your-app.railway.app/api`).

---

If you want a single deploy target (one service for both frontend + backend), let me know and I can add a build step that outputs the frontend build into the backend static folder and serves it from FastAPI.
