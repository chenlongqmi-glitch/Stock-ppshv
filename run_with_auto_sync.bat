@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Smart Inventory - Server + Auto Deploy
cd /d "%~dp0"

echo ===============================================================
echo   🚀 ចាប់ផ្ដើមដំណើរការ Server ព្រមទាំង Auto-Sync & Deploy
echo ===============================================================
echo.
echo  [*] កំពុងបើក Auto-Sync Watcher ក្នុងផ្ទាំងដាច់ដោយឡែក...
start "Auto Deploy Watcher" cmd /k ""%~dp0Start_Auto_Sync.bat""

echo  [*] កំពុងបើក Local Web Server...
call "%~dp0run.bat"
