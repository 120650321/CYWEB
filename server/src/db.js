import mysql from "mysql2/promise";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

// 本项目仅支持 MySQL 数据库模式
// 如需使用 SQLite，请参考 git 历史中的 better-sqlite3 实现

fs.mkdirSync(config.uploadDir, { recursive: true });

const { host, port, user, password, database } = config.db;

let pool = null;
let connected = false;

try {
  // 首次连接：尝试创建数据库（如果是 MySQL 可用）
  const init = await mysql.createConnection({ host, port, user, password, connectTimeout: 2000 });
  await init.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await init.end();

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4_unicode_ci",
    // DATETIME 以字符串返回，保持与前端展示兼容
    dateStrings: true,
    namedPlaceholders: false,
  });

  // 监听连接池错误，防止未捕获异常导致进程崩溃
  pool.on("error", (err) => {
    console.error("[db] 连接池错误:", err.message);
    if (err.code === "PROTOCOL_CONNECTION_LOST" || err.code === "ECONNREFUSED") {
      console.warn("[db] 数据库连接丢失，请检查 MySQL 服务状态");
    }
  });

  connected = true;
  console.log("[db] 已连接到 MySQL 数据库", host + ":" + port, "数据库:", database);
} catch (e) {
  console.warn("[db] 无法连接到 MySQL，已降级为未连接模式：", e.message);
  // pool 保持为 null，下面导出兼容接口但在调用时抛出清晰错误
}

export const poolRef = pool; // 供调试或特殊场景使用（可能为 null）
export const dbConnected = () => connected;

export async function query(sql, params = []) {
  if (!connected || !pool) throw new Error("数据库未连接");
  const [rows] = await pool.query(sql, params);
  return rows;
}

// 兼容原 db.prepare(...).get/all/run 调用模式（异步）
export const db = {
  prepare(sql) {
    if (!connected || !pool) {
      return {
        get: async () => {
          throw new Error("数据库未连接：无法执行查询");
        },
        all: async () => {
          throw new Error("数据库未连接：无法执行查询");
        },
        run: async () => {
          throw new Error("数据库未连接：无法执行写入操作");
        },
      };
    }
    return {
      get: async (...params) => {
        const [rows] = await pool.query(sql, params);
        return rows[0];
      },
      all: async (...params) => {
        const [rows] = await pool.query(sql, params);
        return rows;
      },
      run: async (...params) => {
        const [result] = await pool.query(sql, params);
        return {
          changes: result.affectedRows,
          affectedRows: result.affectedRows,
          insertId: result.insertId,
          lastInsertRowid: result.insertId,
        };
      },
    };
  },
  async exec(sql) {
    if (!connected || !pool) throw new Error("数据库未连接：无法执行 SQL 脚本");
    // mysql2 默认不支持多语句，逐条执行
    const stmts = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const s of stmts) {
      if (s) await pool.query(s);
    }
  },
  query,
};

// 便捷工具函数（全部异步）
export async function rows(table, where = "", params = []) {
  return query(`SELECT * FROM \`${table}\` ${where}`.trimEnd(), params);
}

export async function row(table, where = "", params = []) {
  const r = await rows(table, where, params);
  return r[0];
}

export async function get(table, id) {
  const r = await query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id]);
  return r[0];
}

export async function insert(table, data) {
  const keys = Object.keys(data);
  const marks = keys.map(() => "?").join(",");
  const sql = `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(",")}) VALUES (${marks})`;
  const [result] = await pool.query(sql, Object.values(data));
  return result.insertId;
}

export async function update(table, id, data) {
  const keys = Object.keys(data);
  const sets = keys.map((k) => `\`${k}\` = ?`).join(",");
  const sql = `UPDATE \`${table}\` SET ${sets} WHERE id = ?`;
  const [result] = await pool.query(sql, [...Object.values(data), id]);
  return result;
}

export async function remove(table, id) {
  const [result] = await pool.query(`DELETE FROM \`${table}\` WHERE id = ?`, [id]);
  return result;
}

export async function count(table, where = "", params = []) {
  const r = await query(`SELECT COUNT(*) AS c FROM \`${table}\` ${where}`, params);
  return Number(r[0].c);
}

