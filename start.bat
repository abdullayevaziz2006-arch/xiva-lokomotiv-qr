@echo off
title SmartAccess QR - Tezkor Ishga Tushirish
echo ===================================================
echo   SmartAccess QR Tizimi Lokal Serveri
echo ===================================================

:: Mahalliy node.exe ni PATH ga vaqtincha qo'shish (Zero-Install uchun)
set PATH=%~dp0;%PATH%

:: Node.js borligini tekshirish
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [XATO] Kompyuterda Node.js topilmadi!
    echo.
    pause
    exit /b
)

:: Backendni alohida oynada ishga tushirish
echo [1/2] Backend server ishga tushirilmoqda (Port: 5000)...
start "SmartAccess Backend" cmd /c "node index.js"

:: Frontendni alohida oynada ishga tushirish
echo [2/2] Frontend (Vite) server ishga tushirilmoqda (Port: 5173)...
start "SmartAccess Frontend" cmd /c "cd frontend && node node_modules\vite\bin\vite.js"

:: Brauzerda kassir oynasini ochish
echo Loyiha muvaffaqiyatli boshlandi!
timeout /t 3 >nul
start http://localhost:5173

