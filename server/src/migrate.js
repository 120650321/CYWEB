import mysql from "mysql2/promise";
import { config } from "./config.js";

const { host, port, user, password, database } = config.db;

try {
  const conn = await mysql.createConnection({ host, port, user, password, database });
  
  const sql = `
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

  await conn.query(sql);
  console.log("[ok] visit_logs 表创建成功");

  const [cols] = await conn.query("DESCRIBE visit_logs");
  console.log("[ok] 字段列表:");
  cols.forEach((c) => console.log(`  ${c.Field.padEnd(18)} ${c.Type}`));

  await conn.end();
  console.log("[ok] 迁移完成");
} catch (e) {
  console.error("[err]", e.message);
  process.exit(1);
}