# 云南驰耀科技有限公司企业官网 — 生产环境部署指南

---

## 一、项目概述

| 模块 | 技术栈 | 说明 |
|------|--------|------|
| 前台展示 (`frontend`) | Vue 3 + TypeScript + Vite + Pinia | 企业官网前端，面向公众访问 |
| 后台管理 (`admin`) | Vue 3 + TypeScript + Vite + Element Plus + ECharts | 后台管理系统，管理内容与数据 |
| 后端服务 (`server`) | Node.js + Express 5 + MySQL | API 服务，同时托管前端与后台静态资源 |

- **前端端口（开发）**：5173（前台）/ 5174（后台）
- **后端端口（生产）**：3000（统一入口，托管所有静态资源）
- **数据库**：MySQL 8.0+（必须）
- **Node.js**：>= 22.5.0（推荐 24.x）

---

## 二、项目结构

```
CYWEB/
├── frontend/          # 前台展示（Vue3）
│   ├── dist/          # 构建产物（npm run build 后生成）
│   ├── public/        # 静态资源（logo.png 等）
│   └── src/
├── admin/             # 后台管理（Vue3 + Element Plus）
│   ├── dist/          # 构建产物（npm run build 后生成）
│   ├── public/        # 静态资源
│   └── src/
├── server/            # 后端服务（Express）
│   ├── src/
│   │   ├── index.js   # 入口文件
│   │   ├── config.js  # 配置文件
│   │   ├── db.js      # 数据库连接与表结构定义
│   │   ├── seed.js    # 种子数据（初始化默认数据）
│   │   ├── migrate.js # 数据库迁移脚本
│   │   ├── auth.js    # 认证模块（JWT）
│   │   └── routes/    # 路由
│   ├── uploads/       # 上传文件目录（运行时生成）
│   └── data/          # 数据目录（预留）
├── package.json       # 根 package.json（workspaces）
├── Dockerfile         # Docker 多阶段构建
├── docker-compose.yml # Docker Compose 编排
└── DEPLOY.md          # 本部署说明
```

---

## 三、环境要求

### 3.1 服务器配置建议

| 项目 | 最低配置 | 推荐配置 |
|------|----------|----------|
| CPU | 2 核 | 4 核 |
| 内存 | 2 GB | 4 GB |
| 硬盘 | 20 GB | 50 GB+（含上传文件存储） |
| 操作系统 | Ubuntu 20.04/22.04/24.04 | Ubuntu 24.04 LTS |

### 3.2 软件依赖

- **Node.js** >= 22.5.0（推荐使用 nvm 管理）
- **MySQL** 8.0+
- **Nginx**（可选，用于反向代理和 HTTPS）
- **Git**（用于拉取代码）
- **Docker & Docker Compose**（可选，容器化部署）

---

## 四、数据库部署

### 4.1 安装 MySQL 8.0

```bash
# Ubuntu 安装 MySQL
sudo apt update
sudo apt install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

# 安全初始化（设置 root 密码等）
sudo mysql_secure_installation
```

### 4.2 创建数据库和用户

```sql
-- 登录 MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE IF NOT EXISTS chiyao_site
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 创建用户（请修改密码为强密码）
CREATE USER IF NOT EXISTS 'chiyao'@'localhost' IDENTIFIED BY 'your_strong_password_here';

-- 授权
GRANT ALL PRIVILEGES ON chiyao_site.* TO 'chiyao'@'localhost';
FLUSH PRIVILEGES;

-- 验证
SHOW DATABASES;
SELECT user, host FROM mysql.user WHERE user = 'chiyao';
EXIT;
```

### 4.3 导入预置数据库（推荐）

项目根目录已提供完整的数据库导出文件 `chiyao_site_production.sql`（237 KB），包含所有表结构和预置数据，可直接导入生产环境：

