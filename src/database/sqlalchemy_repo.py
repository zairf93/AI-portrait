import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import create_engine, MetaData, Table, Column, String, Text, TIMESTAMP, JSON, select, insert, update
from .base import BaseRepository

class SQLAlchemyRepository(BaseRepository):
    def __init__(self, db_url: str):
        connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        self.engine = create_engine(db_url, connect_args=connect_args, future=True)
        self.metadata = MetaData()
        
        self.models_table = Table(
            "models", self.metadata,
            Column("id", String, primary_key=True),
            Column("image_paths", JSON, nullable=False),
        )
        self.jobs_table = Table(
            "jobs", self.metadata,
            Column("id", String, primary_key=True),
            Column("status", String, nullable=False),
            Column("model_id", String, nullable=True),
            Column("style", String, nullable=False),
            Column("output_path", String, nullable=True),
            Column("error", Text, nullable=True),
            Column("created_at", TIMESTAMP(timezone=True), nullable=False),
            Column("updated_at", TIMESTAMP(timezone=True), nullable=False),
        )

    def init_db(self):
        self.metadata.create_all(self.engine)

    def create_model_entry(self, model_id: str, image_paths: List[str]):
        with self.engine.begin() as conn:
            conn.execute(insert(self.models_table).values(id=model_id, image_paths=image_paths))

    def get_model_entry(self, model_id: str) -> List[str]:
        with self.engine.connect() as conn:
            stmt = select(self.models_table.c.image_paths).where(self.models_table.c.id == model_id)
            row = conn.execute(stmt).fetchone()
            # SQLAlchemy handles JSON conversion automatically if the dialect supports it
            if row:
                return json.loads(row[0]) if isinstance(row[0], str) else row[0]
            return []

    def create_job(self, job_id: str, model_id: Optional[str], style: str):
        now = datetime.now()
        with self.engine.begin() as conn:
            conn.execute(insert(self.jobs_table).values(
                id=job_id, status="pending", model_id=model_id, style=style, created_at=now, updated_at=now
            ))

    def update_job_status(self, job_id: str, status: str, output_path: Optional[str] = None, error: Optional[str] = None):
        now = datetime.now()
        with self.engine.begin() as conn:
            stmt = update(self.jobs_table).where(self.jobs_table.c.id == job_id).values(
                status=status, output_path=output_path, error=error, updated_at=now
            )
            conn.execute(stmt)

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.engine.connect() as conn:
            stmt = select(self.jobs_table).where(self.jobs_table.c.id == job_id)
            row = conn.execute(stmt).fetchone()
            if not row: return None
            # Return matching dictionary structure
            return {
                "id": row.id, "status": row.status, "model_id": row.model_id, "style": row.style,
                "output_path": row.output_path, "error": row.error,
                "created_at": row.created_at.isoformat() if hasattr(row.created_at, 'isoformat') else row.created_at,
                "updated_at": row.updated_at.isoformat() if hasattr(row.updated_at, 'isoformat') else row.updated_at
            }
