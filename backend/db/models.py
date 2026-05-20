"""
SQLAlchemy ORM models.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, Float
from db.database import Base


def _new_uuid() -> str:
    return str(uuid.uuid4())


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String, primary_key=True, default=_new_uuid)
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    domain = Column(String, nullable=True)
    problem_type = Column(String, nullable=True)   # classification|regression|clustering|timeseries
    shape_rows = Column(Integer, nullable=True)
    shape_cols = Column(Integer, nullable=True)
    target_col = Column(String, nullable=True)
    winning_model = Column(String, nullable=True)
    name = Column(String, nullable=True)
    is_favorite = Column(Boolean, default=False)
    user_goals = Column(String, nullable=True)

    # Full results blob from ML runner
    results_json = Column(JSON, nullable=True)

    # EDA result from Gemini
    eda_result = Column(JSON, nullable=True)

    # Cached Gemini explanations: key = expertise_level
    explanations_cache = Column(JSON, nullable=True, default=dict)

    # Dataset profile produced by profiler service
    profile = Column(JSON, nullable=True)

    # File path on disk
    file_path = Column(String, nullable=True)
