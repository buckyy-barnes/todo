# Orchestrix Task Management Application

Orchestrix is a task management application with a FastAPI backend, a vanilla HTML/CSS/JavaScript frontend, and a SQLite database.

## Prerequisites

Install the following software before starting:

- Python 3.10 or newer
- Git (only required if you are cloning the project)
- A modern web browser

## Setup and run locally

### 1. Get the project

Clone the repository and move into its root directory:

```powershell
git clone <repository-url>
cd todo
```

If you already have the project files, open a terminal in the project root (the folder containing `backend` and `frontend`).

### 2. Create a Python virtual environment

From the project root, run:

```powershell
python -m venv .venv
```

### 3. Activate the virtual environment

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

On Windows Command Prompt:

```bat
.venv\Scripts\activate
```

On macOS or Linux:

```bash
source .venv/bin/activate
```

If PowerShell prevents script execution, run PowerShell as your user and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate the environment again.

### 4. Install backend dependencies

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt
```

### 5. Start the application

Run this command from the project root:

```powershell
python -m uvicorn backend.main:app --reload
```

The first startup creates the SQLite `tasks` table automatically if it does not already exist. The database is stored in `backend\tasks.db`.

### 6. Open the application

Visit the following URL in your browser:

<http://127.0.0.1:8000>

The FastAPI interactive API documentation is available at:

<http://127.0.0.1:8000/docs>

### 7. Stop the application

Return to the terminal running the server and press `Ctrl+C`.

When finished, deactivate the virtual environment:

```powershell
deactivate
```

## Project structure

```text
todo/
├── backend/
│   ├── main.py           # FastAPI application and API routes
│   ├── requirements.txt  # Python dependencies
│   └── tasks.db          # SQLite database
└── frontend/
    ├── index.html        # Application page
    ├── app.js            # Frontend behavior and API calls
    └── style.css         # Application styles
```

## Basic usage

1. Enter a task title and description.
2. Select a priority and due date.
3. Select **Create Task**.
4. Use **Edit** to update task details.
5. Change a task's status using the status dropdown.
6. Use **Delete** to remove a task.
7. Filter the task list by status when needed.

## Troubleshooting

- **`python` is not recognized:** Install Python and ensure it is added to your system `PATH`. On some systems, use `py` instead of `python`.
- **`No module named fastapi` or `No module named uvicorn`:** Confirm that the virtual environment is activated, then rerun the dependency installation command.
- **Port 8000 is already in use:** Start the server on another port:

  ```powershell
  python -m uvicorn backend.main:app --reload --port 8001
  ```

  Then open <http://127.0.0.1:8001>.
- **Data reset:** Stop the server and back up or remove `backend\tasks.db`, then start the application again. A new empty database table will be created automatically.
