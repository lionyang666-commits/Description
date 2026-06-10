@echo off
chcp 65001 >nul
title Personal Workspace

cd /d "%~dp0"

echo ========================================
echo   Personal Workspace
echo ========================================
echo.

:: Use py launcher (auto-picks the right Python with deps installed)
py --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python and add it to PATH.
    echo.
    pause
    exit /b 1
)

:: Install dependencies if missing
echo [1/2] Checking dependencies...
py -m pip install -r requirements.txt -q 2>nul

echo [2/2] Starting server...
echo.
echo   http://localhost:8888
echo   Browser will open automatically in a few seconds.
echo   Press Ctrl+C to stop the server.
echo.
echo ========================================

:: Open browser after delay (background process)
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:8888"

:: Run server in current window
py app.py

echo.
echo Server stopped.
pause