export function parseJSON(str, fallback) {
  if (str === undefined || str === null || str === "") return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'editor',
  phone VARCHAR(30) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  status TINYINT NOT NULL DEFAULT 1,
  must_change_password TINYINT NOT NULL DEFAULT 0,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255) DEFAULT '',
  permissions TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banners (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL DEFAULT '',
  subtitle VARCHAR(255) DEFAULT '',
  slogan VARCHAR(255) DEFAULT '',
  image VARCHAR(500) DEFAULT '',
  bg_color VARCHAR(20) DEFAULT '#0A1633',
  link VARCHAR(255) DEFAULT '',
  button_text VARCHAR(100) DEFAULT '',
  sort INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) DEFAULT '',
  description VARCHAR(255) DEFAULT '',
  sort INT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  model VARCHAR(100) DEFAULT '',
  cover VARCHAR(500) DEFAULT '',
  images TEXT NULL,
  intro VARCHAR(500) DEFAULT '',
  detail TEXT NULL,
  params TEXT NULL,
  docs TEXT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  sort INT NOT NULL DEFAULT 0,
  seo_title VARCHAR(255) DEFAULT '',
  seo_keywords VARCHAR(255) DEFAULT '',
  seo_description VARCHAR(500) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES product_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solutions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  industry VARCHAR(100) DEFAULT '',
  cover VARCHAR(500) DEFAULT '',
  images TEXT NULL,
  intro VARCHAR(500) DEFAULT '',
  detail TEXT NULL,
  scenario TEXT NULL,
  architecture TEXT NULL,
  value_points TEXT NULL,
  related_products TEXT NULL,
  related_cases TEXT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  sort INT NOT NULL DEFAULT 0,
  seo_title VARCHAR(255) DEFAULT '',
  seo_keywords VARCHAR(255) DEFAULT '',
  seo_description VARCHAR(500) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS case_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  cover VARCHAR(500) DEFAULT '',
  images TEXT NULL,
  intro VARCHAR(500) DEFAULT '',
  detail TEXT NULL,
  tags TEXT NULL,
  results TEXT NULL,
  related_products TEXT NULL,
  related_solutions TEXT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  sort INT NOT NULL DEFAULT 0,
  seo_title VARCHAR(255) DEFAULT '',
  seo_keywords VARCHAR(255) DEFAULT '',
  seo_description VARCHAR(500) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cases_category FOREIGN KEY (category_id) REFERENCES case_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS download_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS downloads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  icon VARCHAR(50) DEFAULT '',
  intro VARCHAR(500) DEFAULT '',
  detail TEXT NULL,
  version VARCHAR(50) DEFAULT '',
  files TEXT NULL,
  size VARCHAR(50) DEFAULT '',
  update_log TEXT NULL,
  system_require VARCHAR(255) DEFAULT '',
  download_count INT NOT NULL DEFAULT 0,
  related_products TEXT NULL,
  status TINYINT NOT NULL DEFAULT 1,
  sort INT NOT NULL DEFAULT 0,
  seo_title VARCHAR(255) DEFAULT '',
  seo_keywords VARCHAR(255) DEFAULT '',
  seo_description VARCHAR(500) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_downloads_category FOREIGN KEY (category_id) REFERENCES download_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(20) NOT NULL DEFAULT 'company',
  title VARCHAR(255) NOT NULL,
  cover VARCHAR(500) DEFAULT '',
  summary VARCHAR(500) DEFAULT '',
  content TEXT NULL,
  tags TEXT NULL,
  author VARCHAR(50) DEFAULT '',
  views INT NOT NULL DEFAULT 0,
  is_top TINYINT NOT NULL DEFAULT 0,
  status TINYINT NOT NULL DEFAULT 1,
  publish_time DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  phone VARCHAR(30) NOT NULL,
  email VARCHAR(100) DEFAULT '',
  subject VARCHAR(200) DEFAULT '',
  content TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reply TEXT NULL,
  replied_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  \`key\` VARCHAR(100) PRIMARY KEY,
  \`value\` TEXT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  username VARCHAR(50) DEFAULT '',
  action VARCHAR(100) NOT NULL,
  detail VARCHAR(500) DEFAULT '',
  ip VARCHAR(50) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS about_us (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(100) NOT NULL DEFAULT '关于我们',
  intro VARCHAR(500) DEFAULT '',
  content TEXT NULL,
  history TEXT NULL,
  honors TEXT NULL,
  team TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS homepage_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  capability_title VARCHAR(100) NOT NULL DEFAULT '核心能力',
  capability_desc VARCHAR(255) DEFAULT '',
  capabilities TEXT NULL,
  partners TEXT NULL,
  contact_banner_title VARCHAR(100) NOT NULL DEFAULT '开启智慧物联合作',
  contact_banner_desc VARCHAR(500) DEFAULT '',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS visit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL DEFAULT '',
  page_path VARCHAR(255) NOT NULL,
  page_title VARCHAR(100) DEFAULT '',
  ip VARCHAR(50) DEFAULT '',
  user_agent VARCHAR(500) DEFAULT '',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_visit_created (created_at),
  INDEX idx_visit_visitor (visitor_id),
  INDEX idx_visit_page (page_path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const initDb = (async () => {
  if (!connected) {
    console.warn("[db] 跳过表初始化：数据库未连接");
    return;
  }
  try {
    await db.exec(SCHEMA_SQL);
    console.log("[db] 数据表初始化完成");

    const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'must_change_password'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN must_change_password TINYINT NOT NULL DEFAULT 0 AFTER status");
      console.log("[db] 已添加 must_change_password 字段");
    }
  } catch (e) {
    console.error("[db] 表初始化失败：", e.message);
    throw e;
  }
})();