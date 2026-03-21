from __future__ import with_statement

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

from dotenv import load_dotenv

# 1. Load the .env file
load_dotenv()

# Add the project root to the Python path so backend can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# this is the Alembic Config object, which provides access to the values within the .ini file
config = context.config

# Interpret the config file for Python logging.
fileConfig(config.config_file_name)

# Import your models here so `target_metadata` includes them.
from backend.app.db.database import Base  # noqa: E402
from backend.app.db import models  # noqa: F401

# Set the SQLAlchemy URL from DATABASE_URL env var if available
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

target_metadata = Base.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode."""
    
    # 2. Get the URL from environment variables
    url = os.getenv("DATABASE_URL")
    
    # 3. Small fix for Render/Postgres compatibility
    if url and url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    # 4. Create the engine using the dynamic URL
    # This overrides whatever is written in alembic.ini
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        url=url,  # <--- This is the most important line
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
