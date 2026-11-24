@echo off
rem Starts the agent (minimized, listening for claps) every time you log in to Windows.
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
(
  echo @echo off
  echo start "Desktop Agent" /min cmd /c ""%~dp0run-dashboard-windows.bat" --no-browser"
) > "%STARTUP%\desktop-agent.bat"
echo The agent will now start automatically when you log in.
echo To undo: run uninstall-autostart-windows.bat
pause
