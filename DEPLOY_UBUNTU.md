# CYWEB 项目 — Ubuntu 部署说明（生产环境）

本文档指导如何在 Ubuntu（20.04 / 22.04 / 24.04）上部署本项目（前台 `frontend`、后台 `admin`、后端 `server`）。包含两种可选部署方式：原生 Node.js + systemd（或 PM2）和 Docker Compose。文档按步骤给出所需命令与示例配置。

**概览**
- 代码位置：/opt/chiyao（示例，可按需修改）
- 运行端口（生产）：后端 `3000`（后端同时托管前台与后台）
- 数据存储：默认 SQLite（`server/data/chiyao.sqlite`）；可选 MySQL（通过环境变量配置）

---

## 前置要求
- Ubuntu 20.04 / 22.04 / 24.04
- Node.js >= 24（官方或 NodeSource / nvm 安装）
- Git
- 可选：Docker & Docker Compose（如使用容器部署）

推荐使用 `nvm` 管理 Node.js：

```bash
# 安装 nvm（若已安装可跳过）
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.6/install.sh | bash
source ~/.bashrc
# 安装并切换到 Node.js 24
nvm install 24
nvm use 24
node -v
```

### 安装系统依赖

```bash
sudo apt update
sudo apt install -y git build-essential curl nginx
```

---

## 获取代码并安装依赖

```bash
# 在目标目录（示例 /opt/chiyao）
sudo mkdir -p /opt/chiyao
sudo chown $USER:$USER /opt/chiyao
cd /opt/chiyao
# 克隆仓库
git clone <your-repo-url> .
# 安装依赖（root workspace 会安装所有 workspace 依赖）
npm install
```

备注：根目录的 `package.json` 使用了 workspaces，`npm install` 会为 `server`、`frontend`、`admin` 安装依赖。

---

## 生产构建（生成静态包）

```bash
# 构建前台与后台到 dist
npm run build
```

构建完成后，会在 `frontend/dist` 与 `admin/dist` 生成静态文件，后端在生产模式下会自动托管这些静态目录。

---

## 配置环境变量

在生产环境，需要至少设置 `NODE_ENV=production`。推荐创建 `.env.production` 或在 systemd/pm2 中设置。常用变量：

- `PORT`（后端监听端口，默认 3000）
- `JWT_SECRET`（必须在生产中设置为安全随机值）
- 可选 MySQL 配置（若不使用 SQLite）：`DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`
- `UPLOAD_DIR`（自定义上传目录）

示例：

```bash
export NODE_ENV=production
export PORT=3000
export JWT_SECRET="your-strong-secret-here"
# 若使用 MySQL：
# export DB_HOST=127.0.0.1
# export DB_PORT=3306
# export DB_USER=chiyao
# export DB_PASSWORD=secret
# export DB_NAME=chiyao_site
```

---

## 启动方式 A：systemd（推荐简洁、可随系统启动）

1. 创建可执行启动脚本（可选）：`/opt/chiyao/run-server.sh`

```bash
#!/usr/bin/env bash
cd /opt/chiyao
export NODE_ENV=production
export PORT=3000
export JWT_SECRET="your-strong-secret"
# 若使用 MySQL，一并 export
# export DB_HOST=127.0.0.1
# export DB_USER=...
# 
# 启动
exec npm start >> /var/log/chiyao-server.log 2>&1
```

```bash
sudo chmod +x /opt/chiyao/run-server.sh
```

2. 创建 systemd service 文件 `/etc/systemd/system/chiyao-site.service`：

```ini
[Unit]
Description=ChiYao Website
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/chiyao
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=JWT_SECRET=your-strong-secret
# 如果使用 run-server.sh：
ExecStart=/opt/chiyao/run-server.sh
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

3. 启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable chiyao-site
sudo systemctl start chiyao-site
sudo systemctl status chiyao-site -l
# 查看日志
sudo journalctl -u chiyao-site -f
```

> 注意：确保 `User` 对 `/opt/chiyao/server/data`（SQLite 文件）和 `/opt/chiyao/server/uploads` 可写。

---

## 启动方式 B：PM2（进程管理器，可平滑重启）

```bash
# 安装 pm2（全局）
npm install -g pm2
# 在项目根目录启动
pm2 start --name chiyao-site "npm start --prefix /opt/chiyao"
# 保存并启动 pm2 在系统启动时恢复
pm2 save
pm2 startup systemd
```

查看日志：

```bash
pm2 logs chiyao-site --lines 200
```

---

## 反向代理（Nginx）与 HTTPS（Let's Encrypt）示例

示例 Nginx 配置 `/etc/nginx/sites-available/chiyao`：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        # 若直接由后端托管 uploads，可代理到后端
        proxy_pass http://127.0.0.1:3000/uploads/;
    }
}
```

启用并重载 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/chiyao /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

使用 Certbot 获取证书：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 可选：使用 Docker Compose（推荐容器化部署）

仓库包含 `docker-compose.yml` 与 `Dockerfile`，可直接构建镜像并运行容器：

```bash
# 在仓库根目录
docker compose up -d --build
# 查看日志
docker compose logs -f
```

卷映射会持久化 SQLite 数据与上传目录（参考 compose 文件）。生产环境同样需要设置 `JWT_SECRET` 环境变量。

---

## 初始化/迁移/种子数据

- 默认情况下，后端在首次启动时会自动创建所需表并插入幂等的种子数据（`admin`、`editor` 等账号）。
- 若使用 MySQL 并提前准备好数据库，也可单独运行：

```bash
# 在 server 目录下
cd server
node src/seed.js
# 或使用 npm 脚本
npm run seed --workspace server
```

---

## 防火墙与安全

```bash
# 允许 HTTP/HTTPS 与后端端口（按需）
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

- 生产环境强烈建议仅对外暴露 HTTP/HTTPS（80/443），将后端端口绑定到 localhost 并使用 Nginx 反向代理。

---

## 故障排查

- 查看 systemd 日志：`sudo journalctl -u chiyao-site -f`
- 查看 pm2 日志：`pm2 logs chiyao-site`
- 检查后端健康接口：`curl -sS http://127.0.0.1:3000/api/health`（应返回 JSON）
- 若前端在开发模式下无法代理后端（ECONNREFUSED），请确保后端已启动并监听正确端口，或检查 `vite` 的 `proxy` 配置。

常见错误及处理：
- `Table 'xxx' doesn't exist`：表初始化失败，检查数据库权限或查看日志；若使用 SQLite，确认 `server/data` 目录可写。
- `ECONNREFUSED`：后端未启动或监听地址/端口不匹配。

---

## 备份与恢复

- 备份 SQLite 数据库文件：`cp server/data/chiyao.sqlite /backup/chiyao.sqlite.bak`
- 若使用 MySQL，使用 `mysqldump` 导出：

```bash
mysqldump -u root -p chiyao_site > chiyao_site.sql
```

---

## 附录：常用命令速查

```bash
# 更新代码并重启 systemd 服务
cd /opt/chiyao
git pull
npm install
npm run build
sudo systemctl restart chiyao-site

# 使用 Docker 部署
docker compose pull
docker compose up -d --build

# 检查健康
curl -sS http://127.0.0.1:3000/api/health | jq
```

---

如需我将上述部署步骤转成自动化脚本（Ansible playbook / shell 部署脚本）或生成 `systemd` 单元并替你应用，请回复明确要求，我会继续辅助。