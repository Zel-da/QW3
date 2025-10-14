@echo off
echo ========================================
echo 통합 플랫폼 개발 서버 (디버그 모드)
echo ========================================
echo 각 단계 후 일시 정지됩니다. 오류 메시지가 나타나면 알려주세요.
echo 계속하려면 아무 키나 누르십시오...
pause

echo [1/3] TBM 관련 서버 시작...
echo.

echo --- TBM API 시작 시도 ---
cd TBM\Tbm.Api
echo 현재 위치: %cd%
start "TBM API" cmd /k "dotnet run"
cd ..\..
echo API 서버가 새 창에서 시작되었는지 확인하세요.
echo 계속하려면 아무 키나 누르십시오...
pause

echo --- TBM Frontend 의존성 설치 시도 ---
cd TBM\tbm.frontend
echo 현재 위치: %cd%
call npm install
echo npm install 명령이 완료되었습니다. 오류가 있었나요?
echo 계속하려면 아무 키나 누르십시오...
pause


echo --- TBM Frontend 시작 시도 ---
start "TBM Frontend" cmd /k "set PORT=3001 && npm start"
cd ..\..
echo Frontend 서버가 새 창에서 시작되었는지 확인하세요.
echo 계속하려면 아무 키나 누르십시오...
pause

echo [2/3] FoodieMatch 서버 시작...
echo.


echo --- FoodieMatch 의존성 설치 시도 ---
cd FoodieMatch
echo 현재 위치: %cd%
call npm install
echo npm install 명령이 완료되었습니다. 오류가 있었나요?
echo 계속하려면 아무 키나 누르십시오...
pause


echo --- FoodieMatch 시작 시도 ---
start "FoodieMatch" cmd /k "set NODE_ENV=development&& npm run dev"
cd ..
echo FoodieMatch 서버가 새 창에서 시작되었는지 확인하세요.
echo 계속하려면 아무 키나 누르십시오...
pause


echo [3/3] 모든 명령이 실행되었습니다.
echo ========================================
pause
