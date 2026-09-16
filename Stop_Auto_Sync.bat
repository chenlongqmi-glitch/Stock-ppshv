@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo [*] កំពុងបញ្ឈប់ដំណើរការ Auto-Sync Background...

:: Remove startup shortcut
set "SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\StockAutoDeploy.lnk"
if exist "%SHORTCUT%" del /f /q "%SHORTCUT%" >nul 2>&1

:: Kill running auto_sync.py processes
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*auto_sync.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1

echo [✓] បានបញ្ឈប់ដំណើរការ Auto-Deploy រួចរាល់។
timeout /t 2 >nul
exit /b 0
