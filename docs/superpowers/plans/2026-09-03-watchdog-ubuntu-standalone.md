# Ubuntu 独立看门狗部署包 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个独立、可直接在 Ubuntu 22.04/24.04 上一键安装的看门狗监控系统，守护 node/nginx/mysql 进程，提供 B/S 网页查看状态日志，systemd 托管开机自启。

**Architecture:** 纯 Node.js 实现，Agent 零依赖（仅用内置模块），Server 依赖 Express + MySQL2，Web 前端为单文件 HTML（Vue3 + Element Plus CDN），通过 systemd 托管两个服务。安装脚本完成所有初始化工作。

**Tech Stack:** Node.js 18+, Express, MySQL2, Vue3 CDN, Element Plus CDN, systemd

---

## 文件结构

```
watchdog-ubuntu/
├── install.sh                     # 一键安装脚本
├── README.md                      # 部署文档
├── agent/
│   ├── package.json               # 零依赖
│   ├── config.json                # 监控配置
│   └── agent.js                   # 核心监控+重启+上报逻辑
├── server/
│   ├── package.json               # express + mysql2
│   ├── server.js                  # Express API + 静态文件服务
│   ├── migrate.js                 # 建表脚本
│   └── public/
│       └── index.html             # 单文件 B/S 面板（Vue3 CDN）
└── systemd/
    ├── watchdog-agent.service     # agent systemd 单元
    └── watchdog-server.service    # server systemd 单元
```

| 文件 | 职责 |
|------|------|
| `install.sh` | 检测环境、安装依赖、建表、注册 systemd、启动服务 |
| `agent/agent.js` | 周期检测 node/nginx/mysql 存活，异常自动重启，本地日志落盘，HTTP 上报 |
| `agent/config.json` | 主机标识、服务端地址、进程列表、检测间隔、重启阈值 |
| `server/server.js` | Express 服务：接收上报 API + 查询 API + 静态文件托管 |
| `server/migrate.js` | 创建 watchdog 三张表 |
| `server/public/index.html` | 单文件 SPA：主机列表、进程卡片、日志表格 |
| `systemd/*.service` | 服务单元文件，Restart=on-failure 守护 |

---

### Task 1: Agent 客户端

**Files:**
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\agent\package.json`
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\agent\config.json`
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\agent\agent.js`

- [ ] **Step 1: 创建 agent/package.json**

```json
{
  "name": "watchdog-agent",
  "version": "1.0.0",
  "description": "看门狗监控 Agent - 守护 node/nginx/mysql 进程",
  "type": "module",
  "main": "agent.js",
  "scripts": {
    "start": "node agent.js"
  },
  "engines": { "node": ">=18.0.0" }
}
```

- [ ] **Step 2: 创建 agent/config.json — Ubuntu 版配置**

```json
{
  "host_id": "server-01",
  "host_name": "生产服务器",
  "server_url": "http://127.0.0.1:3090/api",
  "report_interval": 30,
  "processes": [
    {
      "name": "node",
      "display": "Node.js 应用",
      "check_cmd": "pgrep",
      "check_pattern": "node",
      "start_cmd": "systemctl restart chiyao-site",
      "stop_cmd": "systemctl stop chiyao-site",
      "interval": 30,
      "max_restart": 5,
      "restart_window": 600
    },
    {
      "name": "nginx",
      "display": "Nginx Web 服务",
      "check_cmd": "pgrep",
      "check_pattern": "nginx",
      "start_cmd": "systemctl restart nginx",
      "stop_cmd": "systemctl stop nginx",
      "interval": 30,
      "max_restart": 3,
      "restart_window": 600
    },
    {
      "name": "mysql",
      "display": "MySQL/MariaDB 数据库",
      "check_cmd": "pgrep",
      "check_pattern": "mysqld|mariadbd",
      "start_cmd": "systemctl restart mysql",
      "stop_cmd": "systemctl stop mysql",
      "interval": 30,
      "max_restart": 3,
      "restart_window": 600
    }
  ]
}
```

- [ ] **Step 3: 创建 agent/agent.js — 核心监控逻辑**

```js
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("配置文件 config.json 不存在");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const { host_id, host_name, server_url, report_interval = 30, processes = [] } = config;
const LOG_DIR = path.join(__dirname, "..", "logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

const restartCounters = {};

function getLogFile() {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return path.join(LOG_DIR, `watchdog-agent-${dateStr}.log`);
}

function log(level, procName, message) {
  const time = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `[${time}] [${level.toUpperCase()}] [${procName}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(getLogFile(), line + "\n", "utf-8");
  } catch (e) {
    console.error("写日志失败:", e.message);
  }
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

async function report(procList) {
  try {
    const body = JSON.stringify({
      host_id,
      host_name: host_name || os.hostname(),
      host_os: `${os.platform()} ${os.release()}`,
      host_ip: getLocalIP(),
      agent_version: "1.0.0",
      processes: procList.map((p) => ({
        name: p.name,
        display: p.display,
        check_cmd: p.check_cmd,
        start_cmd: p.start_cmd,
        stop_cmd: p.stop_cmd,
        interval: p.interval,
        max_restart: p.max_restart,
        restart_window: p.restart_window,
        enabled: p.enabled !== false,
      })),
    });
    const res = await fetch(`${server_url}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      log("warn", "agent", `上报失败: HTTP ${res.status}`);
    }
  } catch (e) {
    log("warn", "agent", `上报网络异常: ${e.message}`);
  }
}

