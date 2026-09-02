@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   云南驰耀科技企业官网 - 一键启动
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未检测到 Node.js，请先安装 Node.js 22.5 及以上版本
  echo 下载地址: https://nodejs.org/
  pause
  exit /b 1
)

if not exist node_modules (
  echo [首次运行] 正在安装依赖，请稍候...
  call npm install
  if errorlevel 1 (
    echo [错误] 依赖安装失败，请检查网络后重试
    pause
    exit /b 1
  )
)

echo.
echo [启动] 服务启动中...
echo   前台网站  : http://localhost:5173
echo   后台管理  : http://localhost:5174   (默认账号 admin / admin123)
echo   后端 API  : http://localhost:3000
echo   关闭本窗口即可停止全部服务
echo.
call npm run dev
pause
