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

  // watchdog 监控表
  const watchdogSQL = `
CREATE TABLE IF NOT EXISTS watchdog_hosts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host_id VARCHAR(64) NOT NULL UNIQUE,
  host_name VARCHAR(128) NOT NULL,
  host_os VARCHAR(32) NOT NULL DEFAULT '',
  host_ip VARCHAR(64) DEFAULT '',
  agent_version VARCHAR(32) DEFAULT '',
  last_heartbeat DATETIME,
  status TINYINT DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_host_status (status),
  INDEX idx_host_heartbeat (last_heartbeat)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watchdog_sysinfo (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host_id VARCHAR(64) NOT NULL,
  host_name VARCHAR(128) DEFAULT '',
  cpu_usage DECIMAL(5,2) DEFAULT 0,
  mem_total INT DEFAULT 0,
  mem_used INT DEFAULT 0,
  mem_percent DECIMAL(5,2) DEFAULT 0,
  disk_total INT DEFAULT 0,
  disk_used INT DEFAULT 0,
  disk_percent DECIMAL(5,2) DEFAULT 0,
  load_1 DECIMAL(5,2) DEFAULT 0,
  load_5 DECIMAL(5,2) DEFAULT 0,
  load_15 DECIMAL(5,2) DEFAULT 0,
  uptime INT DEFAULT 0,
  net_rx BIGINT DEFAULT 0,
  net_tx BIGINT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_si_host (host_id),
  INDEX idx_si_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS watchdog_process_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  host_id VARCHAR(64) NOT NULL,
  process_list LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_pl_host (host_id),
  INDEX idx_pl_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

  await conn.query(watchdogSQL);
  console.log("[ok] watchdog_hosts 表创建成功");
  console.log("[ok] watchdog_config 表创建成功");
  console.log("[ok] watchdog_event_log 表创建成功");
  console.log("[ok] watchdog_sysinfo 表创建成功");
  console.log("[ok] watchdog_process_list 表创建成功");

  await conn.end();
  console.log("[ok] 迁移完成");
} catch (e) {
  console.error("[err]", e.message);
  process.exit(1);
}