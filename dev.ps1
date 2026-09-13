param(
    [Parameter(Position=0)]
    [ValidateSet("infra", "migrate", "backend", "frontend", "dev", "stop")]
    [string]$Command = "dev"
)

$ErrorActionPreference = "Stop"
$ROOT = $PSScriptRoot

switch ($Command) {
    "infra" {
        Write-Host "Starting Postgres + Redis..." -ForegroundColor Cyan
        docker compose up -d
    }
    "migrate" {
        Write-Host "Running Alembic migration..." -ForegroundColor Cyan
        Push-Location "$ROOT\backend"
        .\.venv\Scripts\python -m alembic upgrade head
        Pop-Location
    }
    "backend" {
        Write-Host "Starting FastAPI backend..." -ForegroundColor Cyan
        Push-Location "$ROOT\backend"
        $py = if (Test-Path ".\.venv\Scripts\python.exe") { ".\.venv\Scripts\python" } else { "python" }
        & $py -m uvicorn app.main:app --reload --port 8000
        Pop-Location
    }
    "frontend" {
        Write-Host "Starting Vite dev server..." -ForegroundColor Cyan
        Push-Location "$ROOT\frontend"
        npm run dev
        Pop-Location
    }
    "dev" {
        Write-Host "Starting full dev stack..." -ForegroundColor Cyan
        Write-Host "1. Checking infrastructure (Docker)..." -ForegroundColor DarkGray
        try {
            docker compose up -d 2>$null
        } catch {
            Write-Host "   (Docker not running - running standalone in SQLite/JSON mode)" -ForegroundColor Yellow
        }
        $py = if (Test-Path "$ROOT\backend\.venv\Scripts\python.exe") { "$ROOT\backend\.venv\Scripts\python" } else { "python" }
        Write-Host "2. Backend on :8000" -ForegroundColor DarkGray
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\backend'; $py -m uvicorn app.main:app --reload --port 8000"
        Write-Host "3. Frontend on :5173" -ForegroundColor DarkGray
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\frontend'; npm run dev"
        Write-Host "Dev stack started. Backend: http://localhost:8000  Frontend: http://localhost:5173" -ForegroundColor Green
    }
    "stop" {
        Write-Host "Stopping infrastructure..." -ForegroundColor Cyan
        docker compose down
    }
}
