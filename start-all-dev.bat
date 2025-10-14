@echo off
echo ========================================
echo 안전교육 통합 플랫폼 개발 서버 시작
echo ========================================
echo.

REM 새 창에서 TBM API 시작
start "TBM API" cmd /k "cd TBM\Tbm.Api && dotnet run"

REM 2초 대기
timeout /t 2 /nobreak > nul

REM 새 창에서 TBM Frontend 시작
start "TBM Frontend" cmd /k "cd TBM\tbm.frontend && set PORT=3001 && npm start"

REM 2초 대기
timeout /t 2 /nobreak > nul

REM 새 창에서 FoodieMatch 시작
start "FoodieMatch" cmd /k "cd FoodieMatch && npm run dev"

echo.
echo ========================================
echo 모든 개발 서버가 시작되었습니다!
echo.
echo FoodieMatch (안전교육): http://localhost:5173
echo TBM Frontend: http://localhost:3001
echo TBM API: http://localhost:8080
echo ========================================
echo.
echo 종료하려면 각 창을 닫으세요.
pause
