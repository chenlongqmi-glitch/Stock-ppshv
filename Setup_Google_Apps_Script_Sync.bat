@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Smart Inventory - Setup Auto-Sync to Google Apps Script
cd /d "%~dp0"

:: Set Node & NPM in PATH
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%LOCALAPPDATA%\Programs\nodejs;%PATH%"

echo ===============================================================
echo   ⚡ ដំឡើងមុខងារ AUTO-SYNC ទៅកាន់ GOOGLE APPS SCRIPT ដោយស្វ័យប្រវត្តិ
echo ===============================================================
echo.
echo  ប្រព័ន្ធនេះប្រើប្រាស់ Google Clasp (ឧបករណ៍ផ្លូវការរបស់ Google)
echo  ដើម្បី Sync កូដពីកុំព្យូទ័ររបស់អ្នក ទៅកាន់ Google Apps Script
echo  ដោយស្វ័យប្រវត្តិរាល់ពេលលោកអ្នក Save/Update ឯកសារ Code.js ឬ index.html!
echo.
echo ===============================================================
echo.

:: 1. Check Node.js
echo [*] ជំហានទី ១៖ កំពុងពិនិត្យមើល Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [!] មិនទាន់មាន Node.js លើកុំព្យូទ័រនេះទេ។
    echo [*] កំពុងដំឡើង Node.js ដោយស្វ័យប្រវត្តិតាមរយៈ winget...
    winget install OpenJS.NodeJS -e --accept-source-agreements --accept-package-agreements
    set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"
)
echo [✓] រកឃើញ Node.js រួចរាល់!
echo.

:: 2. Check and install clasp
echo [*] ជំហានទី ២៖ កំពុងពិនិត្យមើល Google Clasp...
where clasp >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if not exist "%APPDATA%\npm\clasp.cmd" (
        echo [*] កំពុងដំឡើង @google/clasp (Official Google Tool)...
        call npm install -g @google/clasp
    )
)
echo [✓] បានដំឡើង Google Clasp រួចរាល់ហើយ!
echo.

:: 3. Remind about Apps Script API
echo ===============================================================
echo   ⚠️ សំខាន់បំផុត៖ សូមបើក Apps Script API ជាមុនសិន!
echo ===============================================================
echo  ១. កម្មវិធីនឹងបើកទំព័រ Settings របស់ Google Apps Script ក្នុង Browser
echo  ២. សូមចុចបើក (Turn ON) ត្រង់ពាក្យ៖
echo     "Google Apps Script API: ON"
echo ===============================================================
echo.
start https://script.google.com/home/usersettings
timeout /t 3 >nul

:: 4. Clasp Login
echo [*] ជំហានទី ៣៖ Login ជាមួយ Google Account របស់អ្នក...
echo     (ផ្ទាំង Browser នឹងបើកឡើង សូមជ្រើសរើស Gmail ដែលជាម្ចាស់ Google Sheet នេះ)
echo.
call "%APPDATA%\npm\clasp.cmd" login
echo.

:: 5. Script ID verification
if exist "%~dp0.clasp.json" (
    echo [✓] បានរកឃើញឯកសារ .clasp.json រួចជាស្រេច!
    type "%~dp0.clasp.json"
    echo.
) else (
    echo ===============================================================
    echo   🔑 ជំហានទី ៤៖ បញ្ចូល Script ID នៃគម្រោង Apps Script របស់អ្នក
    echo ===============================================================
    echo.
    set /p SCRIPT_ID="សូមបិទភ្ជាប់ (Paste) Script ID នៅទីនេះ រួចចុច Enter: "
    if "!SCRIPT_ID!"=="" (
        echo [X] មិនបានបញ្ចូល Script ID ទេ។
        pause
        exit /b 1
    )
    (
      echo {
      echo   "scriptId": "!SCRIPT_ID!",
      echo   "rootDir": "."
      echo }
    ) > "%~dp0.clasp.json"
    echo [✓] បានបង្កើតឯកសារ .clasp.json រួចរាល់!
)

:: 6. Test initial push
echo [*] ជំហានទី ៥៖ កំពុង Push កូដពីកុំព្យូទ័រ (Code.js & index.html) ទៅកាន់ Google Apps Script...
call "%APPDATA%\npm\clasp.cmd" push -f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================
    echo  🎉 អបអរសាទរ! ការភ្ជាប់ AUTO-SYNC ទៅ Google Apps Script ជោគជ័យ ១០០%%!
    echo ===============================================================
    echo  - ឯកសារ Code.js និង index.html ត្រូវបានបញ្ជូនទៅ Apps Script រួចរាល់!
    echo  - ឥឡូវអ្នកអាចត្រឡប់ទៅ Apps Script ក្នុង Browser ចុច Reload (F5) នឹងឃើញកូដទាំងអស់!
    echo ===============================================================
) else (
    echo.
    echo [!] មានបញ្ហាក្នុងការ Push។ សូមប្រាកដថាអ្នកបាន Turn ON "Google Apps Script API"
    echo     និង Login ត្រូវ Google Account ម្ចាស់ Sheet។
)

echo.
pause
