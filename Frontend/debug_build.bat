echo "Running build diagnositcs" > build_log.txt
echo "Running tsc..." >> build_log.txt
call npx tsc --noEmit >> build_log.txt 2>&1
echo "TSC finished with %errorlevel%" >> build_log.txt
echo "Running vite build..." >> build_log.txt
call npx vite build >> build_log.txt 2>&1
echo "Vite build finished with %errorlevel%" >> build_log.txt
exit
