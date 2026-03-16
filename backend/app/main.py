# backend/app/main.py
from fastapi import FastAPI
from .api import router as api_router        # adjust to actual modules
from .db.database import Base, engine
from .db import models  # ensure models are imported so they are registered with SQLAlchemy
from fastapi.middleware.cors import CORSMiddleware

# Create tables
Base.metadata.create_all(bind=engine)
app = FastAPI(title="Finance Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Your Vite URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")

# add any startup/shutdown events, middleware, etc.