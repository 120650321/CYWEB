#!/usr/bin/env bash
# ==========================================================
# 云南驰耀科技企业官网 - 生产环境启动脚本 (Linux / Ubuntu)
# 用法: ./start-prod.sh [选项]
#   build       仅构建前端和后台
#   start       仅启动服务（跳过构建）
#   restart     重启服务
#   status      查看服务状态
#   logs        查看服务日志
#   stop        停止服务
#   (无参数)    完整启动（构建 + 启动）
# ==========================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ---------- 颜色输出 ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}>> $*${NC}"; }
ok()    { echo -e "   ${GREEN}✓${NC} $*"; }
warn()  { echo -e "   ${YELLOW}⚠${NC} $*"; }
err()   { echo -e "   ${RED}✗${NC} $*"; exit 1; }

# ---------- 配置 ----------
export NODE_ENV="${NODE_ENV:-production}"
PORT="${PORT:-3000}"
export PORT
PID_FILE="$SCRIPT_DIR/.server.pid"
LOG_DIR="$SCRIPT_DIR/server/logs"
LOG_FILE="$LOG_DIR/server.log"

mkdir -p "$LOG_DIR"

# ---------- 安全提醒 ----------
if [ -z "${JWT_SECRET:-}" ]; then
    warn "========================================"
    warn "  [安全警告] JWT_SECRET 未设置，使用默认值！"
    warn "  请设置环境变量: export JWT_SECRET='your-secret'"
    warn "========================================"
    export JWT_SECRET="chiyao-tech-jwt-secret-2024"
fi

# ---------- 检查 Node.js ----------
step "检查 Node.js 环境..."
if ! command -v node &>/dev/null; then
    err "未找到 Node.js，请先安装 Node.js >= 22.5.0"
fi
NODE_VER=$(node -v)
MAJOR_VER=$(echo "$NODE_VER" | sed 's/v//' | cut -d. -f1)
if [ "$MAJOR_VER" -lt 22 ]; then
    warn "Node.js 版本: $NODE_VER (建议 >= 22.5.0)"
fi
ok "Node.js $NODE_VER"

# ---------- 检查依赖 ----------
step "检查项目依赖..."
if [ ! -d "node_modules" ]; then
    err "node_modules 不存在，请先执行: npm install"
fi
ok "依赖已就绪"

# ---------- 构建 ----------
do_build() {
    step "构建前端项目 (frontend + admin)..."

    echo "  正在构建前台 (frontend)..."
    npm run build --workspace frontend || err "前台构建失败"
    ok "前台构建完成"

    echo "  正在构建后台管理 (admin)..."
    npm run build --workspace admin || err "后台管理构建失败"
    ok "后台管理构建完成"

    if [ ! -d "frontend/dist" ]; then
        err "frontend/dist 目录不存在，构建可能未成功"
    fi
    if [ ! -d "admin/dist" ]; then
        err "admin/dist 目录不存在，构建可能未成功"
    fi
}

# ---------- 启动服务 ----------
do_start() {
    step "启动生产服务 (端口: $PORT)..."

    # 检查是否已在运行
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if kill -0 "$OLD_PID" 2>/dev/null; then
            warn "服务已在运行 (PID: $OLD_PID)，请先执行 stop 或 restart"
            return 1
        fi
    fi

    echo "  环境: NODE_ENV=$NODE_ENV, PORT=$PORT"
    echo ""

    nohup node server/src/index.js >> "$LOG_FILE" 2>&1 &
    SERVER_PID=$!
    echo "$SERVER_PID" > "$PID_FILE"

    # 等待服务启动
    sleep 2
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        ok "服务已启动 (PID: $SERVER_PID)"
    else
        err "服务启动失败，请查看日志: tail -f $LOG_FILE"
    fi

    echo ""
    echo "  ┌──────────────────────────────────────────┐"
    echo "  │  访问地址: http://localhost:$PORT            │"
    echo "  │  健康检查: http://localhost:$PORT/api/health │"
    echo "  │  Sitemap:  http://localhost:$PORT/api/public/sitemap.xml │"
    echo "  │                                          │"
    echo "  │  停止服务: ./start-prod.sh stop           │"
    echo "  │  查看日志: ./start-prod.sh logs           │"
    echo "  └──────────────────────────────────────────┘"
}

# ---------- 停止服务 ----------
do_stop() {
    step "停止服务..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            kill "$PID" 2>/dev/null || true
            sleep 1
            # 如果还没停止，强制终止
            if kill -0 "$PID" 2>/dev/null; then
                kill -9 "$PID" 2>/dev/null || true
            fi
            ok "服务已停止 (PID: $PID)"
        else
            warn "进程 $PID 不存在，可能已停止"
        fi
        rm -f "$PID_FILE"
    else
        # 尝试通过端口查找
        PID=$(lsof -ti:"$PORT" 2>/dev/null || true)
        if [ -n "$PID" ]; then
            kill "$PID" 2>/dev/null || true
            ok "已停止端口 $PORT 上的进程 (PID: $PID)"
        else
            warn "未找到运行中的服务"
        fi
    fi
}

# ---------- 查看状态 ----------
do_status() {
    step "服务状态检查..."
    RUNNING=false

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            MEM=$(ps -o rss= -p "$PID" 2>/dev/null | awk '{printf "%.1f MB", $1/1024}')
            ok "服务运行中 (PID: $PID, 内存: ${MEM:-未知})"
            RUNNING=true
        else
            warn "PID 文件存在但进程已停止"
        fi
    fi

    if [ "$RUNNING" = false ]; then
        PID=$(lsof -ti:"$PORT" 2>/dev/null || true)
        if [ -n "$PID" ]; then
            ok "端口 $PORT 有进程监听 (PID: $PID)"
        else
            warn "服务未运行 (端口 $PORT 无监听)"
        fi
    fi

    # 健康检查
    if command -v curl &>/dev/null; then
        HEALTH=$(curl -s "http://localhost:$PORT/api/health" 2>/dev/null || true)
        if [ -n "$HEALTH" ]; then
            ok "健康检查通过: $(echo "$HEALTH" | grep -o '"name":"[^"]*"' | head -1)"
        else
            warn "健康检查失败"
        fi
    fi
}

# ---------- 主流程 ----------
case "${1:-}" in
    build)
        do_build
        ;;
    start)
        do_start
        ;;
    restart)
        do_stop
        sleep 2
        do_start
        ;;
    status)
        do_status
        ;;
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            warn "日志文件不存在: $LOG_FILE"
        fi
        ;;
    stop)
        do_stop
        ;;
    *)
        do_build
        do_start
        ;;
esac