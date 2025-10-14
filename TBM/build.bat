@echo off
echo.
echo ==================================
echo   TBM Application Build Script
echo ==================================
echo.

echo [1/4] Building Backend (Tbm.Api)...
cd Tbm.Api
dotnet publish -c Release
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Backend build failed.
    pause
    cd ..
    exit /b %errorlevel%
)
echo Backend build successful.
cd ..
echo.

echo [2/4] Installing Frontend Dependencies (tbm.frontend)...
cd tbm.frontend
call npm install --legacy-peer-deps
if %errorlevel% neq 0 (
    echo.
    echo ERROR: npm install failed.
    pause
    cd ..
    exit /b %errorlevel%
)
echo Frontend dependencies installed.
echo.

echo [3/4] Building Frontend (tbm.frontend)...
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Frontend build failed.
    pause
    cd ..
    exit /b %errorlevel%
)
echo Frontend build successful.
cd ..
echo.


echo [4/4] Build Complete!
echo.

echo   - Backend files are in: Tbm.Api\bin\Release\net9.0\publish\
echo   - Frontend files are in: tbm.frontend\build\
echo.
echo ==================================
pause