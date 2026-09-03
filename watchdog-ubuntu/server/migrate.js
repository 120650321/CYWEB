import mysql2 from "mysql2/promise";

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "root";
const DB_NAME = process.env.DB_NAME || "watchdog";

async function migrate() {
  let conn = await mysql2.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS,
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();

  conn = await mysql2.createConnection({
    host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME,
  });

  await conn.query(`
    CREATE TABLE IF NOT EXISTS watchdog_hosts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      host_id VARCHAR(64) NOT NULL UNIQUE,
      host_name VARCHAR(128) NOT NULL,
      host_os VARCHAR(64) DEFAULT '',
      host_ip VARCHAR(64) DEFAULT '',
      agent_version VARCHAR(32) DEFAULT '',
      last_heartbeat DATETIME,
      status TINYINT DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wh_status (status),
      INDEX idx_wh_heartbeat (last_heartbeat)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("[ok] watchdog_hosts");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS watchdog_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      host_id VARCHAR(64) NOT NULL,
      process_name VARCHAR(64) NOT NULL,
      process_display VARCHAR(128) NOT NULL,
      check_command VARCHAR(255) NOT NULL,
      start_command VARCHAR(255) NOT NULL,
      stop_command VARCHAR(255) DEFAULT '',
      check_interval INT DEFAULT 30,
      max_restart INT DEFAULT 5,
      restart_window INT DEFAULT 600,
      enabled TINYINT DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_wc_host (host_id),
      UNIQUE KEY uk_host_process (host_id, process_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("[ok] watchdog_config");

  await conn.query(`
    CREATE TABLE IF NOT EXISTS watchdog_event_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      host_id VARCHAR(64) NOT NULL,
      process_name VARCHAR(64) NOT NULL,
      event_type VARCHAR(32) NOT NULL,
      level VARCHAR(16) NOT NULL DEFAULT 'info',
      message TEXT,
      pid INT DEFAULT 0,
      cpu_percent DECIMAL(5,1) DEFAULT 0,
      mem_mb DECIMAL(10,1) DEFAULT 0,
      restart_count INT DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_wel_host (host_id),
      INDEX idx_wel_process (process_name),
      INDEX idx_wel_type (event_type),
      INDEX idx_wel_level (level),
      INDEX idx_wel_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("[ok] watchdog_event_log");

  await conn.end();
  console.log("[ok] 迁移完成");
}

migrate().catch((e) => { console.error("迁移失败:", e.message); process.exit(1); });