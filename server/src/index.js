import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { seed } from "./seed.js";
import { initDb, dbConnected } from "./db.js";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/upload.js";
import { fail } from "./utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 简易内存限流器
const rateLimit = (maxRequests = 10, windowMs = 60000) => {
  const store = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store) {
      if (now - record.resetTime > windowMs) store.delete(key);
    }
  }, windowMs);
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let record = store.get(key);
    if (!record || now - record.resetTime > windowMs) {
      record = { count: 0, resetTime: now + windowMs };
      store.set(key, record);
    }
    record.count++;
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - record.count));
    if (record.count > maxRequests) {
      return res.status(429).json({ code: 429, message: "请求过于频繁，请稍后再试" });
    }
    next();
  };
};

// 等待数据库表初始化，然后初始化种子数据（幂等，异步）
await initDb;
if (dbConnected()) {
  await seed();
} else {
  console.warn("[server] 数据库未连接，跳过种子数据初始化");
}

const app = express();

app.set("trust proxy", true);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// 对留言提交接口应用限流：每 IP 每分钟最多 5 次
app.use("/api/public/messages", rateLimit(5, 60000));

// 静态资源（上传文件）
app.use(
  config.publicBase,
  express.static(path.join(config.uploadDir), {
    setHeaders(res, filePath) {
      const ext = path.extname(filePath).toLowerCase();
      if ([".pdf", ".zip", ".rar", ".exe", ".img", ".iso"].includes(ext)) {
        res.setHeader("Content-Disposition", "attachment");
      }
    },
  })
);

// API 路由
app.use("/api/public", publicRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/upload", uploadRoutes);

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ code: 0, message: "ok", data: { name: config.site.name, time: new Date().toISOString() } });
});

// 生产模式：托管前端与后台静态资源（单容器部署）
if (process.env.NODE_ENV === "production") {
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  const adminDist = path.resolve(__dirname, "../../admin/dist");

  // 后台 /admin（Express 5 通配符改用正则）
  if (fs.existsSync(adminDist)) {
    app.use("/admin", express.static(adminDist));
    app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
      res.sendFile(path.join(adminDist, "index.html"));
    });
  }

  // 前台首页（排除 /api /uploads /admin）
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get(/^(?!\/(api|uploads|admin))/, (req, res) => {
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    console.warn("[warn] frontend/dist 不存在，前台页面不可用（请先执行 npm run build）");
  }
}

// 404
app.use("/api", (req, res) => fail(res, 404, "接口不存在"));

// 错误处理
app.use((err, req, res, next) => {
  console.error("[error]", err);
  res.status(500).json({ code: 500, message: err.message || "服务器内部错误" });
});

app.listen(config.port, () => {
  console.log("========================================");
  console.log(`  🚀 驰耀科技官网后端服务已启动`);
  console.log(`  ➜ 地址: http://localhost:${config.port}`);
  console.log(`  ➜ 健康检查: http://localhost:${config.port}/api/health`);
  console.log(`  ➜ 上传目录: ${config.uploadDir}`);
  console.log("========================================");
});