```bash
# 方式一：导入预置 SQL 文件（推荐，一步到位）
mysql -u chiyao -p chiyao_site < /opt/chiyao/chiyao_site_production.sql

# 方式二：使用 root 账号导入
mysql -u root -p < /opt/chiyao/chiyao_site_production.sql

# 验证导入
mysql -u chiyao -p -e "USE chiyao_site; SHOW TABLES; SELECT COUNT(*) AS users FROM users;"
```

> **说明**：SQL 文件包含 `CREATE DATABASE IF NOT EXISTS` 和 `DROP TABLE IF EXISTS` 语句，可安全重复执行。

### 4.4 数据表自动创建（备选方案）

如果不使用预置 SQL 文件，项目首次启动时也会自动创建表结构和种子数据：

1. 连接 MySQL 数据库
2. 自动创建所有数据表（`db.js` 中的 `SCHEMA_SQL`）
3. 自动插入种子数据（`seed.js`，包括管理员账号、默认分类、示例内容等）

### 4.5 数据表一览

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `users` | 管理员用户 | username, password_hash, role, status |
| `roles` | 角色权限 | name, code, permissions |
| `banners` | 首页轮播图 | title, subtitle, image, link, sort |
| `product_categories` | 产品分类 | name, icon, sort |
| `products` | 产品管理 | category_id, name, cover, detail, params |
| `solutions` | 解决方案 | name, industry, detail, architecture, value_points |
| `case_categories` | 案例分类 | name, sort |
| `cases` | 案例管理 | category_id, name, detail, tags, results |
| `download_categories` | 下载分类 | name, sort |
| `downloads` | 资料下载 | category_id, name, version, files, download_count |
| `articles` | 新闻资讯 | category, title, content, tags, publish_time |
| `messages` | 在线留言 | name, phone, content, status, reply |
| `settings` | 站点设置 | key-value 键值对 |
| `about_us` | 关于我们 | content, history, honors, team |
| `homepage_settings` | 首页配置 | capabilities, partners |
| `operation_logs` | 操作日志 | user_id, action, detail, ip |
| `visit_logs` | 访问日志 | visitor_id, page_path, ip, user_agent |

---

## 五、应用部署

### 5.1 获取代码并安装依赖

```bash
# 创建部署目录
sudo mkdir -p /opt/chiyao
sudo chown $USER:$USER /opt/chiyao
cd /opt/chiyao

# 方式一：从 Git 仓库克隆
git clone <your-repo-url> .

# 方式二：直接上传项目文件（确保包含所有源码）
# 使用 scp/rsync 上传整个项目目录到 /opt/chiyao

# 安装依赖（workspaces 模式，自动安装 server/frontend/admin 的依赖）
npm install
```

### 5.2 构建前端与后台

```bash
# 构建前台和后台的静态文件到 dist 目录
npm run build
```

构建完成后，确认以下目录存在：
- `frontend/dist/` — 前台静态文件
- `admin/dist/` — 后台管理静态文件

### 5.3 配置环境变量

创建 `.env` 文件或直接设置环境变量：

```bash
# 必须配置（生产环境）
export NODE_ENV=production
export PORT=3000

# 数据库配置（必填）
export DB_HOST=127.0.0.1
export DB_PORT=3306
export DB_USER=chiyao
export DB_PASSWORD=your_strong_password_here
export DB_NAME=chiyao_site

# JWT 密钥（必填，请使用随机强密钥）
export JWT_SECRET="$(openssl rand -base64 48)"

# 可选配置
export CORS_ORIGINS="https://your-domain.com"
export UPLOAD_DIR="/opt/chiyao/server/uploads"
```

> **安全提示**：生产环境**必须**修改 `JWT_SECRET` 和 `DB_PASSWORD`，否则启动时会显示安全警告。

### 5.4 启动服务

#### 方式 A：直接启动（测试用）

```bash
cd /opt/chiyao
npm start
```

#### 方式 B：systemd 服务（推荐 — 生产环境）

