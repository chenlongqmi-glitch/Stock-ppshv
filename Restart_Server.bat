@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Restart Smart Inventory Server
cd /d "%~dp0"

echo ===============================================================
echo  [*] Restarting Smart Inventory Local Server...
echo ===============================================================
echo.

:: 1. Terminate any running server on port 3000 or 3001
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo  [-] Closing old process PID %%a on port 3000...
        taskkill /F /PID %%a >nul 2>&1
    )
)

for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :3001 ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo  [-] Closing old process PID %%a on port 3001...
        taskkill /F /PID %%a >nul 2>&1
    )
)

timeout /t 1 /nobreak >nul 2>&1

:: 2. Start server fresh
echo.
echo  [+] Launching server...
start "" "%~dp0run.bat"
echo  [✓] Server restarted successfully!
timeout /t 2 >nul 2>&1
exit
