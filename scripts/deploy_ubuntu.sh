#!/usr/bin/env bash
# 一键部署脚本：适用于 Ubuntu 20.04/22.04/24.04
# 用法示例：
# sudo ./deploy_ubuntu.sh -r https://github.com/your/repo.git -b main -d /opt/chiyao -u chiyao -D example.com

set -euo pipefail
IFS=$'\n\t'

REPO_URL=""
BRANCH="main"
TARGET_DIR="/opt/chiyao"
DEPLOY_USER="$(whoami)"
PORT=3000
DOMAIN=""
USE_DOCKER=0
# 默认系统包安装列表
PKGS=(git curl nginx certbot python3-certbot-nginx jq)

usage(){
  cat <<EOF
Usage: sudo $0 [options]
Options:
  -r REPO_URL      Git 仓库地址（必填，除非代码已存在 TARGET_DIR）
  -b BRANCH        Git 分支，默认 main
  -d TARGET_DIR    部署目录，默认 /opt/chiyao
  -u DEPLOY_USER   运行服务的用户，默认当前用户
  -p PORT          后端监听端口，默认 3000
  -D DOMAIN        配置域名并申请证书（可选）
  --docker         使用 Docker Compose 部署（优先），需已安装 Docker
  -h               帮助
Example:
  sudo $0 -r https://github.com/your/repo.git -d /opt/chiyao -u www-data -D example.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -r) REPO_URL="$2"; shift 2;;
    -b) BRANCH="$2"; shift 2;;
    -d) TARGET_DIR="$2"; shift 2;;
    -u) DEPLOY_USER="$2"; shift 2;;
    -p) PORT="$2"; shift 2;;
    -D) DOMAIN="$2"; shift 2;;
    --docker) USE_DOCKER=1; shift ;;
    -h) usage; exit 0;;
    *) echo "Unknown option: $1"; usage; exit 1;;
  esac
done

if [[ $EUID -ne 0 ]]; then
  echo "请以 sudo 或 root 身份运行此脚本。"
  exit 1
fi

echo "一键部署开始"
echo "目标目录: $TARGET_DIR"
if [[ -n "$REPO_URL" ]]; then
  echo "仓库: $REPO_URL (分支: $BRANCH)"
fi
if [[ -n "$DOMAIN" ]]; then
  echo "域名: $DOMAIN";
fi

# 安装基础依赖
echo "[1/8] 安装系统依赖"
apt update -y
apt install -y "${PKGS[@]}" build-essential

# 可选：安装 Docker（如果选择 docker）
if [[ $USE_DOCKER -eq 1 ]]; then
  echo "[info] 使用 Docker 部署：检查 Docker 是否已安装"
  if ! command -v docker >/dev/null 2>&1; then
    echo "安装 Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker --now
  fi
  if ! command -v docker-compose >/dev/null 2>&1; then
    echo "安装 docker-compose 插件..."
    apt install -y docker-compose-plugin
  fi
fi

# 安装 Node.js 24（NodeSource）
if [[ $USE_DOCKER -eq 0 ]]; then
  echo "[2/8] 安装 Node.js 24"
  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v24* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs
  else
    echo "检测到 Node 版本: $(node -v)"
  fi
fi

# 创建部署用户与目录
echo "[3/8] 准备部署目录与用户"
mkdir -p "$TARGET_DIR"
if ! id -u "$DEPLOY_USER" >/dev/null 2>&1; then
  echo "创建用户 $DEPLOY_USER"
  useradd --system --create-home --shell /usr/sbin/nologin "$DEPLOY_USER" || true
fi
chown -R "$DEPLOY_USER":"$DEPLOY_USER" "$TARGET_DIR"

# 获取代码
if [[ -n "$REPO_URL" ]]; then
  echo "[4/8] 克隆或更新仓库"
  if [[ -d "$TARGET_DIR/.git" ]]; then
    echo "仓库已存在，拉取最新代码"
    sudo -u "$DEPLOY_USER" git -C "$TARGET_DIR" fetch --all
    sudo -u "$DEPLOY_USER" git -C "$TARGET_DIR" checkout "$BRANCH"
    sudo -u "$DEPLOY_USER" git -C "$TARGET_DIR" pull origin "$BRANCH"
  else
    echo "克隆仓库到 $TARGET_DIR"
    sudo -u "$DEPLOY_USER" git clone --branch "$BRANCH" "$REPO_URL" "$TARGET_DIR"
  fi
else
  echo "未提供仓库地址，假定代码已在 $TARGET_DIR"
fi

# 安装依赖并构建
if [[ $USE_DOCKER -eq 0 ]]; then
  echo "[5/8] 安装 Node 依赖并构建前端/后台静态文件"
  cd "$TARGET_DIR"
  # 使用根工作区安装（workspaces）
  npm install --no-audit --no-fund
  npm run build || true
else
  echo "[5/8] 使用 Docker Compose 构建镜像并运行容器"
  cd "$TARGET_DIR"
  docker compose up -d --build
  echo "部署完成（Docker）"
  exit 0
fi

# 创建 systemd 单元
echo "[6/8] 创建 systemd 服务"
SERVICE_FILE="/etc/systemd/system/chiyao-site.service"
cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=ChiYao Website
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$TARGET_DIR
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=JWT_SECRET=chiyao-tech-jwt-secret-2024
ExecStart=/usr/bin/env bash -lc 'cd $TARGET_DIR && npm start'
Restart=on-failure
RestartSec=5s
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=chiyao-site

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable chiyao-site
systemctl restart chiyao-site || true

# Nginx 配置
echo "[7/8] 写入 Nginx 配置并重载"
NGINX_SITE="/etc/nginx/sites-available/chiyao"
cat > "$NGINX_SITE" <<EOF
server {
    listen 80;
    server_name ${DOMAIN:-_};

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:$PORT/uploads/;
    }
}
EOF
ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/chiyao
nginx -t && systemctl reload nginx

# 申请 TLS（可选）
if [[ -n "$DOMAIN" ]]; then
  echo "[8/8] 使用 certbot 申请 TLS 证书（若交互式提示，请按提示）"
  certbot --nginx -d "$DOMAIN" || echo "certbot 获取证书失败，请手动运行 certbot。"
fi

echo "一键部署完成。访问: http://$(hostname -I | awk '{print $1}'):$PORT 或使用绑定域名访问"

# 显示服务状态
systemctl status chiyao-site --no-pager || true

echo "若需要回滚或重新部署：进入 $TARGET_DIR，执行 git checkout <commit> 并重启 systemd 服务。"
