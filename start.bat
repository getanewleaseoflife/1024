@echo off
title AI Interview Launcher
cd /d "%~dp0"

echo ============================================
echo   Job Competency Assessment Agent - Launcher
echo ============================================
echo.

echo [1/3] Starting backend (http://127.0.0.1:8000) ...
start "AI-Interview-Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --port 8000"

echo [2/3] Starting frontend (http://localhost:5173) ...
start "AI-Interview-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [3/3] Waiting for services to be ready ...
timeout /t 4 /nobreak >nul

echo Opening browser ...
start http://localhost:5173

echo.
echo Done! Close the two service windows (or run stop.bat) to stop.
pause
