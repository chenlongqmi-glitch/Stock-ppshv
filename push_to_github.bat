@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>&1
title Push to GitHub & Auto Deploy - Smart Inventory

cd /d "%~dp0"

echo ===============================================================
echo   🚀 SMART INVENTORY - PUSH TO GITHUB & AUTO DEPLOY
echo ===============================================================
echo.

:: 1. Check for Git command
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
    echo [X] មិនទាន់រកឃើញ Git នៅក្នុងម៉ាស៊ីននៅឡើយទេ។
    echo [!] Please install Git for Windows or ensure git is in your PATH.
    echo.
    pause
    exit /b 1
)

:: 2. Ensure Git repository is initialized
if not exist "%~dp0.git" (
    echo [*] Initializing Git repository...
    %GIT_CMD% init -b main
)

:: 3. Configure Remote URL
set "REPO_URL=https://github.com/chenlongqmi-glitch/Stock-ppshv.git"
%GIT_CMD% remote get-url origin >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [*] Setting remote origin to: %REPO_URL%
    %GIT_CMD% remote add origin %REPO_URL%
) else (
    %GIT_CMD% remote set-url origin %REPO_URL%
)

:: 4. Ensure current branch is main
%GIT_CMD% branch -M main >nul 2>&1

:: Ensure Git User Info is configured
%GIT_CMD% config user.name >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    %GIT_CMD% config user.name "chenlongqmi-glitch"
    %GIT_CMD% config user.email "chenlongqmi@users.noreply.github.com"
)

:: 5. Check Git Status
echo [*] កំពុងពិនិត្យស្ថានភាព File ដែលបានកែប្រែ (Checking changes)...
echo.
%GIT_CMD% status -s
echo.

:: 6. Stage all changes
%GIT_CMD% add -A

:: Check if there are staged changes to commit
%GIT_CMD% diff --cached --quiet
if %ERRORLEVEL% EQU 0 (
    echo [i] គ្មាន File ថ្មី ឬកែប្រែដែលត្រូវ Commit ទេ។ (Working tree clean)
    echo.
    set /p "FORCE_PUSH=តើអ្នកចង់ Push ទៅ GitHub ម្តងទៀតដែរឬទេ? [y/N]: "
    if /i not "!FORCE_PUSH!"=="y" (
        echo.
        echo [*] បានបញ្ចប់។ មិនមានការ Push ថ្មីទេ។
        echo.
        pause
        exit /b 0
    )
) else (
    :: Generate default commit message with date & time
    set "AUTO_MSG="
    for /f "delims=" %%t in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd HH:mm:ss'" 2^>nul') do set "AUTO_MSG=Update files: %%t"
    if "!AUTO_MSG!"=="" set "AUTO_MSG=Update Smart Inventory System"

    echo ---------------------------------------------------------------
    echo [?] សូមបញ្ចូលចំណាំនៃការកែប្រែ (Commit Message):
    echo     (ចុច Enter ភ្លាមៗ ដើម្បីប្រើ: !AUTO_MSG!)
    echo ---------------------------------------------------------------
    set /p "USER_MSG=>> "
    if "!USER_MSG!"=="" set "USER_MSG=!AUTO_MSG!"

    echo.
    echo [*] កំពុងរក្សាទុកការកែប្រែ (Committing changes)...
    %GIT_CMD% commit -m "!USER_MSG!"
)

echo.
echo [*] កំពុង Sync ទាញយកកូដថ្មីពី GitHub បើមាន (Pulling with rebase)...
%GIT_CMD% pull --rebase origin main >nul 2>&1

echo.
echo [*] កំពុង Push ឡើងទៅកាន់ GitHub (Branch: main)...
%GIT_CMD% push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ===============================================================
    echo  ✅ ជោគជ័យ! ការ Push និង Deploy ត្រូវបានបញ្ជូនទៅ GitHub រួចរាល់!
    echo ===============================================================
    echo.
    echo  📦 GitHub Repository:
    echo     https://github.com/chenlongqmi-glitch/Stock-ppshv
    echo.
    echo  🌐 Web App / GitHub Pages (Deploy ដោយស្វ័យប្រវត្តិ):
    echo     https://chenlongqmi-glitch.github.io/Stock-ppshv/
    echo.
    echo  💡 ចំណាំ៖ ប្រព័ន្ធ GitHub Actions នឹងដំណើរការ Deploy ទៅកាន់
    echo     GitHub Pages ក្នុងរយៈពេលប្រមាណ ១-២ នាទីបន្ទាប់ពី Push។
    echo ===============================================================
) else (
    echo.
    echo ===============================================================
    echo  [!] មានបញ្ហាក្នុងការ Push ទៅ GitHub! (Push failed)
    echo ===============================================================
    echo  សូមពិនិត្យមើល៖
    echo   1. ការតភ្ជាប់អ៊ីនធឺណិត (Internet Connection)
    echo   2. សិទ្ធិ Login GitHub របស់អ្នក (GitHub Personal Access Token ឬ Login)
    echo   3. បើជាប់ Conflict សូមដំណើរការ 'git pull' ជាមុនសិន
    echo ===============================================================
)

echo.
pause
