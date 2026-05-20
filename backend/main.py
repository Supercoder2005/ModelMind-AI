"""
ModelMind AI — FastAPI Application Entry Point

Runs on http://localhost:8000
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

load_dotenv()

from db.database import engine
from db import models as db_models
from routers import upload, analysis, models, explain, whatif, export

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all DB tables on startup
    db_models.Base.metadata.create_all(bind=engine)
    
    # Dynamically alter table for user_goals if not present
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE analyses ADD COLUMN user_goals VARCHAR"))
            conn.commit()
            logger.info("✅ Dynamically added user_goals column to analyses table")
        except Exception:
            pass

    logger.info("✅ Database tables ready")
    logger.info("🚀 ModelMind AI backend started — http://localhost:8000")
    yield
    logger.info("🛑 ModelMind AI backend shutting down")


app = FastAPI(
    title="ModelMind AI",
    description="Automated ML analysis platform powered by Advanced AI",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend only (no credentials/auth for now)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Static file serving for uploads (useful for dev debugging)
# ---------------------------------------------------------------------------
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
PREFIX = "/api/v1"

app.include_router(upload.router, prefix=PREFIX, tags=["Upload"])
app.include_router(analysis.router, prefix=PREFIX, tags=["Analysis"])
app.include_router(models.router, prefix=PREFIX, tags=["Models"])
app.include_router(explain.router, prefix=PREFIX, tags=["Explain"])
app.include_router(whatif.router, prefix=PREFIX, tags=["What-If"])
app.include_router(export.router, prefix=PREFIX, tags=["Export"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "ModelMind AI", "docs": "/docs"}
