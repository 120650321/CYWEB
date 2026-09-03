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