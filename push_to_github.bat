@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Smart Inventory - 100% Auto Push & Deploy
cd /d "%~dp0"

echo ===============================================================
echo   🚀 SMART INVENTORY - 100%% AUTO PUSH & DEPLOY (ZERO-TOUCH)
echo ===============================================================
echo.

:: 1. Detect Git
set "GIT_CMD="
where git >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "GIT_CMD=git"
) else (
    if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD="C:\Program Files\Git\cmd\git.exe""
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "GIT_CMD="C:\Program Files (x86)\Git\cmd\git.exe""
    ) else if exist "%LocalAppData%\Programs\Git\cmd\git.exe" (
        set "GIT_CMD="%LocalAppData%\Programs\Git\cmd\git.exe""
    )
)

if "%GIT_CMD%"=="" (
    echo [X] Error: Git is not found on this computer.
    timeout /t 5 >nul
    exit /b 1
)

:: 2. Ensure Git repository is initialized
if not exist "%~dp0.git" (
    echo [*] Initializing Git repository...
    %GIT_CMD% init -b main >nul 2>&1
)

:: 3. Configure Remote URL
set "REPO_URL=https://github.com/chenlongqmi-glitch/Stock-ppshv.git"
%GIT_CMD% remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    %GIT_CMD% remote add origin %REPO_URL% >nul 2>&1
) else (
    %GIT_CMD% remote set-url origin %REPO_URL% >nul 2>&1
)

:: 4. Ensure branch main and git user identity
%GIT_CMD% branch -M main >nul 2>&1
%GIT_CMD% config user.name >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    %GIT_CMD% config user.name "chenlongqmi-glitch"
    %GIT_CMD% config user.email "chenlongqmi@users.noreply.github.com"
)

:: 5. Add all files
echo [*] កំពុងរៀបចំឯកសារ (Staging files)...
%GIT_CMD% add -A

:: 6. Check if there are changes
%GIT_CMD% diff --cached --quiet
if %ERRORLEVEL% EQU 0 (
    echo [✓] ឯកសារទាំងអស់សុទ្ធតែទាន់សម័យរួចហើយ (All files already up to date).
    echo [*] កំពុងត្រួតពិនិត្យ Push ទៅកាន់ GitHub...
) else (
    :: Generate automatic commit message without asking anything
    set "AUTO_MSG="
    for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'" 2^>nul') do set "AUTO_MSG=Auto-update: %%t"
    if "!AUTO_MSG!"=="" set "AUTO_MSG=Auto-update: Smart Inventory System"

    echo [*] កំពុងរក្សាទុកការកែប្រែ: !AUTO_MSG!
    %GIT_CMD% commit -m "!AUTO_MSG!" >nul 2>&1
)

:: 7. Pull rebase to keep in sync
echo [*] កំពុង Sync ជាមួយ GitHub...
%GIT_CMD% pull --rebase origin main >nul 2>&1

:: 8. Push to GitHub
echo [*] កំពុង Push ឡើងទៅកាន់ GitHub (Auto Deploying)...
%GIT_CMD% push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================
    echo  ✅ ជោគជ័យ ១០០%%! បាន Push និង Deploy ទៅ GitHub រួចរាល់!
    echo ===============================================================
    echo  📦 Repo:   https://github.com/chenlongqmi-glitch/Stock-ppshv
    echo  🌐 Web:    https://chenlongqmi-glitch.github.io/Stock-ppshv/
    echo ===============================================================
    echo.
    echo [*] ផ្ទាំងនេះនឹងបិទដោយស្វ័យប្រវត្តិក្នង ៣ វិនាទី...
    timeout /t 3 >nul
    exit /b 0
) else (
    echo.
    echo ===============================================================
    echo  [!] សូមរង់ចាំការផ្ទៀងផ្ទាត់សិទ្ធិ GitHub (GitHub Authentication)...
    echo ===============================================================
    timeout /t 5 >nul
    exit /b 1
)
