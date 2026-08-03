@echo off
cd /d "%~dp0"
pwsh -NoProfile -ExecutionPolicy Bypass -File ".\start_library.ps1"
exit /b 0
