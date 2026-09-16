@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Smart Inventory Local Web Server
cd /d "%~dp0"

:: 0. Find working Python executable
set "PY_CMD="
python -c "import sys; sys.exit(0)" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_CMD=python"
    goto :PYTHON_FOUND
)

py -3 -c "import sys; sys.exit(0)" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_CMD=py -3"
    goto :PYTHON_FOUND
)

if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
    set "PY_CMD="%LocalAppData%\Programs\Python\Python313\python.exe""
    goto :PYTHON_FOUND
)
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set "PY_CMD="%LocalAppData%\Programs\Python\Python312\python.exe""
    goto :PYTHON_FOUND
)
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
    set "PY_CMD="%LocalAppData%\Programs\Python\Python311\python.exe""
    goto :PYTHON_FOUND
)
if exist "C:\Python313\python.exe" (
    set "PY_CMD="C:\Python313\python.exe""
    goto :PYTHON_FOUND
)
if exist "C:\Python312\python.exe" (
    set "PY_CMD="C:\Python312\python.exe""
    goto :PYTHON_FOUND
)
if exist "C:\Program Files\Python313\python.exe" (
    set "PY_CMD="C:\Program Files\Python313\python.exe""
    goto :PYTHON_FOUND
)

:: Fallback if Python is not installed
echo.
echo ===============================================================
echo  [!] Python is not installed on this computer.
echo  [*] Opening Index.html directly in your default web browser...
echo ===============================================================
echo.
start "" "%~dp0Index.html"
pause
goto :EOF

:PYTHON_FOUND
:: Ensure Port 3000 is clean before starting
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="" if not "%%a"=="0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)

:SERVER_LOOP
echo.
echo ===============================================================
echo  [*] Starting Smart Inventory Server with Auto-Restart & Live-Reload...
echo ===============================================================
echo.

%PY_CMD% "%~dp0server.py"

echo.
echo  [!] Server stopped or restarted.
echo  [*] Automatically restarting in 2 seconds... (Press Ctrl+C to exit)
timeout /t 2 >nul 2>&1
goto :SERVER_LOOP
