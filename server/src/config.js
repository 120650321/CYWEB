import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const DEFAULT_JWT_SECRET = "chiyao-tech-jwt-secret-2024";
const DEFAULT_DB_PASSWORD = "root";

const isProduction = process.env.NODE_ENV === "production";

function checkSecurity() {
  if (isProduction) {
    const warnings = [];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET) {
      warnings.push("JWT_SECRET 使用了默认值，请通过环境变量设置强随机密钥！");
    }
    if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === DEFAULT_DB_PASSWORD) {
      warnings.push("DB_PASSWORD 使用了默认值，请通过环境变量修改数据库密码！");
    }
    if (!process.env.CORS_ORIGINS || process.env.CORS_ORIGINS === "*") {
      warnings.push("CORS_ORIGINS 为通配符，请设置为具体域名！");
    }
    if (warnings.length > 0) {
      console.warn("\n========================================");
      console.warn("  [安全警告] 生产环境检测到默认配置：");
      warnings.forEach((w) => console.warn(`  - ${w}`));
      console.warn("========================================\n");
    }
  }
}

checkSecurity();

export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  jwtExpiresIn: "7d",
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || DEFAULT_DB_PASSWORD,
    database: process.env.DB_NAME || "chiyao_site",
  },
  // 当前仅支持 MySQL，dbFile 保留供未来 SQLite 支持
  dbFile: process.env.DB_FILE || path.join(ROOT, "data", "chiyao.sqlite"),
  uploadDir: process.env.UPLOAD_DIR || path.join(ROOT, "uploads"),
  publicBase: "/uploads",
  corsOrigins: (process.env.CORS_ORIGINS || "*").split(","),
  site: {
    name: "云南驰耀科技有限公司",
    shortName: "驰耀科技",
    enName: "CHIYAO TECHNOLOGY",
    domain: "ynyzzn.com",
    icp: "滇ICP备2024047880号-1",
    icpUrl: "https://beian.miit.gov.cn",
    icpDate: "2024-12-12",
    phone: "0871-6789 0000",
    mobile: "138 8888 0000",
    email: "info@ynyzzn.com",
    address: "云南省昆明市五华区高新技术产业开发区科技路88号",
    slogan: "智慧物联 · 科技赋能",
    description: "云南驰耀科技有限公司以物联网平台、智慧化解决方案、安防监控与信息化系统集成为核心业务方向。"
  }
};