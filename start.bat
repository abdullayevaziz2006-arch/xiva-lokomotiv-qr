@echo off
title SmartAccess QR - Tezkor Ishga Tushirish
echo ===================================================
echo   SmartAccess QR Tizimi Lokal Serveri
echo ===================================================

:: Node.js o'rnatilganini tekshirish
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [XATO] Kompyuterda Node.js topilmadi!
    echo Iltimos, ishga tushirishdan oldin Node.js ni o'rnating:
    echo Havola: https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi
    echo.
    pause
    exit /b
)

:: Backendni alohida oynada ishga tushirish
echo [1/2] Backend server ishga tushirilmoqda (Port: 5000)...
start "SmartAccess Backend" cmd /c "node index.js"

:: Frontendni alohida oynada ishga tushirish
echo [2/2] Frontend (Vite) server ishga tushirilmoqda (Port: 5173)...
cd frontend
start "SmartAccess Frontend" cmd /c "npm run dev"

:: Brauzerda kassir oynasini ochish
echo Loyiha muvaffaqiyatli boshlandi!
timeout /t 3 >nul
start http://localhost:5173
