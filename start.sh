#!/usr/bin/env bash
# 云南驰耀科技企业官网 - 一键启动脚本 (Linux / macOS)
set -e
cd "$(dirname "$0")"

echo "============================================"
echo "  云南驰耀科技企业官网 - 一键启动"
echo "============================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "[错误] 未检测到 Node.js，请先安装 Node.js 22.5 及以上版本"
  echo "下载地址: https://nodejs.org/"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[首次运行] 正在安装依赖，请稍候..."
  npm install
fi

echo
echo "[启动] 服务启动中..."
echo "  前台网站  : http://localhost:5173"
echo "  后台管理  : http://localhost:5174   (默认账号 admin / admin123)"
echo "  后端 API  : http://localhost:3000"
echo "  按 Ctrl+C 停止全部服务"
echo
npm run dev
