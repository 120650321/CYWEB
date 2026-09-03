#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  看门狗监控系统 - Ubuntu 一键安装脚本  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检测 root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 权限运行: sudo bash install.sh${NC}"
  exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="/opt/watchdog"

echo -e "${YELLOW}[1/6] 检测 Node.js...${NC}"
if ! command -v node &>/dev/null; then
  echo "Node.js 未安装，正在安装..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}  Node.js $(node -v)${NC}"

echo -e "${YELLOW}[2/6] 检测 MySQL/MariaDB...${NC}"
if ! command -v mysql &>/dev/null; then
  echo -e "${RED}  MySQL/MariaDB 未安装，请先安装数据库${NC}"
  echo "  Ubuntu: apt-get install -y mysql-server"
  echo "  或: apt-get install -y mariadb-server"
  exit 1
fi
echo -e "${GREEN}  MySQL 已就绪${NC}"

echo -e "${YELLOW}[3/6] 安装文件到 ${INSTALL_DIR}...${NC}"
mkdir -p "${INSTALL_DIR}"
cp -r "${SCRIPT_DIR}/agent" "${INSTALL_DIR}/"
cp -r "${SCRIPT_DIR}/server" "${INSTALL_DIR}/"
mkdir -p "${INSTALL_DIR}/logs"

echo -e "${YELLOW}[4/6] 安装 Node.js 依赖...${NC}"
cd "${INSTALL_DIR}/server"
npm install --production

echo -e "${YELLOW}[5/6] 初始化数据库...${NC}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-root}"
DB_NAME="${DB_NAME:-watchdog}"

echo "  数据库: ${DB_HOST}:${DB_PORT} 用户: ${DB_USER} 库: ${DB_NAME}"
echo "  如果使用非默认配置，请设置环境变量后重新运行:"
echo "  DB_HOST=x DB_PORT=x DB_USER=x DB_PASS=x DB_NAME=x bash install.sh"

DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USER="${DB_USER}" DB_PASS="${DB_PASS}" DB_NAME="${DB_NAME}" \
  node "${INSTALL_DIR}/server/migrate.js"

echo -e "${YELLOW}[6/6] 注册 systemd 服务...${NC}"

SERVICE_DIR="${INSTALL_DIR}/systemd"
mkdir -p "${SERVICE_DIR}"

cat > "${SERVICE_DIR}/watchdog-agent.service" << 'SERVICE_EOF'
[Unit]
Description=Watchdog Agent - 守护 node/nginx/mysql 进程
After=network.target mysql.service nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/watchdog/agent
ExecStart=/usr/bin/node /opt/watchdog/agent/agent.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=watchdog-agent

[Install]
WantedBy=multi-user.target
SERVICE_EOF

cat > "${SERVICE_DIR}/watchdog-server.service" << SERVICE_EOF
[Unit]
Description=Watchdog Server - API + B/S 管理面板
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/watchdog/server
Environment=WATCHDOG_PORT=3090
Environment=DB_HOST=${DB_HOST}
Environment=DB_PORT=${DB_PORT}
Environment=DB_USER=${DB_USER}
Environment=DB_PASS=${DB_PASS}
Environment=DB_NAME=${DB_NAME}
ExecStart=/usr/bin/node /opt/watchdog/server/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=watchdog-server

[Install]
WantedBy=multi-user.target
SERVICE_EOF

cp "${SERVICE_DIR}/watchdog-agent.service" /etc/systemd/system/
cp "${SERVICE_DIR}/watchdog-server.service" /etc/systemd/system/
systemctl daemon-reload

systemctl enable watchdog-agent
systemctl enable watchdog-server

systemctl start watchdog-server
sleep 2
systemctl start watchdog-agent

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "  服务状态:"
echo "  ---------"
systemctl status watchdog-agent --no-pager -l 2>/dev/null || true
echo ""
systemctl status watchdog-server --no-pager -l 2>/dev/null || true
echo ""
echo "  管理命令:"
echo "  systemctl start|stop|restart|status watchdog-agent"
echo "  systemctl start|stop|restart|status watchdog-server"
echo ""
echo "  日志查看:"
echo "  journalctl -u watchdog-agent -f"
echo "  journalctl -u watchdog-server -f"
echo "  tail -f /opt/watchdog/logs/watchdog-agent-*.log"
echo ""
echo "  B/S 面板: http://$(hostname -I | awk '{print $1}'):3090"
echo ""
echo -e "${YELLOW}  请编辑 /opt/watchdog/agent/config.json 配置:${NC}"
echo "  - host_id / host_name（主机标识）"
echo "  - server_url（指向本机 http://127.0.0.1:3090/api）"
echo "  - processes 中的 start_cmd / stop_cmd（根据实际服务名调整）"
echo ""