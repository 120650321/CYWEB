import express from "express";
import cors from "cors";
import compression from "compression";
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

// watchdog 模块可选加载，不存在时跳过
let watchdogRoutes = null;
try {
  const watchdogModule = await import("./routes/watchdog.js");
  watchdogRoutes = watchdogModule.default;
} catch {
  console.warn("[server] watchdog 模块未找到，跳过看门狗功能");
}

// 全局异常捕获，防止进程因未捕获异常而崩溃
process.on("uncaughtException", (err) => { console.error("[uncaughtException]", err); });
process.on("unhandledRejection", (reason) => { console.error("[unhandledRejection]", reason); });
process.on("SIGTERM", () => { console.log("[server] SIGTERM"); process.exit(0); });
process.on("SIGINT", () => { console.log("[server] SIGINT"); process.exit(0); });

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

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? (process.env.CORS_ORIGINS || "https://www.ynyzzn.com").split(",")
    : true,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// ── 安全响应头 ──
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-DNS-Prefetch-Control", "on");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.ynyzzn.com; " +
      "style-src 'self' 'unsafe-inline' https://www.ynyzzn.com; " +
      "img-src 'self' data: blob: https://www.ynyzzn.com; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://www.ynyzzn.com; " +
      "frame-src 'self'; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  }
  next();
});

// ── 全局速率限制 ──
const globalLimiter = rateLimit(200, 60000);
app.use("/api", globalLimiter);

// 对留言提交接口应用更严格的限流：每 IP 每分钟最多 5 次
app.use("/api/public/messages", rateLimit(5, 60000));
// 对登录接口应用限流：每 IP 每分钟最多 10 次
app.use("/api/admin/auth/login", rateLimit(10, 60000));

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
if (watchdogRoutes) {
  app.use("/api/watchdog", watchdogRoutes);
}

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
    app.use("/admin", (req, res, next) => {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      next();
    });
    app.use("/admin", express.static(adminDist, {
      setHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if ([".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".webp", ".gif"].includes(ext)) {
          res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        }
      },
    }));
    app.get(/^\/admin(?:\/.*)?$/, (req, res) => {
      res.sendFile(path.join(adminDist, "index.html"));
    });
  }

  // 前台首页（排除 /api /uploads /admin）
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist, {
      setHeaders(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if ([".js", ".css", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff", ".woff2", ".webp", ".gif"].includes(ext)) {
          res.setHeader("Cache-Control", "public, max-age=604800, immutable");
        } else if (ext === ".html") {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }));
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
  const isProd = process.env.NODE_ENV === 'production';
  const d1 = path.resolve(__dirname, '../../frontend/dist');
  const d2 = path.resolve(__dirname, '../../admin/dist');
  const ok1 = fs.existsSync(d1);
  const ok2 = fs.existsSync(d2);

  console.log('');
  console.log('========================================');
  console.log('  🚀  驰耀科技官网后端服务已启动');
  console.log('========================================');
  console.log('  运行模式 : ' + (isProd ? '🔵 生产模式' : '🟡 开发模式'));
  console.log('  监听端口 : ' + config.port);
  console.log('  站点名称 : ' + config.site.name);
  console.log('----------------------------------------');
  if (isProd) {
    console.log('  前台页面 : http://localhost:' + config.port);
    console.log('  后台管理 : http://localhost:' + config.port + '/admin');
    console.log('  健康检查 : http://localhost:' + config.port + '/api/health');
    console.log('  Sitemap  : http://localhost:' + config.port + '/api/public/sitemap.xml');
    console.log('----------------------------------------');
    console.log('  前台构建 : ' + (ok1 ? '✅ 已就绪' : '❌ 未构建'));
    console.log('  后台构建 : ' + (ok2 ? '✅ 已就绪' : '❌ 未构建'));
  } else {
    console.log('  API 地址 : http://localhost:' + config.port + '/api');
    console.log('  健康检查 : http://localhost:' + config.port + '/api/health');
    console.log('  ⚠ 开发模式请使用 npm run dev 启动前端');
  }
  console.log('----------------------------------------');
  console.log('  上传目录 : ' + config.uploadDir);
  console.log('========================================');
  console.log('');
});