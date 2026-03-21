# backend/app/main.py
from fastapi import FastAPI
from dotenv import load_dotenv
import os

from .api import router as api_router        # adjust to actual modules
from .db.database import Base, engine
from .db import models  # ensure models are imported so they are registered with SQLAlchemy
from fastapi.middleware.cors import CORSMiddleware

import cloudinary
import cloudinary.uploader

# Load environment variables from backend/.env (for local development)
load_dotenv()

# Schema is now managed by Alembic migrations
# Base.metadata.create_all(bind=engine)
app = FastAPI(title="Finance Planner API")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").strip()
if allowed_origins == "*":
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")

# add any startup/shutdown events, middleware, etc.

cloudinary.config( 
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
    api_key = os.getenv("CLOUDINARY_API_KEY"), 
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)