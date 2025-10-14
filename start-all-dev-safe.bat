@echo off
echo Starting servers...
echo.

echo --- Starting TBM API...
cd TBM\Tbm.Api
start "TBM API" cmd /k "dotnet run"
cd ..\..
timeout /t 2 /nobreak > nul

echo --- Starting FoodieMatch Frontend...
cd FoodieMatch
start "FoodieMatch" cmd /k "npm run dev"
cd ..

echo.
echo ========================================
echo All servers launched.

echo Access URLs:
echo FoodieMatch: http://localhost:5000
echo TBM API: http://localhost:5287
echo ========================================
echo.
pause
