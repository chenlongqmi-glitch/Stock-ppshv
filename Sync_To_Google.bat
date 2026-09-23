@echo off
chcp 65001 >nul 2>&1
title Smart Inventory - Sync Code to Google Apps Script
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

echo ===============================================================
echo   ⚡ កំពុង Push កូដទៅកាន់ Google Apps Script (clasp push)...
echo ===============================================================
echo.

call "%APPDATA%\npm\clasp.cmd" push -f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [✓] Push កូដជោគជ័យ ១០០%%! សូម Reload (F5) ផ្ទាំង Apps Script ដើម្បីពិនិត្យ។
) else (
    echo.
    echo [!] មិនទាន់ Login ឬ Apps Script API មិនទាន់បើក។
    echo [*] សូមដំណើរការ Setup_Google_Apps_Script_Sync.bat ម្តងដើម្បី Login!
)
echo.
pause
