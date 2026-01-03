import sqlite3
import json
import os
from typing import List, Optional
from datetime import datetime

DB_PATH = "models.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS models (
            id TEXT PRIMARY KEY,
            image_paths TEXT
        )
    """
    )
    cursor.execute(
        """
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
    """
    )
    conn.commit()
    conn.close()


def create_model_entry(model_id: str, image_paths: List[str]):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO models (id, image_paths) VALUES (?, ?)",
        (model_id, json.dumps(image_paths)),
    )
    conn.commit()
    conn.close()


def get_model_entry(model_id: str) -> List[str]:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT image_paths FROM models WHERE id = ?", (model_id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return json.loads(row[0])
    return []


def create_job(job_id: str, model_id: Optional[str], style: str):
    """Create a new generation job with pending status."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute(
        """
        INSERT INTO jobs (id, status, model_id, style, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (job_id, "pending", model_id, style, now, now),
    )
    conn.commit()
    conn.close()


def update_job_status(
    job_id: str,
    status: str,
    output_path: Optional[str] = None,
    error: Optional[str] = None,
):
    """Update job status and optionally set output path or error."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute(
        """
        UPDATE jobs
        SET status = ?, output_path = ?, error = ?, updated_at = ?
        WHERE id = ?
        """,
        (status, output_path, error, now, job_id),
    )
    conn.commit()
    conn.close()


def get_job(job_id: str) -> Optional[dict]:
    """Get job details by ID."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, status, model_id, style, output_path, error, created_at, updated_at
        FROM jobs
        WHERE id = ?
        """,
        (job_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "id": row[0],
            "status": row[1],
            "model_id": row[2],
            "style": row[3],
            "output_path": row[4],
            "error": row[5],
            "created_at": row[6],
            "updated_at": row[7],
        }
    return None
