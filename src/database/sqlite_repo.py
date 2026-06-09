import json
import sqlite3
from datetime import datetime
from typing import List, Optional, Dict, Any
from .base import BaseRepository

class SQLiteRepository(BaseRepository):
    def __init__(self, db_url: str):
        # Convert URI to file path
        self.db_path = db_url.replace("sqlite:///", "").replace("sqlite://", "")
        self.connect_args = {"check_same_thread": False}

    def _get_conn(self):
        return sqlite3.connect(self.db_path, **self.connect_args)

    def init_db(self):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS models (
                    id TEXT PRIMARY KEY,
                    image_paths TEXT
                )
            """
            )
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY, 
                    status TEXT NOT NULL, 
                    model_id TEXT, 
                    style TEXT NOT NULL,
                    output_path TEXT, 
                    error TEXT, 
                    created_at TEXT NOT NULL, 
                    updated_at TEXT NOT NULL
                )
            """)

    def create_model_entry(self, model_id: str, image_paths: List[str]):
        with self._get_conn() as conn:
            conn.cursor().execute("INSERT INTO models (id, image_paths) VALUES (?, ?)", (model_id, json.dumps(image_paths)))

    def get_model_entry(self, model_id: str) -> List[str]:
        with self._get_conn() as conn:
            row = conn.cursor().execute("SELECT image_paths FROM models WHERE id = ?", (model_id,)).fetchone()
            return json.loads(row[0]) if row else []

    def create_job(self, job_id: str, model_id: Optional[str], style: str):
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            conn.cursor().execute(
                "INSERT INTO jobs (id, status, model_id, style, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (job_id, "pending", model_id, style, now, now)
            )

    def update_job_status(self, job_id: str, status: str, output_path: Optional[str] = None, error: Optional[str] = None):
        now = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            conn.cursor().execute(
                "UPDATE jobs SET status = ?, output_path = ?, error = ?, updated_at = ? WHERE id = ?",
                (status, output_path, error, now, job_id)
            )

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            row = conn.cursor().execute("SELECT id, status, model_id, style, output_path, error, created_at, updated_at FROM jobs WHERE id = ?", (job_id,)).fetchone()
            if not row: return None
            return {"id": row[0], "status": row[1], "model_id": row[2], "style": row[3], "output_path": row[4], "error": row[5], "created_at": row[6], "updated_at": row[7]}
