@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Smart Inventory - Setup Auto-Sync to Google Apps Script
cd /d "%~dp0"

echo ===============================================================
echo   ⚡ ដំឡើងមុខងារ AUTO-SYNC ទៅកាន់ GOOGLE APPS SCRIPT ដោយស្វ័យប្រវត្តិ
echo ===============================================================
echo.
echo  ប្រព័ន្ធនេះប្រើប្រាស់ Google Clasp (ឧបករណ៍ផ្លូវការរបស់ Google)
echo  ដើម្បី Sync កូដពីកុំព្យូទ័ររបស់អ្នក ទៅកាន់ Google Apps Script
echo  ដោយស្វ័យប្រវត្តិរាល់ពេលលោកអ្នក Save/Update ឯកសារ Code.js ឬ Index.html!
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
    if %ERRORLEVEL% NEQ 0 (
        echo [X] បរាជ័យក្នុងការដំឡើង Node.js ស្វ័យប្រវត្តិ។
        echo សូមទាញយក និងដំឡើង Node.js ដោយដៃតាម៖ https://nodejs.org
        pause
        exit /b 1
    )
    echo [✓] ដំឡើង Node.js រួចរាល់! សូមបិទផ្ទាំងនេះ ហើយបើកម្តងទៀតដើម្បីឱ្យ PATH ដំណើរការ។
    pause
    exit /b 0
)
echo [✓] រកឃើញ Node.js រួចរាល់!
echo.

:: 2. Check and install clasp
echo [*] ជំហានទី ២៖ កំពុងពិនិត្យមើល Google Clasp...
where clasp >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] កំពុងដំឡើង @google/clasp (Official Google Tool)...
    call npm install -g @google/clasp
    if %ERRORLEVEL% NEQ 0 (
        echo [X] បរាជ័យក្នុងការដំឡើង clasp។ សូមពិនិត្យ Internet របស់អ្នក។
        pause
        exit /b 1
    )
    echo [✓] ដំឡើង clasp ជោគជ័យ!
) else (
    echo [✓] បានដំឡើង Google Clasp រួចរាល់ហើយ!
)
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
pause
start https://script.google.com/home/usersettings
echo.

:: 4. Clasp Login
echo [*] ជំហានទី ៣៖ Login ជាមួយ Google Account របស់អ្នក...
echo     (ផ្ទាំង Browser នឹងបើកឡើង សូមជ្រើសរើស Gmail ដែលជាម្ចាស់ Google Sheet នេះ)
echo.
call clasp login
echo.

:: 5. Ask for Script ID
echo ===============================================================
echo   🔑 ជំហានទី ៤៖ បញ្ចូល Script ID នៃគម្រោង Apps Script របស់អ្នក
echo ===============================================================
echo  របៀបយក Script ID៖
echo  - បើក Google Sheet ➔ Extensions (ផ្នែកបន្ថែម) ➔ Apps Script
echo  - នៅខាងឆ្វេង ចុចលើរូបកង់ហ្គៀរ Project Settings (⚙️)
echo  - ចម្លង (Copy) អក្សរវែងក្នុងប្រអប់ "Script ID" (ឧ. 1B74n-nvW...)
echo ===============================================================
echo.
set /p SCRIPT_ID="សូមបិទភ្ជាប់ (Paste) Script ID នៅទីនេះ រួចចុច Enter: "

if "%SCRIPT_ID%"=="" (
    echo [X] មិនបានបញ្ចូល Script ID ទេ។ ការដំឡើងមិនទាន់ពេញលេញ។
    pause
    exit /b 1
)

:: 6. Create .clasp.json
(
  echo {
  echo   "scriptId": "%SCRIPT_ID%",
  echo   "rootDir": "."
  echo }
) > "%~dp0.clasp.json"

echo.
echo [✓] បានបង្កើតឯកសារ .clasp.json រួចរាល់!
echo.

:: 7. Test initial push
echo [*] ជំហានទី ៥៖ កំពុងតេស្ត Push កូដដំបូងទៅកាន់ Google Apps Script...
call clasp push -f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================
    echo  🎉 អបអរសាទរ! ការភ្ជាប់ AUTO-SYNC ទៅ Google Apps Script ជោគជ័យ ១០០%%!
    echo ===============================================================
    echo  ចាប់ពីពេលនេះតទៅ៖
    echo  - រាល់ពេលលោកអ្នកកែប្រែ Code.js ឬ Index.html
    echo  - កម្មវិធី Start_Auto_Sync.bat នឹងបញ្ជូន (Push) ទៅ Apps Script ដោយស្វ័យប្រវត្តិ!
    echo  - លែងបាច់ Copy / Paste ដោយដៃទៀតហើយ!
    echo ===============================================================
) else (
    echo.
    echo [!] មានបញ្ហាក្នុងការ Push។ សូមប្រាកដថាអ្នកបាន Turn ON "Google Apps Script API"
    echo     និងបញ្ចូល Script ID ត្រឹមត្រូវ។
)

echo.
pause