创建 systemd 服务文件 `/etc/systemd/system/chiyao-site.service`：

```ini
[Unit]
Description=ChiYao Technology Website
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/chiyao
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DB_HOST=127.0.0.1
Environment=DB_PORT=3306
Environment=DB_USER=chiyao
Environment=DB_PASSWORD=your_strong_password_here
Environment=DB_NAME=chiyao_site
Environment=JWT_SECRET=your_strong_jwt_secret_here
Environment=CORS_ORIGINS=https://your-domain.com
ExecStart=/usr/bin/node server/src/index.js
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
# 确保 www-data 用户有权限访问
sudo chown -R www-data:www-data /opt/chiyao
sudo chmod -R 755 /opt/chiyao

# 确保上传目录可写
sudo mkdir -p /opt/chiyao/server/uploads
sudo chown -R www-data:www-data /opt/chiyao/server/uploads

# 启用并启动
sudo systemctl daemon-reload
sudo systemctl enable chiyao-site
sudo systemctl start chiyao-site

# 查看状态和日志
sudo systemctl status chiyao-site -l
sudo journalctl -u chiyao-site -f
```

#### 方式 C：PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/src/index.js --name chiyao-site --cwd /opt/chiyao
pm2 save
pm2 startup systemd

# 查看日志
pm2 logs chiyao-site
pm2 status
```

#### 方式 D：Docker 部署

```bash
# 在项目根目录执行
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止服务
docker compose down
```

> Docker 部署会自动构建前端与后台，并将数据持久化到 Docker volumes `chiyao-data` 和 `chiyao-uploads`。

---

## 六、Nginx 反向代理配置（推荐）

### 6.1 安装 Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 6.2 配置站点

创建 `/etc/nginx/sites-available/chiyao`：

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # 上传文件大小限制（与 multer 200MB 保持一致）
    client_max_body_size 200m;

    # 访问日志
    access_log /var/log/nginx/chiyao-access.log;
    error_log /var/log/nginx/chiyao-error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000/uploads/;
        proxy_set_header Host $host;
    }
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/chiyao /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 配置 HTTPS（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取证书并自动配置
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo certbot renew --dry-run
```

---

## 七、首次访问与初始化

### 7.1 验证服务

```bash
# 健康检查
curl http://localhost:3000/api/health

# 预期返回：
# {"code":0,"message":"ok","data":{"name":"云南驰耀科技有限公司","time":"..."}}
```

### 7.2 访问地址

| 页面 | 地址 |
|------|------|
| 企业官网前台 | `http://your-domain.com` |
| 后台管理系统 | `http://your-domain.com/admin` |
| 健康检查 | `http://your-domain.com/api/health` |

### 7.3 默认管理员账号

首次启动后，系统会自动创建以下账号（**请立即修改密码**）：

| 用户名 | 默认密码 | 角色 | 说明 |
|--------|----------|------|------|
| `admin` | `admin123` | 超级管理员 | 全部权限 |
| `editor` | `editor123` | 内容编辑 | 产品/案例/方案/新闻内容管理 |

**首次登录后台后，系统会强制要求修改密码。**

---

## 八、数据库维护操作

### 8.1 备份数据库

```bash
# 全量备份
mysqldump -u chiyao -p chiyao_site > /backup/chiyao_$(date +%Y%m%d_%H%M%S).sql

# 设置定时备份（crontab）
# 每天凌晨 2 点备份
0 2 * * * mysqldump -u chiyao -p'your_password' chiyao_site > /backup/chiyao_$(date +\%Y\%m\%d).sql
```

### 8.2 恢复数据库

```bash
mysql -u chiyao -p chiyao_site < /backup/chiyao_20250101.sql
```

### 8.3 重新初始化种子数据

```bash
# 仅当需要重置演示数据时使用（不会删除已有数据）
cd /opt/chiyao
npm run seed --workspace server
```

