@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ===============================================================
echo   ⚡ ដំឡើង AUTO-DEPLOY ដំណើរការស្វ័យប្រវត្តិតាម WINDOWS STARTUP
echo ===============================================================
echo.

set "VBS_FILE=%~dp0auto_sync_silent.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT=%STARTUP_FOLDER%\StockAutoDeploy.lnk"

:: Create shortcut via PowerShell
powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_FILE%\"'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Save()"

:: Launch it immediately in background
wscript.exe "%VBS_FILE%"

echo.
echo ===============================================================
echo  ✅ ជោគជ័យ ១០០%%! 
echo  ប្រព័ន្ធ Auto-Deploy ត្រូវបានដំឡើងដំណើរការក្នុង Background រួចរាល់!
echo.
echo  • ដំណើរការស្វ័យប្រវត្តិតាំងពីបើកកុំព្យូទ័រ (Auto Start on Windows)
echo  • រាល់ពេលលោកអ្នក Save ឬកែ file ណាមួយ វានឹង Auto-Deploy ភ្លាមៗ
echo  • មិនចាំបាច់ចុចប៊ូតុង ឬបើកកម្មវិធីអ្វីទៀតទាំងអស់!
echo ===============================================================
echo.
timeout /t 3 >nul
exit /b 0
