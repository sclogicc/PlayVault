@echo off
setlocal
cd /d "%~dp0"
title PlayVault 开发模式（热更新）

echo.
echo  PlayVault 开发模式正在启动。
echo  保持此窗口打开：修改界面和样式会自动刷新；主进程改动会自动重启应用。
echo  日常游玩请继续使用原有快捷方式，不要使用此窗口。
echo.

call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo 开发模式已退出，错误码：%EXIT_CODE%
  pause
)

endlocal & exit /b %EXIT_CODE%
