@echo off
echo ========================================
echo 안전교육 통합 플랫폼 배포 스크립트
echo ========================================
echo.

REM 설정 변수
set TBM_PORT=8081
set FOODIE_PORT=3000
set TBM_API_PORT=8080

echo [1/4] FoodieMatch 빌드 중...
cd FoodieMatch
call npm install
call npm run build
echo FoodieMatch 빌드 완료!
echo.

echo [2/4] TBM Frontend 빌드 중...
cd ..\TBM\tbm.frontend
call npm install
call npm run build
echo TBM Frontend 빌드 완료!
echo.

echo [3/4] TBM Backend 빌드 중...
cd ..\Tbm.Api
dotnet publish -c Release -o publish
echo TBM Backend 빌드 완료!
echo.

echo [4/4] 빌드 완료!
echo ========================================
echo 배포 준비 완료
echo.
echo FoodieMatch: http://localhost:%FOODIE_PORT%
echo TBM Frontend: http://localhost:%TBM_PORT%
echo TBM API: http://localhost:%TBM_API_PORT%
echo ========================================

pause