async function reportEvent(procName, eventType, level, message, extra = {}) {
  try {
    const body = JSON.stringify({
      host_id,
      process_name: procName,
      event_type: eventType,
      level,
      message,
      pid: extra.pid || 0,
      cpu_percent: extra.cpu || 0,
      mem_mb: extra.mem || 0,
      restart_count: extra.restart_count || 0,
    });
    await fetch(`${server_url}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // 上报失败不影响本地检测
  }
}

async function checkProcess(proc) {
  try {
    let alive = false;
    let pid = 0;
    let cpu = 0;
    let mem = 0;

    try {
      const pattern = proc.check_pattern || proc.name;
      const { stdout } = await execAsync(`pgrep -f "${pattern}"`, { timeout: 5000 });
      const pids = stdout.trim().split("\n").filter(Boolean);
      alive = pids.length > 0;
      if (alive) {
        pid = parseInt(pids[0]);
        try {
          const { stdout: psOut } = await execAsync(`ps -p ${pid} -o %cpu=,rss=`, { timeout: 3000 });
          const parts = psOut.trim().split(/\s+/);
          cpu = parseFloat(parts[0]) || 0;
          mem = Math.round(((parseInt(parts[1]) || 0) / 1024) * 10) / 10;
        } catch {
          /* ps 失败忽略 */
        }
      }
    } catch {
      alive = false;
    }

    return { alive, pid, cpu, mem };
  } catch (e) {
    log("error", proc.name, `检测异常: ${e.message}`);
    return { alive: false, pid: 0, cpu: 0, mem: 0 };
  }
}

async function restartProcess(proc) {
  const now = Date.now();
  const window = (proc.restart_window || 600) * 1000;
  const counter = restartCounters[proc.name] || { count: 0, windowStart: now };

  if (now - counter.windowStart > window) {
    counter.count = 0;
    counter.windowStart = now;
  }
  counter.count++;
  restartCounters[proc.name] = counter;

  const max = proc.max_restart || 5;
  if (counter.count > max) {
    log("critical", proc.name, `重启次数超过阈值 (${max}次/${proc.restart_window}s)，暂停自动重启`);
    await reportEvent(proc.name, "alert", "critical",
      `重启次数超过阈值 (${counter.count}次/${proc.restart_window}s)，已暂停自动重启`, { restart_count: counter.count });
    return false;
  }

  log("warn", proc.name, `进程异常，正在尝试重启 (第${counter.count}次) ...`);

  try {
    if (proc.stop_cmd) {
      log("info", proc.name, `执行停止: ${proc.stop_cmd}`);
      await execAsync(proc.stop_cmd, { timeout: 30000 });
      await sleep(3000);
    }
    log("info", proc.name, `执行启动: ${proc.start_cmd}`);
    await execAsync(proc.start_cmd, { timeout: 30000 });
    await sleep(5000);

    const { alive } = await checkProcess(proc);
    if (alive) {
      log("info", proc.name, "重启成功");
      await reportEvent(proc.name, "restart", "info", "重启成功，进程已恢复运行", { restart_count: counter.count });
      return true;
    } else {
      log("error", proc.name, "重启后进程仍未运行");
      await reportEvent(proc.name, "restart", "error", "重启失败，进程仍未运行", { restart_count: counter.count });
      return false;
    }
  } catch (e) {
    log("error", proc.name, `重启命令执行失败: ${e.message}`);
    await reportEvent(proc.name, "restart", "error", `重启命令执行失败: ${e.message}`, { restart_count: counter.count });
    return false;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let lastReportTime = 0;

async function runCheck() {
  for (const proc of processes) {
    if (proc.enabled === false) continue;

    const { alive, pid, cpu, mem } = await checkProcess(proc);

    if (alive) {
      log("info", proc.name, `运行正常 (PID:${pid} CPU:${cpu}% MEM:${mem}MB)`);
      await reportEvent(proc.name, "check", "info", "运行正常", { pid, cpu, mem });
    } else {
      log("error", proc.name, "进程未运行");
      await reportEvent(proc.name, "check", "error", "进程未运行");
      await restartProcess(proc);
    }

    await sleep((proc.interval || 30) * 1000);
  }

  if (Date.now() - lastReportTime > report_interval * 1000) {
    lastReportTime = Date.now();
    await report(processes);
  }
}

async function main() {
  log("info", "agent", `Agent 启动 - 主机: ${host_name || host_id} - 平台: ${os.platform()} ${os.release()}`);
  log("info", "agent", `监控 ${processes.length} 个进程，上报间隔 ${report_interval}s`);

  await report(processes);
  lastReportTime = Date.now();

  while (true) {
    try {
      await runCheck();
    } catch (e) {
      log("error", "agent", `主循环异常: ${e.message}`);
      await sleep(10000);
    }
  }
}

process.on("SIGINT", () => { log("info", "agent", "收到 SIGINT，停止"); process.exit(0); });
process.on("SIGTERM", () => { log("info", "agent", "收到 SIGTERM，停止"); process.exit(0); });

main();
```

- [ ] **Step 4: 提交 Task 1**

```bash
git add watchdog-ubuntu/agent/
git commit -m "feat: watchdog-ubuntu agent 客户端（零依赖，systemctl 管控进程）"
```

---

### Task 2: Server 服务端

**Files:**
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\server\package.json`
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\server\server.js`
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\server\migrate.js`

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "watchdog-server",
  "version": "1.0.0",
  "description": "看门狗监控服务端 - API + B/S 面板",
  "type": "module",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "migrate": "node migrate.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "mysql2": "^3.11.0"
  },
  "engines": { "node": ">=18.0.0" }
}
```

- [ ] **Step 2: 创建 server/migrate.js — 建表脚本**

```js
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
```

- [ ] **Step 3: 创建 server/server.js — Express 服务端**

```js
import express from "express";
import mysql2 from "mysql2/promise";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.WATCHDOG_PORT || "3090");
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = parseInt(process.env.DB_PORT || "3306");
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "root";
const DB_NAME = process.env.DB_NAME || "watchdog";

let pool;
async function getPool() {
  if (!pool) {
    pool = mysql2.createPool({
      host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS,
      database: DB_NAME, waitForConnections: true, connectionLimit: 5,
    });
  }
  return pool;
}

const app = express();
app.use(express.json({ limit: "1mb" }));

function ok(res, data = null, message = "ok") {
  res.json({ code: 0, message, data });
}
function fail(res, status = 400, message = "请求失败") {
  res.status(status).json({ code: status, message });
}

// ================= Agent 上报 =================

app.post("/api/report", async (req, res) => {
  const { host_id, host_name, host_os, host_ip, agent_version, processes } = req.body || {};
  if (!host_id) return fail(res, 400, "缺少 host_id");
  try {
    const p = await getPool();
    await p.query(
      `INSERT INTO watchdog_hosts (host_id, host_name, host_os, host_ip, agent_version, last_heartbeat, status)
       VALUES (?, ?, ?, ?, ?, NOW(), 1)
       ON DUPLICATE KEY UPDATE host_name=VALUES(host_name), host_os=VALUES(host_os),
         host_ip=VALUES(host_ip), agent_version=VALUES(agent_version), last_heartbeat=NOW(), status=1`,
      [host_id, host_name || host_id, host_os || "", host_ip || "", agent_version || ""]
    );
    if (Array.isArray(processes)) {
      for (const proc of processes) {
        await p.query(
          `INSERT INTO watchdog_config (host_id, process_name, process_display, check_command, start_command, stop_command, check_interval, max_restart, restart_window, enabled)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE process_display=VALUES(process_display), check_command=VALUES(check_command),
             start_command=VALUES(start_command), stop_command=VALUES(stop_command),
             check_interval=VALUES(check_interval), max_restart=VALUES(max_restart),
             restart_window=VALUES(restart_window), enabled=VALUES(enabled)`,
          [host_id, proc.name, proc.display || proc.name, proc.check_cmd || "", proc.start_cmd || "",
           proc.stop_cmd || "", proc.interval || 30, proc.max_restart || 5, proc.restart_window || 600,
           proc.enabled !== false ? 1 : 0]
        );
      }
    }
    ok(res, { received: true });
  } catch (e) {
    console.error("[report]", e.message);
    fail(res, 500, "上报失败: " + e.message);
  }
});

app.post("/api/event", async (req, res) => {
  const { host_id, process_name, event_type, level, message, pid, cpu_percent, mem_mb, restart_count } = req.body || {};
  if (!host_id || !process_name || !event_type) return fail(res, 400, "缺少必要字段");
  try {
    const p = await getPool();
    await p.query(
      `INSERT INTO watchdog_event_log (host_id, process_name, event_type, level, message, pid, cpu_percent, mem_mb, restart_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [host_id, process_name, event_type, level || "info", message || "", pid || 0, cpu_percent || 0, mem_mb || 0, restart_count || 0]
    );
    await p.query("UPDATE watchdog_hosts SET last_heartbeat=NOW() WHERE host_id=?", [host_id]);
    ok(res, { received: true });
  } catch (e) {
    console.error("[event]", e.message);
    fail(res, 500, "事件上报失败: " + e.message);
  }
});

