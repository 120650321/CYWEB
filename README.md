# 云南驰耀科技有限公司企业官网

企业品牌官网（前台展示 + 后台管理双端一体），基于 `design_assets/` 开发文档规范与 UI 设计稿实现，采用企业蓝白科技风格。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 前台网站 | Vue 3 + TypeScript + Vite + Pinia + Vue Router（自定义组件，无 UI 框架依赖） |
| 后台管理 | Vue 3 + TypeScript + Vite + Element Plus + ECharts |
| 后端服务 | Node.js 24 + Express + 内置 `node:sqlite`（零原生依赖） |
| 认证鉴权 | JWT + scrypt 密码哈希 + 角色权限（superadmin / editor / operator） |
| 文件上传 | Multer 2.x（图片 / 文件分目录存储） |

## 目录结构

```
CYWEB/
├── server/            # 后端服务（Express + SQLite）
│   ├── src/
│   │   ├── index.js       # 入口（含生产模式静态托管）
│   │   ├── config.js      # 端口、JWT、站点信息配置
│   │   ├── db.js          # node:sqlite 数据层（20+ 张表）
│   │   ├── seed.js        # 幂等种子数据
│   │   ├── auth.js        # 认证与权限中间件
│   │   └── routes/        # public（前台）/ admin（后台）/ upload
│   └── data/              # SQLite 数据库文件
├── frontend/          # 前台网站（端口 5173）
│   └── src/
│       ├── views/         # 首页/关于/产品/方案/案例/下载/新闻/联系
│       ├── components/    # AppHeader/AppFooter/卡片/Reveal 动画等
│       ├── stores/        # Pinia 站点信息
│       └── api/           # 类型化 API 封装
├── admin/             # 后台管理（端口 5174）
│   └── src/
│       ├── layout/        # AdminLayout（深蓝侧边栏）
│       ├── views/         # 仪表盘/内容管理/留言/用户/角色/设置/日志
│       └── api/           # crudApi 工厂 + 上传封装
├── design_assets/     # 开发文档规范与 UI 设计稿
├── Dockerfile         # 多阶段构建
├── docker-compose.yml # 容器编排
└── start.bat / start.sh # 一键启动脚本
```

## 功能清单

### 前台（`/`）
- 首页：Banner 轮播、核心能力、产品展示、解决方案、数据统计、案例、新闻、合作伙伴、联系我们横幅
- 关于我们：公司简介、发展历程、资质荣誉、核心团队
- 产品中心：分类筛选 + 产品详情（参数表格）
- 解决方案：方案列表 + 详情（价值点、应用场景）
- 案例展示：行业分类筛选 + 案例详情
- 软件资料下载：分类浏览、文件下载、下载量统计、更新日志、系统要求
- 新闻资讯：分类（公司动态/行业资讯/技术分享）+ 置顶 + 详情
- 联系我们：联系信息 + 留言表单（提交后后台可处理回复）

### 后台（`/admin`）
- 登录 / 修改密码
- 仪表盘：统计卡片、7 日访问趋势（ECharts）、TOP 下载、最新留言
- 内容管理：Banner、产品（分类）、解决方案、案例（分类）、软件资料、新闻资讯
- 留言管理：待处理/处理中/已完成状态流转 + 回复
- 系统管理：用户、角色权限、系统设置（站点/关于我们/首页）、操作日志
- 按角色控制菜单与接口权限（superadmin 专属：用户/角色/日志）

## 快速开始

> 环境要求：Node.js >= 22.5（内置 `node:sqlite`）

### 开发模式

```bash
# Windows
start.bat

# Linux / macOS
./start.sh

# 或手动：
npm install
npm run dev
```

启动后：

| 服务 | 地址 |
| --- | --- |
| 前台网站 | http://localhost:5173 |
| 后台管理 | http://localhost:5174 |
| 后端 API | http://localhost:3000（健康检查 `/api/health`） |

### 默认账号

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 超级管理员 | `admin` | `admin123` |
| 内容编辑 | `editor` | `editor123` |

> 首次登录后请及时修改密码；生产环境请设置环境变量 `JWT_SECRET` 为强随机值。

### 构建生产包

```bash
npm run build        # 构建 frontend + admin 到各 dist 目录
npm start            # 启动生产服务（NODE_ENV=production 时同时托管前台与后台）
```

生产模式下：
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin
- 数据持久化：`server/data/`（SQLite）、`server/uploads/`（上传文件）

## Docker 部署

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f

# 停止
docker compose down
```

- 服务端口：`3000`（可通过 compose 修改）
- 数据库与上传文件通过命名卷持久化
- 生产环境建议通过环境变量注入 `JWT_SECRET`

如服务器已有 Nginx，可将 `ports` 注释掉，仅构建镜像后接入内网端口。

## API 概览

| 分组 | 路径 | 说明 |
| --- | --- | --- |
| 前台 | `/api/public/*` | 站点信息、Banner、产品、方案、案例、下载、文章、留言提交（开放） |
| 后台 | `/api/admin/*` | 登录、各模块 CRUD、统计、消息处理、日志（JWT 鉴权） |
| 上传 | `/api/upload` | 图片 / 文件上传（JWT 鉴权） |
| 静态 | `/uploads/*` | 上传文件访问 |

## 说明

- 图片素材：无真实图片时前台使用渐变占位组件（`PlaceholderImage`）与图标映射展示。
- 备案信息：滇ICP备2024047880号-1（可在后台「系统设置」中维护）。
