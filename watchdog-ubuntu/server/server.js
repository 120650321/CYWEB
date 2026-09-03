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
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
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