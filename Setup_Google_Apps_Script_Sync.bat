@echo off
setlocal
title Smart Inventory - Setup Auto-Sync
cd /d "%~dp0"
python setup_sync.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred. Press any key to exit...
    pause >nul
)
