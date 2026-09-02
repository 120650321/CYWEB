# ==========================================================
# 云南驰耀科技企业官网 - 多阶段构建
# 前台 (Vue3) + 后台 (Vue3/Element Plus) + 服务端 (Node/Express/SQLite)
# ==========================================================

# ---------- Stage 1: 安装依赖 ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY frontend/package.json frontend/
COPY admin/package.json admin/
RUN npm ci --no-audit --no-fund

# ---------- Stage 2: 构建前端与后台 ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/package.json server/
COPY --from=deps /app/frontend/package.json frontend/
COPY --from=deps /app/admin/package.json admin/
COPY package.json ./
COPY server ./server
COPY frontend ./frontend
COPY admin ./admin
ENV NODE_ENV=production
RUN npm run build

# ---------- Stage 3: 运行 ----------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=Asia/Shanghai
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/package.json server/
COPY package.json ./
COPY server ./server
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/admin/dist ./admin/dist
EXPOSE 3000
VOLUME ["/app/server/data", "/app/server/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server/src/index.js"]
