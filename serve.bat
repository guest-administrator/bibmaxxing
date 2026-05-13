@echo off
setlocal
REM =============================================================================
REM  Bibmaxxing -- local static server launcher.
REM  Preference order:
REM    1. node scripts/serve.mjs       (checked-in static server, no remote deps)
REM    2. py -m http.server            (Windows Python Launcher)
REM    3. python -m http.server        (plain python on PATH)
REM    4. npx --yes serve              (last resort; needs network on first run)
REM  Default port: 8080. Override with: serve.bat 9000
REM =============================================================================

set PORT=%1
if "%PORT%"=="" set PORT=8080

REM --- Preflight: must be run from the project root ---------------------------
if not exist "index.html" (
  echo.
  echo ERROR: index.html not found in the current directory.
  echo Run serve.bat from the Bibmaxxing project root.
  echo.
  pause
  exit /b 1
)

if not exist "data\bibs\index.json" (
  echo.
  echo ERROR: data\bibs\index.json missing. Bib registry not installed.
  echo Run serve.bat from the Bibmaxxing project root.
  echo.
  pause
  exit /b 1
)

REM --- Pick a runtime ---------------------------------------------------------
set RUNTIME=

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  if exist "scripts\serve.mjs" set RUNTIME=node
)

if "%RUNTIME%"=="" (
  where py >nul 2>nul
  if %ERRORLEVEL%==0 set RUNTIME=py
)

if "%RUNTIME%"=="" (
  where python >nul 2>nul
  if %ERRORLEVEL%==0 set RUNTIME=python
)

if "%RUNTIME%"=="" (
  where npx >nul 2>nul
  if %ERRORLEVEL%==0 set RUNTIME=npx
)

if "%RUNTIME%"=="" (
  echo.
  echo ERROR: No static server runtime found.
  echo Install Node (recommended) or Python, then rerun serve.bat:
  echo   Node:   https://nodejs.org/en/download/
  echo   Python: https://www.python.org/downloads/windows/
  echo.
  pause
  exit /b 1
)

echo.
echo  ======================================================================
echo   Bibmaxxing  --  http://localhost:%PORT%/
echo   Runtime: %RUNTIME%
echo   Ctrl+C to stop the server.
echo  ======================================================================
echo.

REM --- Open the default browser (it will retry until the server answers) -----
start "" "http://localhost:%PORT%/"

REM --- Launch the chosen runtime ---------------------------------------------
if "%RUNTIME%"=="node"   goto :run_node
if "%RUNTIME%"=="py"     goto :run_py
if "%RUNTIME%"=="python" goto :run_python
if "%RUNTIME%"=="npx"    goto :run_npx
goto :eof

:run_node
node scripts\serve.mjs %PORT%
goto :eof

:run_py
py -m http.server %PORT%
goto :eof

:run_python
python -m http.server %PORT%
goto :eof

:run_npx
npx --yes serve -l %PORT% .
goto :eof
