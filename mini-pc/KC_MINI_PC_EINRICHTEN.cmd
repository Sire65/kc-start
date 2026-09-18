@echo off
setlocal
set "ROOT=%~dp0.."
set "SERVER=%~dp0mini-pc-server.cjs"
where node >nul 2>nul || (
  echo Node.js wurde nicht gefunden.
  pause
  exit /b 1
)
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\KC Mini PC Zentrale.cmd"
(
  echo @echo off
  echo start "" /min node "%SERVER%"
) > "%STARTUP%"
set "DESKTOP=%USERPROFILE%\Desktop\KC Programme.url"
(
  echo [InternetShortcut]
  echo URL=http://127.0.0.1:8700/
  echo IconIndex=0
) > "%DESKTOP%"
start "" /min node "%SERVER%"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8700/"
echo.
echo KC Mini-PC Zentrale ist eingerichtet.
echo Autostart: aktiv
echo Desktop: KC Programme
echo Startcenter: http://127.0.0.1:8700/
echo.
echo Keine Supabase- oder KC-Nutzdaten wurden veraendert.
pause
endlocal
