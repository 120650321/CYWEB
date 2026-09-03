import { Router } from "express";
import { db } from "../db.js";
import { ok, fail } from "../utils.js";

const router = Router();

// ================= Agent 上报接口 =================

// Agent 心跳 + 状态上报
router.post("/report", async (req, res) => {
  const { host_id, host_name, host_os, host_ip, agent_version, processes } = req.body || {};
  if (!host_id) return fail(res, 400, "缺少 host_id");

  try {
    await db.query(
      `INSERT INTO watchdog_hosts (host_id, host_name, host_os, host_ip, agent_version, last_heartbeat, status)
       VALUES (?, ?, ?, ?, ?, NOW(), 1)
       ON DUPLICATE KEY UPDATE host_name = VALUES(host_name), host_os = VALUES(host_os),
         host_ip = VALUES(host_ip), agent_version = VALUES(agent_version),
         last_heartbeat = NOW(), status = 1`,
      [host_id, host_name || host_id, host_os || "", host_ip || "", agent_version || ""]
    );

    if (Array.isArray(processes)) {
      for (const p of processes) {
        await db.query(
          `INSERT INTO watchdog_config (host_id, process_name, process_display, check_command, start_command, stop_command, check_interval, max_restart, restart_window, enabled)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE process_display = VALUES(process_display),
             check_command = VALUES(check_command), start_command = VALUES(start_command),
             stop_command = VALUES(stop_command), check_interval = VALUES(check_interval),
             max_restart = VALUES(max_restart), restart_window = VALUES(restart_window),
             enabled = VALUES(enabled)`,
          [
            host_id, p.name, p.display || p.name, p.check_cmd || "",
            p.start_cmd || "", p.stop_cmd || "", p.interval || 30,
            p.max_restart || 5, p.restart_window || 600, p.enabled !== false ? 1 : 0
          ]
        );
      }
    }

    ok(res, { received: true });
  } catch (e) {
    console.error("[watchdog] 上报失败:", e.message);
    fail(res, 500, "上报失败: " + e.message);
  }
});

// Agent 上报事件日志
router.post("/event", async (req, res) => {
  const { host_id, process_name, event_type, level, message, pid, cpu_percent, mem_mb, restart_count } = req.body || {};
  if (!host_id || !process_name || !event_type) return fail(res, 400, "缺少必要字段");

  try {
    await db.query(
      `INSERT INTO watchdog_event_log (host_id, process_name, event_type, level, message, pid, cpu_percent, mem_mb, restart_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [host_id, process_name, event_type, level || "info", message || "", pid || 0, cpu_percent || 0, mem_mb || 0, restart_count || 0]
    );

    await db.query("UPDATE watchdog_hosts SET last_heartbeat = NOW() WHERE host_id = ?", [host_id]);

    ok(res, { received: true });
  } catch (e) {
    console.error("[watchdog] 事件上报失败:", e.message);
    fail(res, 500, "事件上报失败: " + e.message);
  }
});

// ================= 管理后台接口 =================

// 主机列表
router.get("/hosts", async (req, res) => {
  const { page = 1, size = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(size);
  const list = await db.query(
    `SELECT * FROM watchdog_hosts ORDER BY status DESC, last_heartbeat DESC LIMIT ? OFFSET ?`,
    [Number(size), offset]
  );
  const total = await db.query("SELECT COUNT(*) as cnt FROM watchdog_hosts");
  ok(res, { list, pagination: { page: Number(page), size: Number(size), total: total[0].cnt } });
});

// 主机进程配置列表
router.get("/hosts/:hostId/config", async (req, res) => {
  const list = await db.query(
    "SELECT * FROM watchdog_config WHERE host_id = ? ORDER BY id",
    [req.params.hostId]
  );
  ok(res, list);
});

// 事件日志查询
router.get("/events", async (req, res) => {
  const { page = 1, size = 30, host_id, process_name, event_type, level, start_date, end_date } = req.query;
  const conditions = [];
  const params = [];

  if (host_id) { conditions.push("host_id = ?"); params.push(host_id); }
  if (process_name) { conditions.push("process_name = ?"); params.push(process_name); }
  if (event_type) { conditions.push("event_type = ?"); params.push(event_type); }
  if (level) { conditions.push("level = ?"); params.push(level); }
  if (start_date) { conditions.push("created_at >= ?"); params.push(start_date); }
  if (end_date) { conditions.push("created_at <= ?"); params.push(end_date); }

  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const offset = (Number(page) - 1) * Number(size);

  const list = await db.query(
    `SELECT * FROM watchdog_event_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(size), offset]
  );
  const cnt = await db.query(
    `SELECT COUNT(*) as cnt FROM watchdog_event_log ${where}`,
    params
  );

  ok(res, {
    list,
    pagination: { page: Number(page), size: Number(size), total: cnt[0].cnt }
  });
});

