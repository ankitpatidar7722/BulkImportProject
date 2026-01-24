@echo off
dotnet build > build.log 2>&1
echo Build finished with exit code %ERRORLEVEL% >> build.log
