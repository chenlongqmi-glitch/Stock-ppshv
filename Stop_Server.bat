@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Stop Smart Inventory Server
cd /d "%~dp0"

echo ===============================================================
echo  [*] Stopping Smart Inventory Local Server...
echo ===============================================================
echo.

set KILLED=0
for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo  [-] Terminating process PID %%a on port 3000...
        taskkill /F /PID %%a >nul 2>&1
        set KILLED=1
    )
)

for /f "tokens=5" %%a in ('netstat -a -n -o ^| findstr :3001 ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo  [-] Terminating process PID %%a on port 3001...
        taskkill /F /PID %%a >nul 2>&1
        set KILLED=1
    )
)

echo.
if "!KILLED!"=="1" (
    echo  [+] Smart Inventory Server has been stopped successfully.
) else (
    echo  [i] No active server found running on port 3000/3001.
)
echo.
ping 127.0.0.1 -n 2 >nul 2>&1
endlocal
