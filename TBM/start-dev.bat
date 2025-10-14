
@echo off
REM ===================================================================
REM TBM Project Development Server Start Script
REM ===================================================================

echo Starting Backend API Server...
REM Opens a new window for the backend and runs it.
start "TBM_Backend" cmd /k "cd Tbm.Api && dotnet run"

echo Starting Frontend Dev Server...
REM Opens another new window for the frontend and runs it.
start "TBM_Frontend" cmd /k "cd tbm.frontend && npm start"

echo.
echo All servers are starting in new windows.
