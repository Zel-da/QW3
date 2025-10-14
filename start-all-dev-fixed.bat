@echo off
echo ========================================
echo 안전교육 통합 플랫폼 개발 서버 시작
echo ========================================
echo.

echo [1/3] TBM 관련 서버 시작...
echo.
REM 새 창에서 TBM API 시작
start "TBM API" cmd /k "cd TBM\Tbm.Api && dotnet run"

REM 2초 대기
timeout /t 2 /nobreak > nul

echo TBM Frontend 의존성을 설치합니다...
cd TBM\tbm.frontend
call npm install
echo.

REM 새 창에서 TBM Frontend 시작
start "TBM Frontend" cmd /k "set PORT=3001 && npm start"
cd ..\.. 
echo.

REM 2초 대기
timeout /t 2 /nobreak > nul

echo [2/3] FoodieMatch 서버 시작...
echo.
echo FoodieMatch 의존성을 설치합니다...
cd FoodieMatch
call npm install
echo.

REM 새 창에서 FoodieMatch 시작 (Windows 환경에 맞게 수정)
start "FoodieMatch" cmd /k "set NODE_ENV=development&& npm run dev"
cd ..
echo.

echo [3/3] 모든 개발 서버가 시작되었습니다!
echo ========================================
echo.

echo FoodieMatch (안전교육): http://localhost:5000
echo TBM Frontend: http://localhost:3001
echo TBM API: http://localhost:5287
echo ========================================
echo.

echo 종료하려면 각 창을 닫으세요.
pause
