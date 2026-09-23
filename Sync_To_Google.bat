@echo off
setlocal
title Smart Inventory - Sync Code to Google Apps Script
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

echo ===============================================================
echo   Pushing code to Google Apps Script (clasp push)...
echo ===============================================================
echo.

call "%APPDATA%\npm\clasp.cmd" push -f

echo.
pause
