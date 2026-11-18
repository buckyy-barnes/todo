
from fastapi import FastAPI, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.encoders import jsonable_encoder

from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Literal
from datetime import date
from pathlib import Path
from contextlib import contextmanager
import sqlite3


app = FastAPI(title="Orchestrix Task Management API")


# -------------------------
# DATABASE CONFIGURATION
# -------------------------

DB_PATH = Path(__file__).resolve().parent / "tasks.db"


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def create_table():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                priority TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'Pending',
                dueDate TEXT NOT NULL
            )
        """)


create_table()


# -------------------------
# ALLOWED VALUES
# -------------------------

Priority = Literal["Low", "Medium", "High"]

Status = Literal["Pending", "In Progress", "Completed"]


# -------------------------
# PYDANTIC MODELS
# -------------------------

class TaskCreate(BaseModel):
    title: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: Priority
    dueDate: date

    @field_validator("title", "description")
    @classmethod
    def remove_spaces(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Field cannot be empty")

        return value

    model_config = ConfigDict(extra="forbid")


class TaskUpdate(TaskCreate):
    pass


class StatusUpdate(BaseModel):
    status: Status

    model_config = ConfigDict(extra="forbid")


# -------------------------
# VALIDATION ERROR HANDLER
# -------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=400,
        content={
            "error": jsonable_encoder(exc.errors())
        }
    )


# -------------------------
# HELPER FUNCTION
# -------------------------

def get_task_or_404(conn, task_id):
    task = conn.execute(
        "SELECT * FROM tasks WHERE id = ?",
        (task_id,)
    ).fetchone()

    if task is None:
        raise HTTPException(
            status_code=404,
            detail="Task not found"
        )

    return dict(task)


# -------------------------
# GET ALL TASKS
# -------------------------

@app.get("/tasks")
def get_tasks(
    status: Status | None = Query(default=None)
):
    with get_db() as conn:

        if status:
            rows = conn.execute(
                """
                SELECT * FROM tasks
                WHERE status = ?
                ORDER BY id DESC
                """,
                (status,)
            ).fetchall()

        else:
            rows = conn.execute(
                "SELECT * FROM tasks ORDER BY id DESC"
            ).fetchall()

        return [dict(row) for row in rows]


# -------------------------
# GET TASK BY ID
# -------------------------

@app.get("/tasks/{task_id}")
def get_task(task_id: int):

    with get_db() as conn:
        return get_task_or_404(conn, task_id)


# -------------------------
# CREATE NEW TASK
# -------------------------

@app.post("/tasks", status_code=201)
def create_task(task: TaskCreate):

    with get_db() as conn:

        cursor = conn.execute(
            """
            INSERT INTO tasks
            (title, description, priority, status, dueDate)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                task.title,
                task.description,
                task.priority,
                "Pending",
                task.dueDate.isoformat()
            )
        )

        task_id = cursor.lastrowid

        return get_task_or_404(conn, task_id)


# -------------------------
# UPDATE TASK DETAILS
# STATUS CANNOT BE UPDATED HERE
# -------------------------

@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):

    with get_db() as conn:

        get_task_or_404(conn, task_id)

        conn.execute(
            """
            UPDATE tasks
            SET title = ?,
                description = ?,
                priority = ?,
                dueDate = ?
            WHERE id = ?
            """,
            (
                task.title,
                task.description,
                task.priority,
                task.dueDate.isoformat(),
                task_id
            )
        )

        return get_task_or_404(conn, task_id)


# -------------------------
# STATUS TRANSITION RULES
# -------------------------

TRANSITIONS = {
    "Pending": ["In Progress"],
    "In Progress": ["Pending", "Completed"],
    "Completed": []
}


# -------------------------
# UPDATE TASK STATUS
# -------------------------

@app.patch("/tasks/{task_id}/status")
def update_status(task_id: int, data: StatusUpdate):

    with get_db() as conn:

        # Lock the database for this transaction
        conn.execute("BEGIN IMMEDIATE")

        task = get_task_or_404(conn, task_id)

        # Always read the current status from the database
        current_status = task["status"]
        new_status = data.status

        allowed_statuses = TRANSITIONS[current_status]

        if new_status not in allowed_statuses:
            raise HTTPException(
                status_code=409,
                detail="Invalid status transition"
            )

        conn.execute(
            """
            UPDATE tasks
            SET status = ?
            WHERE id = ?
            """,
            (new_status, task_id)
        )

        return get_task_or_404(conn, task_id)


# -------------------------
# DELETE TASK
# -------------------------

@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):

    with get_db() as conn:

        get_task_or_404(conn, task_id)

        conn.execute(
            "DELETE FROM tasks WHERE id = ?",
            (task_id,)
        )

        return {
            "message": "Task deleted successfully"
        }


# -------------------------
# SERVE FRONTEND
# -------------------------

FRONTEND_DIR = (
    Path(__file__).resolve().parent.parent / "frontend"
)

app.mount(
    "/",
    StaticFiles(directory=FRONTEND_DIR, html=True),
    name="frontend"
)
