@echo off
cd /d "%~dp0"

REM Same build for root or /web/ (Vite base is relative ./assets/...)
REM Pass: root  -> npm run deploy
REM Default   -> npm run deploy:web

if /i "%~1"=="root" (
  call npm run deploy
) else (
  call npm run deploy:web
)

if errorlevel 1 (
  echo FAILED. See errors above.
) else (
  echo DONE. Hard refresh: Ctrl+F5
)
pause