// ================= 管理查询 =================

app.get("/api/hosts", async (req, res) => {
  try {
    const p = await getPool();
    const [list] = await p.query("SELECT * FROM watchdog_hosts ORDER BY status DESC, last_heartbeat DESC");
    ok(res, list);
  } catch (e) {
    fail(res, 500, e.message);
  }
});

app.get("/api/hosts/:hostId/config", async (req, res) => {
  try {
    const p = await getPool();
    const [list] = await p.query("SELECT * FROM watchdog_config WHERE host_id=? ORDER BY id", [req.params.hostId]);
    ok(res, list);
  } catch (e) {
    fail(res, 500, e.message);
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const { page = 1, size = 30, host_id, process_name, event_type, level, start_date, end_date } = req.query;
    const conds = [];
    const params = [];
    if (host_id) { conds.push("host_id=?"); params.push(host_id); }
    if (process_name) { conds.push("process_name=?"); params.push(process_name); }
    if (event_type) { conds.push("event_type=?"); params.push(event_type); }
    if (level) { conds.push("level=?"); params.push(level); }
    if (start_date) { conds.push("created_at>=?"); params.push(start_date); }
    if (end_date) { conds.push("created_at<=?"); params.push(end_date); }
    const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
    const offset = (Number(page) - 1) * Number(size);

    const p = await getPool();
    const [list] = await p.query(
      `SELECT * FROM watchdog_event_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(size), offset]
    );
    const [[{ cnt }]] = await p.query(`SELECT COUNT(*) as cnt FROM watchdog_event_log ${where}`, params);
    ok(res, { list, total: cnt, page: Number(page), size: Number(size) });
  } catch (e) {
    fail(res, 500, e.message);
  }
});

// 静态文件托管（B/S 面板）
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`[watchdog-server] 已启动，端口: ${PORT}`);
  console.log(`[watchdog-server] 面板地址: http://127.0.0.1:${PORT}`);
});
```

- [ ] **Step 4: 提交 Task 2**

```bash
git add watchdog-ubuntu/server/
git commit -m "feat: watchdog-ubuntu server 服务端（Express + MySQL + 静态面板）"
```

---

### Task 3: B/S 管理面板（单文件 HTML）

**Files:**
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\server\public\index.html`

- [ ] **Step 1: 创建 index.html — 完整 B/S 面板**

使用 Vue3 + Element Plus CDN，单文件包含所有功能：主机列表、进程卡片、日志表格、筛选、自动刷新。

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>看门狗监控 - Watchdog</title>
  <script src="https://unpkg.com/vue@3.4.27/dist/vue.global.prod.js"></script>
  <script src="https://unpkg.com/element-plus@2.7.5/dist/index.full.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/element-plus@2.7.5/dist/index.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, "Microsoft YaHei", sans-serif; background: #f0f2f5; color: #303133; }
    .app { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .header h1 { font-size: 24px; font-weight: 700; }
    .header-right { display: flex; gap: 12px; align-items: center; }
    .main-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; min-height: calc(100vh - 140px); }
    .host-panel { background: #fff; border-radius: 8px; padding: 16px; }
    .host-panel h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    .host-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: all .2s; }
    .host-item:hover { background: #f5f7fa; }
    .host-item.active { background: #ecf5ff; border: 1px solid #d9ecff; }
    .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .dot.online { background: #67c23a; box-shadow: 0 0 6px rgba(103,194,58,.5); }
    .dot.offline { background: #f56c6c; }
    .host-info { flex: 1; min-width: 0; }
    .host-name { font-size: 13px; font-weight: 500; }
    .host-meta { font-size: 11px; color: #909399; margin-top: 2px; display: flex; gap: 8px; }
    .host-empty { text-align: center; padding: 40px 0; color: #909399; font-size: 13px; }
    .detail-panel { background: #fff; border-radius: 8px; padding: 20px; }
    .detail-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #909399; }
    .detail-empty .icon { font-size: 48px; margin-bottom: 12px; }
    .process-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .process-card { background: #fafbfc; border: 1px solid #e4e7ed; border-radius: 8px; padding: 14px; }
    .process-card.disabled { opacity: .5; }
    .process-card__head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .process-card__name { font-size: 14px; font-weight: 600; flex: 1; }
    .process-card__body { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #606266; }
    .process-card__row { display: flex; justify-content: space-between; }
    .process-card__cmd { font-family: monospace; font-size: 11px; color: #909399; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .process-empty { text-align: center; padding: 20px; color: #909399; font-size: 13px; }
    .event-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; }
    .event-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .event-pagination { display: flex; justify-content: center; margin-top: 12px; }
    .footer { text-align: center; padding: 16px; color: #909399; font-size: 12px; }
  </style>
</head>
<body>
  <div id="app">
    <div class="app">
      <div class="header">
        <h1>🛡️ 看门狗监控</h1>
        <div class="header-right">
          <el-switch v-model="autoRefresh" active-text="自动刷新" @change="toggleRefresh" />
          <el-tag type="info" size="small">节点: {{ hosts.length }}</el-tag>
        </div>
      </div>

      <div class="main-layout">
        <div class="host-panel">
          <h3>监控节点</h3>
          <div v-if="!hosts.length" class="host-empty">暂无监控节点<br/>等待 Agent 上报...</div>
          <div v-for="h in hosts" :key="h.host_id" class="host-item" :class="{ active: selectedHost?.host_id === h.host_id }" @click="selectHost(h)">
            <span class="dot" :class="isOnline(h) ? 'online' : 'offline'"></span>
            <div class="host-info">
              <div class="host-name">{{ h.host_name }}</div>
              <div class="host-meta">
                <span>{{ h.host_os }}</span>
                <span>{{ timeAgo(h.last_heartbeat) }}</span>
              </div>
            </div>
            <el-tag :type="isOnline(h) ? 'success' : 'danger'" size="small">{{ isOnline(h) ? '在线' : '离线' }}</el-tag>
          </div>
        </div>

        <div class="detail-panel">
          <template v-if="selectedHost">
            <div class="process-cards">
              <div v-for="cfg in hostConfigs" :key="cfg.process_name" class="process-card" :class="{ disabled: !cfg.enabled }">
                <div class="process-card__head">
                  <span class="process-card__name">{{ cfg.process_display }}</span>
                  <el-switch :model-value="!!cfg.enabled" size="small" disabled />
                </div>
                <div class="process-card__body">
                  <div class="process-card__row"><span>检测间隔</span><span>{{ cfg.check_interval }}s</span></div>
                  <div class="process-card__row"><span>重启阈值</span><span>{{ cfg.max_restart }}次/{{ cfg.restart_window }}s</span></div>
                  <div class="process-card__row"><span>启动命令</span><span class="process-card__cmd">{{ cfg.start_command }}</span></div>
                </div>
              </div>
              <div v-if="!hostConfigs.length" class="process-empty">暂无进程配置</div>
            </div>

            <div class="event-section">
              <h3>事件日志</h3>
              <div class="event-filters">
                <el-select v-model="filters.process_name" placeholder="进程" clearable size="small" style="width:120px" @change="fetchEvents">
                  <el-option label="全部" value="" />
                  <el-option v-for="cfg in hostConfigs" :key="cfg.process_name" :label="cfg.process_display" :value="cfg.process_name" />
                </el-select>
                <el-select v-model="filters.event_type" placeholder="事件类型" clearable size="small" style="width:120px" @change="fetchEvents">
                  <el-option label="全部" value="" />
                  <el-option label="进程检测" value="check" />
                  <el-option label="进程重启" value="restart" />
                  <el-option label="异常告警" value="alert" />
                  <el-option label="状态变更" value="status" />
                  <el-option label="心跳上报" value="heartbeat" />
                </el-select>
                <el-select v-model="filters.level" placeholder="级别" clearable size="small" style="width:100px" @change="fetchEvents">
                  <el-option label="全部" value="" />
                  <el-option label="信息" value="info" />
                  <el-option label="警告" value="warn" />
                  <el-option label="错误" value="error" />
                  <el-option label="严重" value="critical" />
                </el-select>
                <el-date-picker v-model="filters.start_date" type="datetime" placeholder="开始时间" size="small" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width:180px" @change="fetchEvents" />
                <el-date-picker v-model="filters.end_date" type="datetime" placeholder="结束时间" size="small" format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" style="width:180px" @change="fetchEvents" />
              </div>

              <el-table :data="events" v-loading="loading" size="small" stripe empty-text="暂无事件日志">
                <el-table-column prop="created_at" label="时间" width="160">
                  <template #default="{ row }">{{ row.created_at?.replace('T',' ').slice(0,19) || '-' }}</template>
                </el-table-column>
                <el-table-column prop="process_name" label="进程" width="90" />
                <el-table-column prop="event_type" label="事件类型" width="100">
                  <template #default="{ row }">{{ typeLabel(row.event_type) }}</template>
                </el-table-column>
                <el-table-column prop="level" label="级别" width="70">
                  <template #default="{ row }">
                    <el-tag :type="levelTag(row.level)" size="small">{{ levelLabel(row.level) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="内容" min-width="200" show-overflow-tooltip />
                <el-table-column prop="cpu_percent" label="CPU%" width="65" />
                <el-table-column prop="mem_mb" label="内存MB" width="85" />
                <el-table-column prop="restart_count" label="重启次数" width="85" />
              </el-table>

              <div v-if="eventsTotal > filters.size" class="event-pagination">
                <el-pagination v-model:current-page="filters.page" :page-size="filters.size" :total="eventsTotal" layout="prev, pager, next" small @current-change="fetchEvents" />
              </div>
            </div>
          </template>
          <div v-else class="detail-empty">
            <div class="icon">📡</div>
            <p>请从左侧选择一个节点查看详情</p>
          </div>
        </div>
      </div>

      <div class="footer">驰耀科技 看门狗监控系统 v1.0</div>
    </div>
  </div>

  <script>
    const { createApp, ref, reactive, onMounted, onUnmounted } = Vue;
    const { ElMessage } = ElementPlus;

    createApp({
      setup() {
        const hosts = ref([]);
        const selectedHost = ref(null);
        const hostConfigs = ref([]);
        const events = ref([]);
        const eventsTotal = ref(0);
        const loading = ref(false);
        const autoRefresh = ref(true);
        let timer = null;

        const filters = reactive({
          page: 1, size: 20, host_id: "", process_name: "",
          event_type: "", level: "", start_date: "", end_date: "",
        });

        const API = "/api";

        async function fetchHosts() {
          try {
            const res = await fetch(API + "/hosts");
            hosts.value = (await res.json()).data || [];
          } catch {}
        }

        async function selectHost(h) {
          selectedHost.value = h;
          filters.host_id = h.host_id;
          filters.page = 1;
          try {
            const res = await fetch(API + "/hosts/" + h.host_id + "/config");
            hostConfigs.value = (await res.json()).data || [];
          } catch { hostConfigs.value = []; }
          fetchEvents();
        }

        async function fetchEvents() {
          loading.value = true;
          try {
            const p = new URLSearchParams();
            Object.entries(filters).forEach(([k, v]) => { if (v) p.append(k, v); });
            const res = await fetch(API + "/events?" + p.toString());
            const json = await res.json();
            events.value = json.data?.list || [];
            eventsTotal.value = json.data?.total || 0;
          } finally {
            loading.value = false;
          }
        }

        function isOnline(h) {
          if (!h.last_heartbeat) return false;
          return Date.now() - new Date(h.last_heartbeat).getTime() < 120000;
        }

        function timeAgo(v) {
          if (!v) return "从未";
          const d = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
          if (d < 60) return d + "秒前";
          if (d < 3600) return Math.floor(d / 60) + "分钟前";
          if (d < 86400) return Math.floor(d / 3600) + "小时前";
          return Math.floor(d / 86400) + "天前";
        }

        function typeLabel(t) {
          const m = { check: "进程检测", restart: "进程重启", alert: "异常告警", status: "状态变更", heartbeat: "心跳上报" };
          return m[t] || t;
        }
        function levelTag(l) {
          const m = { info: "success", warn: "warning", error: "danger", critical: "danger" };
          return m[l] || "info";
        }
        function levelLabel(l) {
          const m = { info: "信息", warn: "警告", error: "错误", critical: "严重" };
          return m[l] || l;
        }

        function toggleRefresh() {
          autoRefresh.value ? startRefresh() : stopRefresh();
        }
        function startRefresh() {
          stopRefresh();
          timer = setInterval(() => {
            fetchHosts();
            if (selectedHost.value) fetchEvents();
          }, 10000);
        }
        function stopRefresh() {
          if (timer) { clearInterval(timer); timer = null; }
        }

        onMounted(() => { fetchHosts(); startRefresh(); });
        onUnmounted(() => stopRefresh());

        return {
          hosts, selectedHost, hostConfigs, events, eventsTotal, loading, autoRefresh, filters,
          fetchHosts, selectHost, fetchEvents, isOnline, timeAgo, typeLabel, levelTag, levelLabel, toggleRefresh,
        };
      }
    }).use(ElementPlus).mount("#app");
  </script>
</body>
</html>
```

- [ ] **Step 2: 提交 Task 3**

```bash
git add watchdog-ubuntu/server/public/index.html
git commit -m "feat: watchdog-ubuntu B/S 管理面板（单文件 Vue3 CDN）"
```

---

### Task 4: systemd 服务单元 + 安装脚本

**Files:**
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\systemd\watchdog-agent.service`
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\systemd\watchdog-server.service`
- Create: `f:\kaifa\CYWEB\watchdog-ubuntu\install.sh`

- [ ] **Step 1: 创建 watchdog-agent.service**

```ini
[Unit]
Description=Watchdog Agent - 守护 node/nginx/mysql 进程
After=network.target mysql.service nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/watchdog/agent
ExecStart=/usr/bin/node /opt/watchdog/agent/agent.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=watchdog-agent

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: 创建 watchdog-server.service**

```ini
[Unit]
Description=Watchdog Server - API + B/S 管理面板
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/watchdog/server
Environment=WATCHDOG_PORT=3090
Environment=DB_HOST=127.0.0.1
Environment=DB_PORT=3306
Environment=DB_USER=root
Environment=DB_PASS=root
Environment=DB_NAME=watchdog
ExecStart=/usr/bin/node /opt/watchdog/server/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=watchdog-server

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 3: 创建 install.sh — 一键安装脚本**

```bash
#!/bin/bash
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  看门狗监控系统 - Ubuntu 一键安装脚本  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检测 root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}请使用 root 权限运行: sudo bash install.sh${NC}"
  exit 1
fi

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="/opt/watchdog"

echo -e "${YELLOW}[1/6] 检测 Node.js...${NC}"
if ! command -v node &>/dev/null; then
  echo "Node.js 未安装，正在安装..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}  Node.js $(node -v)${NC}"

echo -e "${YELLOW}[2/6] 检测 MySQL/MariaDB...${NC}"
if ! command -v mysql &>/dev/null; then
  echo -e "${RED}  MySQL/MariaDB 未安装，请先安装数据库${NC}"
  echo "  Ubuntu: apt-get install -y mysql-server"
  echo "  或: apt-get install -y mariadb-server"
  exit 1
fi
echo -e "${GREEN}  MySQL 已就绪${NC}"

echo -e "${YELLOW}[3/6] 安装文件到 ${INSTALL_DIR}...${NC}"
mkdir -p "${INSTALL_DIR}"
cp -r "${SCRIPT_DIR}/agent" "${INSTALL_DIR}/"
cp -r "${SCRIPT_DIR}/server" "${INSTALL_DIR}/"
mkdir -p "${INSTALL_DIR}/logs"

echo -e "${YELLOW}[4/6] 安装 Node.js 依赖...${NC}"
cd "${INSTALL_DIR}/server"
npm install --production

echo -e "${YELLOW}[5/6] 初始化数据库...${NC}"
# 读取数据库配置（从环境变量或使用默认值）
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-root}"
DB_NAME="${DB_NAME:-watchdog}"

echo "  数据库: ${DB_HOST}:${DB_PORT} 用户: ${DB_USER} 库: ${DB_NAME}"
echo "  如果使用非默认配置，请设置环境变量后重新运行:"
echo "  DB_HOST=x DB_PORT=x DB_USER=x DB_PASS=x DB_NAME=x bash install.sh"

DB_HOST="${DB_HOST}" DB_PORT="${DB_PORT}" DB_USER="${DB_USER}" DB_PASS="${DB_PASS}" DB_NAME="${DB_NAME}" \
  node "${INSTALL_DIR}/server/migrate.js"

echo -e "${YELLOW}[6/6] 注册 systemd 服务...${NC}"

# 更新 service 文件中的环境变量
SERVICE_DIR="${INSTALL_DIR}/systemd"
mkdir -p "${SERVICE_DIR}"

cat > "${SERVICE_DIR}/watchdog-agent.service" << 'SERVICE_EOF'
[Unit]
Description=Watchdog Agent - 守护 node/nginx/mysql 进程
After=network.target mysql.service nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/watchdog/agent
ExecStart=/usr/bin/node /opt/watchdog/agent/agent.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=watchdog-agent

[Install]
WantedBy=multi-user.target
SERVICE_EOF

cat > "${SERVICE_DIR}/watchdog-server.service" << SERVICE_EOF
[Unit]
Description=Watchdog Server - API + B/S 管理面板
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/watchdog/server
Environment=WATCHDOG_PORT=3090
Environment=DB_HOST=${DB_HOST}
Environment=DB_PORT=${DB_PORT}
Environment=DB_USER=${DB_USER}
Environment=DB_PASS=${DB_PASS}
Environment=DB_NAME=${DB_NAME}
ExecStart=/usr/bin/node /opt/watchdog/server/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=watchdog-server

[Install]
WantedBy=multi-user.target
SERVICE_EOF

cp "${SERVICE_DIR}/watchdog-agent.service" /etc/systemd/system/
cp "${SERVICE_DIR}/watchdog-server.service" /etc/systemd/system/
systemctl daemon-reload

systemctl enable watchdog-agent
systemctl enable watchdog-server

systemctl start watchdog-server
sleep 2
systemctl start watchdog-agent

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "  服务状态:"
echo "  ─────────"
systemctl status watchdog-agent --no-pager -l 2>/dev/null || true
echo ""
systemctl status watchdog-server --no-pager -l 2>/dev/null || true
echo ""
echo "  管理命令:"
echo "  systemctl start|stop|restart|status watchdog-agent"
echo "  systemctl start|stop|restart|status watchdog-server"
echo ""
echo "  日志查看:"
echo "  journalctl -u watchdog-agent -f"
echo "  journalctl -u watchdog-server -f"
echo "  tail -f /opt/watchdog/logs/watchdog-agent-*.log"
echo ""
echo "  B/S 面板: http://$(hostname -I | awk '{print $1}'):3090"
echo ""
echo -e "${YELLOW}  请编辑 /opt/watchdog/agent/config.json 配置:${NC}"
echo "  - host_id / host_name（主机标识）"
echo "  - server_url（指向本机 http://127.0.0.1:3090/api）"
echo "  - processes 中的 start_cmd / stop_cmd（根据实际服务名调整）"
echo ""
```

- [ ] **Step 4: 提交 Task 4**

```bash
git add watchdog-ubuntu/systemd/ watchdog-ubuntu/install.sh
git commit -m "feat: watchdog-ubuntu systemd 服务单元 + 一键安装脚本"
```

---

### Task 5: 最终验证与推送

- [ ] **Step 1: 检查完整性**

```bash
git status
```

- [ ] **Step 2: 推送**

```bash
git push origin main
```

---

## 验证清单

1. 在 Ubuntu 22.04/24.04 上运行 `sudo bash install.sh`，确认安装流程完整
2. 访问 `http://服务器IP:3090` 确认 B/S 面板正常显示
3. 编辑 `/opt/watchdog/agent/config.json` 后重启 agent，确认进程检测和上报正常
4. 手动停止一个被监控的进程（如 nginx），确认 agent 自动重启并记录日志
5. 在面板中查看事件日志，确认筛选和分页功能正常
6. 确认 agent 自身崩溃后 systemd 自动拉起（模拟 kill 进程）

## 注意事项

- Agent 零依赖，仅使用 Node.js 内置模块（child_process, fs, path, os, url）
- Server 使用 `mysql2` 连接池，兼容 MySQL 5.7/8.0 和 MariaDB 10.x
- B/S 面板通过 CDN 加载 Vue3 和 Element Plus，无需构建步骤
- 安装脚本中的数据库密码通过环境变量传入，`install.sh` 不会硬编码密码
- systemd 服务使用 `Restart=on-failure`，agent/server 崩溃后自动拉起
- 日志双保险：本地文件按天滚动（`/opt/watchdog/logs/`）+ MySQL 入库