// 更新进程配置
router.put("/hosts/:hostId/config/:processName", async (req, res) => {
  const { enabled, check_interval, max_restart } = req.body || {};
  await db.query(
    `UPDATE watchdog_config SET enabled = COALESCE(?, enabled), check_interval = COALESCE(?, check_interval),
     max_restart = COALESCE(?, max_restart) WHERE host_id = ? AND process_name = ?`,
    [enabled !== undefined ? enabled : null, check_interval || null, max_restart || null,
     req.params.hostId, req.params.processName]
  );
  ok(res, null, "配置已更新");
});

// ================= 系统信息接口 =================

// Agent 上报系统信息
router.post("/sysinfo", async (req, res) => {
  const { host_id, host_name, cpu_usage, mem_total, mem_used, mem_percent, disk_total, disk_used, disk_percent, load_1, load_5, load_15, uptime, net_rx, net_tx } = req.body || {};
  if (!host_id) return fail(res, 400, "缺少 host_id");

  try {
    await db.query(
      `INSERT INTO watchdog_sysinfo (host_id, host_name, cpu_usage, mem_total, mem_used, mem_percent, disk_total, disk_used, disk_percent, load_1, load_5, load_15, uptime, net_rx, net_tx)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [host_id, host_name || "", cpu_usage || 0, mem_total || 0, mem_used || 0, mem_percent || 0,
       disk_total || 0, disk_used || 0, disk_percent || 0, load_1 || 0, load_5 || 0, load_15 || 0,
       uptime || 0, net_rx || 0, net_tx || 0]
    );

    await db.query("UPDATE watchdog_hosts SET last_heartbeat = NOW() WHERE host_id = ?", [host_id]);

    ok(res, { received: true });
  } catch (e) {
    console.error("[watchdog] 系统信息上报失败:", e.message);
    fail(res, 500, "系统信息上报失败: " + e.message);
  }
});

// 查询主机最新系统信息
router.get("/hosts/:hostId/sysinfo", async (req, res) => {
  try {
    const latest = await db.query(
      "SELECT * FROM watchdog_sysinfo WHERE host_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.params.hostId]
    );
    const history = await db.query(
      "SELECT cpu_usage, mem_percent, disk_percent, load_1, created_at FROM watchdog_sysinfo WHERE host_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR) ORDER BY created_at ASC LIMIT 500",
      [req.params.hostId]
    );
    ok(res, { latest: latest[0] || null, history: history || [] });
  } catch (e) {
    console.error("[watchdog] 查询系统信息失败:", e.message);
    fail(res, 500, "查询失败: " + e.message);
  }
});

// ================= 进程列表接口 =================

// Agent 上报全量进程列表
router.post("/process-list", async (req, res) => {
  const { host_id, host_name, process_list, total_count, target_count } = req.body || {};
  if (!host_id || !process_list) return fail(res, 400, "缺少 host_id 或 process_list");

  try {
    await db.query(
      `INSERT INTO watchdog_process_list (host_id, process_list)
       VALUES (?, ?)`,
      [host_id, typeof process_list === "string" ? process_list : JSON.stringify(process_list)]
    );

    await db.query("UPDATE watchdog_hosts SET last_heartbeat = NOW() WHERE host_id = ?", [host_id]);

    ok(res, { received: true, total_count: total_count || 0, target_count: target_count || 0 });
  } catch (e) {
    console.error("[watchdog] 进程列表上报失败:", e.message);
    fail(res, 500, "进程列表上报失败: " + e.message);
  }
});

// 查询主机最新进程列表
router.get("/hosts/:hostId/process-list", async (req, res) => {
  try {
    const latest = await db.query(
      "SELECT * FROM watchdog_process_list WHERE host_id = ? ORDER BY created_at DESC LIMIT 1",
      [req.params.hostId]
    );
    if (latest[0] && latest[0].process_list) {
      try {
        const parsed = JSON.parse(latest[0].process_list);
        ok(res, {
          list: parsed,
          total_count: parsed.length,
          target_count: parsed.filter((p) => p.is_target).length,
          created_at: latest[0].created_at,
        });
      } catch {
        ok(res, { list: [], total_count: 0, target_count: 0, created_at: latest[0].created_at });
      }
    } else {
      ok(res, { list: [], total_count: 0, target_count: 0, created_at: null });
    }
  } catch (e) {
    console.error("[watchdog] 查询进程列表失败:", e.message);
    fail(res, 500, "查询失败: " + e.message);
  }
});

export default router;