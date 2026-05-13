@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to deploy Bibmaxxing.
  echo Download the LTS version from https://nodejs.org/en/download/
  pause
  exit /b 1
)
node scripts\deploy.mjs
if errorlevel 1 (
  echo.
  echo Deploy failed. Review the output above.
  pause
  exit /b 1
)
echo.
echo Deploy complete.
echo Portable folder: dist\bibmaxxing-portable-0.1.0
start "" "%CD%\dist\bibmaxxing-portable-0.1.0"
pause
