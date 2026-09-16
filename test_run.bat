@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
title ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ (Smart Inventory Server)
cd /d "%~dp0"

echo ===============================================================
echo    📦 ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ (Smart Inventory System)
echo ===============================================================
echo.
echo  [*] កំពុងពិនិត្យដំណើរការ Python...

:: 1. Try python in PATH
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [✓] រកឃើញ Python ក្នុង PATH!
    echo  [*] កំពុងចាប់ផ្ដើមដំណើរការ Server...
    python "%~dp0server.py"
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [!] Server បានឈប់ដំណើរការ។
        pause
    )
    goto :eof
)

:: 2. Try py launcher
py --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo  [✓] រកឃើញ Python Launcher (py)!
    echo  [*] កំពុងចាប់ផ្ដើមដំណើរការ Server...
    py "%~dp0server.py"
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [!] Server បានឈប់ដំណើរការ។
        pause
    )
    goto :eof
)

:: 3. Try standard installation paths
set "PY_PATHS="
set "PY_PATHS=%PY_PATHS%;%LocalAppData%\Programs\Python\Python311\python.exe"
set "PY_PATHS=%PY_PATHS%;%LocalAppData%\Programs\Python\Python312\python.exe"
set "PY_PATHS=%PY_PATHS%;%LocalAppData%\Programs\Python\Python310\python.exe"
set "PY_PATHS=%PY_PATHS%;%LocalAppData%\Programs\Python\Python39\python.exe"
set "PY_PATHS=%PY_PATHS%;C:\Python311\python.exe"
set "PY_PATHS=%PY_PATHS%;C:\Python312\python.exe"
set "PY_PATHS=%PY_PATHS%;C:\Python310\python.exe"

for %%P in (%PY_PATHS%) do (
    if exist "%%P" (
        echo  [✓] រកឃើញ Python នៅ: %%P
        echo  [*] កំពុងចាប់ផ្ដើមដំណើរការ Server...
        "%%P" "%~dp0server.py"
        if !ERRORLEVEL! NEQ 0 (
            echo.
            echo  [!] Server បានឈប់ដំណើរការ។
            pause
        )
        goto :eof
    )
)

:: 4. Fallback: No Python found, open Index.html directly in browser
echo.
echo  [!] មិនបានរកឃើញកម្មវិធី Python លើកុំព្យូទ័រនេះទេ។
echo  [*] កំពុងបើក File Index.html ផ្ទាល់លើ Browser...
echo.
start "" "%~dp0Index.html"
echo  [✓] បានបើកកម្មវិធីរួចរាល់!
echo.
pause