### 8.4 运行数据库迁移

```bash
# 执行 visit_logs 表迁移（如之前未执行）
cd /opt/chiyao
node server/src/migrate.js
```

### 8.5 重置管理员密码

```sql
-- 登录 MySQL
mysql -u chiyao -p chiyao_site

-- 重置密码（需要先通过 Node.js 生成密码哈希）
-- 或者直接在应用中将用户标记为需要修改密码
UPDATE users SET must_change_password = 1 WHERE username = 'admin';
```

---

## 九、日常运维

### 9.1 查看日志

```bash
# systemd 方式
sudo journalctl -u chiyao-site -f --lines=100

# PM2 方式
pm2 logs chiyao-site --lines 100

# Docker 方式
docker compose logs -f --tail 100
```

### 9.2 更新部署

```bash
cd /opt/chiyao

# 拉取最新代码
git pull

# 安装新依赖（如有）
npm install

# 重新构建前端
npm run build

# 重启服务
sudo systemctl restart chiyao-site   # systemd
# 或
pm2 restart chiyao-site              # PM2
# 或
docker compose up -d --build         # Docker
```

### 9.3 监控磁盘空间

```bash
# 检查上传文件目录大小
du -sh /opt/chiyao/server/uploads/

# 检查数据库大小
mysql -u chiyao -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables WHERE table_schema = 'chiyao_site' GROUP BY table_schema;"
```

### 9.4 安全加固清单

- [ ] 修改 `JWT_SECRET` 为随机强密钥
- [ ] 修改 `DB_PASSWORD` 为非默认密码
- [ ] 修改 `admin` 和 `editor` 账号的默认密码
- [ ] 配置 `CORS_ORIGINS` 为具体域名
- [ ] 配置 HTTPS 证书
- [ ] 配置防火墙（仅开放 80/443 端口）
- [ ] 配置 MySQL 仅监听本地（`bind-address = 127.0.0.1`）
- [ ] 设置定期数据库备份
- [ ] 配置日志轮转（logrotate）

---

## 十、常见问题排查

### 10.1 服务无法启动

```bash
# 检查端口是否被占用
sudo lsof -i :3000

# 检查 MySQL 连接
mysql -u chiyao -p -h 127.0.0.1 -e "SELECT 1"

# 检查 Node.js 版本
node -v  # 需要 >= 22.5.0
```

### 10.2 页面 404

确认 `frontend/dist` 和 `admin/dist` 目录存在且包含 `index.html`。如果不存在，重新执行 `npm run build`。

### 10.3 上传文件失败

检查上传目录权限：
```bash
sudo chown -R www-data:www-data /opt/chiyao/server/uploads
sudo chmod -R 755 /opt/chiyao/server/uploads
```

### 10.4 数据库连接失败

```bash
# 检查 MySQL 服务状态
sudo systemctl status mysql

# 检查数据库和用户是否存在
mysql -u root -p -e "SHOW DATABASES;"
mysql -u root -p -e "SELECT user, host FROM mysql.user;"
```

---

## 十一、快速部署检查清单

- [ ] 1. 安装 Node.js >= 22.5.0
- [ ] 2. 安装 MySQL 8.0+
- [ ] 3. 创建数据库 `chiyao_site` 和用户
- [ ] 4. 部署项目代码到 `/opt/chiyao`
- [ ] 5. 执行 `npm install` 安装依赖
- [ ] 6. 执行 `npm run build` 构建前端
- [ ] 7. 配置环境变量（DB、JWT_SECRET）
- [ ] 8. 启动服务（systemd/PM2/Docker）
- [ ] 9. 验证 `curl http://localhost:3000/api/health`
- [ ] 10. 配置 Nginx 反向代理
- [ ] 11. 配置 HTTPS 证书
- [ ] 12. 登录后台修改默认密码
- [ ] 13. 配置数据库定时备份
- [ ] 14. 完成安全加固