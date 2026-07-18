# backend/app/main.py
from fastapi import FastAPI
from dotenv import load_dotenv
import os

from .api import router as api_router        # adjust to actual modules
from .db.database import Base, engine
from .db import models  # ensure models are imported so they are registered with SQLAlchemy
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

# Create tables automatically for local development when Alembic is unavailable.
Base.metadata.create_all(bind=engine)


def ensure_baby_movement_schema() -> None:
    inspector = inspect(engine)
    if not inspector.has_table("baby_movement_entries"):
        return

    existing_columns = {column["name"] for column in inspector.get_columns("baby_movement_entries")}
    if "movement_count" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE baby_movement_entries ADD COLUMN movement_count INTEGER NOT NULL DEFAULT 0")
            )

    if "meal_type" not in existing_columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE baby_movement_entries ADD COLUMN meal_type TEXT")
            )


ensure_baby_movement_schema()

try:
    import cloudinary
    import cloudinary.uploader
except ModuleNotFoundError:  # pragma: no cover - optional dependency for uploads
    cloudinary = None

# Load environment variables from backend/.env (for local development)
load_dotenv()

app = FastAPI(title="Finance Planner API")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").strip()
if allowed_origins == "*":
    allow_origins = ["*"]
else:
    allow_origins = [o.strip() for o in allowed_origins.split(",") if o.strip()]
    # Allow both localhost and 127.0.0.1 for common dev URLs
    if "http://localhost:5173" in allow_origins and "http://127.0.0.1:5173" not in allow_origins:
        allow_origins.append("http://127.0.0.1:5173")
    elif "http://127.0.0.1:5173" in allow_origins and "http://localhost:5173" not in allow_origins:
        allow_origins.append("http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router, prefix="/api")

# add any startup/shutdown events, middleware, etc.

if cloudinary is not None:
    cloudinary.config( 
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
        api_key = os.getenv("CLOUDINARY_API_KEY"), 
        api_secret = os.getenv("CLOUDINARY_API_SECRET"),
        secure=True
    )