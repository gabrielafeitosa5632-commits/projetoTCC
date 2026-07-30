@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0gerar-apk-atualizado.ps1"
if errorlevel 1 (
  echo.
  echo Falha ao gerar APK. Veja a mensagem acima.
  pause
  exit /b 1
)
echo.
echo Processo concluido.
pause
