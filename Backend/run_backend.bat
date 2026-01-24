@echo off
echo Starting build... > run_backend.log
dotnet build >> run_backend.log 2>&1
if %errorlevel% neq 0 (
    echo Build FAILED >> run_backend.log
    exit /b %errorlevel%
)
echo Build SUCCESS. Starting run... >> run_backend.log
dotnet run >> run_backend.log 2>&1
