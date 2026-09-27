@echo off
setlocal
title Smart Inventory - Sync Code & Deploy to Google Apps Script
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

echo ===============================================================
echo   Pushing code to Google Apps Script (clasp push)...
echo ===============================================================
echo.

call "%APPDATA%\npm\clasp.cmd" push -f
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================
    echo   Deploying to Google Apps Script Web App (clasp deploy)...
    echo ===============================================================
    echo.
    call "%APPDATA%\npm\clasp.cmd" deploy -i AKfycbxqw7NPsE8pWqeYPAwTqxFakzFD5lTzGR1N5mlL-n2oZMp4FeDpGENFnEAjf6gSddk -d "Auto-deployed update"
    echo.
    echo [✓] Web App Deployed Successfully!
) else (
    echo.
    echo [X] Clasp push failed.
)

echo.
pause
