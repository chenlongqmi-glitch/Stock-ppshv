@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
title Smart Inventory - Auto Push & Auto Deploy Watcher
cd /d "%~dp0"

echo ===============================================================
echo    🔄 SMART INVENTORY - AUTO PUSH & AUTO DEPLOY WATCHER
echo ===============================================================
echo.
echo  [*] កំពុងស្វែងរក Python...

:: 1. Try python command
set "PY_CMD="
python -c "import sys; sys.exit(0)" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_CMD=python"
    goto :PYTHON_FOUND
)

:: 2. Try py launcher
py -3 -c "import sys; sys.exit(0)" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_CMD=py -3"
    goto :PYTHON_FOUND
)

:: 3. Try standard installation paths
if exist "%LocalAppData%\Programs\Python\Python313\python.exe" (
    set "PY_CMD="%LocalAppData%\Programs\Python\Python313\python.exe""
    goto :PYTHON_FOUND
)
if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
    set "PY_CMD="%LocalAppData%\Programs\Python\Python311\python.exe""
    goto :PYTHON_FOUND
)
if exist "%LocalAppData%\Programs\Python\Python312\python.exe" (
    set "PY_CMD="%LocalAppData%\Programs\Python\Python312\python.exe""
    goto :PYTHON_FOUND
)
if exist "C:\Python313\python.exe" (
    set "PY_CMD="C:\Python313\python.exe""
    goto :PYTHON_FOUND
)
if exist "C:\Python311\python.exe" (
    set "PY_CMD="C:\Python311\python.exe""
    goto :PYTHON_FOUND
)

echo.
echo ===============================================================
echo  [!] មិនទាន់រកឃើញ Python ក្នុងកុំព្យូទ័រនេះទេ។
echo  [*] Please make sure Python 3 is installed.
echo ===============================================================
echo.
pause
exit /b 1

:PYTHON_FOUND
echo  [✓] រកឃើញ Python រួចរាល់!
echo  [*] កំពុងបើកដំណើរការ Auto-Sync File Watcher...
echo.

%PY_CMD% "%~dp0auto_sync.py"

echo.
echo [!] Auto-Sync Watcher បានឈប់ដំណើរការ។
pause
