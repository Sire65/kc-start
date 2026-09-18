@echo off
setlocal
where node >nul 2>nul || (
  echo Node.js wurde nicht gefunden.
  pause
  exit /b 1
)
start "" /min node "%~dp0mini-pc-server.cjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8700/"
endlocal
