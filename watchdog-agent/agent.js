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
  console.error("配置文件 config.json 不存在，请先创建");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const {
  host_id, host_name, server_url, report_interval = 30, processes = [],
  auto_detect = true, auto_detect_interval = 300, system_info_interval = 60,
  auto_detect_targets = ["node", "mysql", "nginx"]
} = config;
const LOG_DIR = path.join(__dirname, "logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

const restartCounters = {};
const isWin = os.platform() === "win32";

// 自动发现的进程列表，与配置的进程合并
let discoveredProcesses = [];
let activeProcesses = [...processes];

function getLogFile() {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return path.join(LOG_DIR, `watchdog-${dateStr}.log`);
}

function log(level, processName, message) {
  const time = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `[${time}] [${level.toUpperCase()}] [${processName}] ${message}`;
  console.log(line);
  try {
    fs.appendFileSync(getLogFile(), line + "\n", "utf-8");
  } catch (e) {
    console.error("写日志失败:", e.message);
  }
}

async function report(processes) {
  try {
    const body = JSON.stringify({
      host_id,
      host_name: host_name || os.hostname(),
      host_os: `${os.platform()} ${os.release()}`,
      host_ip: getLocalIP(),
      agent_version: "1.0.0",
      processes: processes.map((p) => ({
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

async function reportEvent(processName, eventType, level, message, extra = {}) {
  try {
    const body = JSON.stringify({
      host_id,
      process_name: processName,
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
    // 上报失败不阻塞本地检测
  }
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}

// ================= 自动发现进程 =================

// 已知进程的匹配模式（Windows + Linux）
const KNOWN_PROCESS_PATTERNS = {
  node: { win: ["node.exe"], linux: ["node", "nodejs"] },
  mysql: { win: ["mysqld.exe"], linux: ["mysqld", "mariadbd"] },
  nginx: { win: ["nginx.exe"], linux: ["nginx"] },
};

// 已知进程的显示名称和默认启动/停止命令
const KNOWN_PROCESS_META = {
  node: {
    display: "Node.js 应用",
    win_start: "net start chiyao-site",
    win_stop: "net stop chiyao-site",
    linux_start: "systemctl start chiyao-site",
    linux_stop: "systemctl stop chiyao-site",
  },
  mysql: {
    display: "MySQL 数据库",
    win_start: "net start MySQL80",
    win_stop: "net stop MySQL80",
    linux_start: "systemctl start mysql",
    linux_stop: "systemctl stop mysql",
  },
  nginx: {
    display: "Nginx Web 服务",
    win_start: "net start nginx",
    win_stop: "net stop nginx",
    linux_start: "systemctl start nginx",
    linux_stop: "systemctl stop nginx",
  },
};

async function autoDetectProcesses() {
  const discovered = [];
  const targets = auto_detect_targets || ["node", "mysql", "nginx"];

  try {
    if (isWin) {
      const { stdout } = await execAsync("tasklist /FO CSV /NH", { timeout: 15000 });
      const lines = stdout.trim().split("\n").filter(Boolean);

      for (const target of targets) {
        const patterns = KNOWN_PROCESS_PATTERNS[target];
        if (!patterns) continue;
        const winPatterns = patterns.win;

        const matchedLines = lines.filter((line) => {
          const lower = line.toLowerCase();
          return winPatterns.some((p) => lower.includes(p.toLowerCase()));
        });

        if (matchedLines.length > 0) {
          const meta = KNOWN_PROCESS_META[target] || {};
          const fields = matchedLines[0].replace(/"/g, "").split(",");
          const pid = parseInt(fields[1]) || 0;
          const memKb = parseInt((fields[4] || "0").replace(/[^0-9]/g, "")) || 0;
          const mem = Math.round((memKb / 1024) * 10) / 10;

          const existingConfig = processes.find((p) => p.name === target);
          discovered.push({
            name: target,
            display: meta.display || target,
            check_cmd: "tasklist",
            check_pattern: winPatterns[0],
            start_cmd: existingConfig?.start_cmd || meta.win_start || "",
            stop_cmd: existingConfig?.stop_cmd || meta.win_stop || "",
            interval: existingConfig?.interval || 30,
            max_restart: existingConfig?.max_restart || 5,
            restart_window: existingConfig?.restart_window || 600,
            enabled: existingConfig?.enabled !== false,
            auto_detected: true,
            instance_count: matchedLines.length,
            pid,
            mem,
          });
        }
      }
    } else {
      for (const target of targets) {
        const patterns = KNOWN_PROCESS_PATTERNS[target];
        if (!patterns) continue;
        const linuxPatterns = patterns.linux;

        try {
          const { stdout } = await execAsync("ps aux --no-headers", { timeout: 10000 });
          const lines = stdout.trim().split("\n").filter(Boolean);

          const matchedLines = lines.filter((line) => {
            const lower = line.toLowerCase();
            return linuxPatterns.some((p) => lower.includes(p.toLowerCase()));
          });

          if (matchedLines.length > 0) {
            const meta = KNOWN_PROCESS_META[target] || {};
            const parts = matchedLines[0].trim().split(/\s+/);
            const pid = parseInt(parts[1]) || 0;
            const cpu = parseFloat(parts[2]) || 0;
            const mem = Math.round(((parseInt(parts[5]) || 0) / 1024) * 10) / 10;

            const existingConfig = processes.find((p) => p.name === target);
            discovered.push({
              name: target,
              display: meta.display || target,
              check_cmd: "pgrep",
              check_pattern: linuxPatterns[0],
              start_cmd: existingConfig?.start_cmd || meta.linux_start || "",
              stop_cmd: existingConfig?.stop_cmd || meta.linux_stop || "",
              interval: existingConfig?.interval || 30,
              max_restart: existingConfig?.max_restart || 5,
              restart_window: existingConfig?.restart_window || 600,
              enabled: existingConfig?.enabled !== false,
              auto_detected: true,
              instance_count: matchedLines.length,
              pid,
              cpu,
              mem,
            });
          }
        } catch {
          // ps 命令失败，跳过
        }
      }
    }

    discoveredProcesses = discovered;
    log("info", "agent", `自动发现完成，发现 ${discovered.length} 个目标进程: ${discovered.map((d) => d.name).join(", ") || "无"}`);

    // 合并配置进程和自动发现进程
    const merged = [...processes];
    for (const dp of discovered) {
      if (!merged.find((p) => p.name === dp.name)) {
        merged.push(dp);
      }
    }
    activeProcesses = merged;

    return discovered;
  } catch (e) {
    log("error", "agent", `自动发现异常: ${e.message}`);
    return [];
  }
}

// ================= 系统信息采集 =================

async function collectSysInfo() {
  try {
    const info = {
      host_id,
      host_name: host_name || os.hostname(),
      cpu_usage: 0,
      mem_total: Math.round(os.totalmem() / (1024 * 1024)),
      mem_used: 0,
      mem_percent: 0,
      disk_total: 0,
      disk_used: 0,
      disk_percent: 0,
      load_1: 0,
      load_5: 0,
      load_15: 0,
      uptime: Math.round(os.uptime()),
      net_rx: 0,
      net_tx: 0,
    };

    const freeMem = Math.round(os.freemem() / (1024 * 1024));
    info.mem_used = info.mem_total - freeMem;
    info.mem_percent = Math.round((info.mem_used / info.mem_total) * 10000) / 100;

    if (isWin) {
      try {
        const { stdout: cpuOut } = await execAsync(
          'wmic cpu get loadpercentage /value', { timeout: 5000 }
        );
        const cpuMatch = cpuOut.match(/LoadPercentage=(\d+)/);
        if (cpuMatch) info.cpu_usage = parseFloat(cpuMatch[1]);

        const { stdout: diskOut } = await execAsync(
          'wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /value', { timeout: 5000 }
        );
        const sizeMatch = diskOut.match(/Size=(\d+)/);
        const freeMatch = diskOut.match(/FreeSpace=(\d+)/);
        if (sizeMatch && freeMatch) {
          info.disk_total = Math.round(parseInt(sizeMatch[1]) / (1024 * 1024 * 1024));
          info.disk_used = info.disk_total - Math.round(parseInt(freeMatch[1]) / (1024 * 1024 * 1024));
          info.disk_percent = Math.round((info.disk_used / info.disk_total) * 10000) / 100;
        }
      } catch {
        // wmic 失败忽略
      }
    } else {
      try {
        const { stdout: cpuOut } = await execAsync("top -bn1 | grep 'Cpu(s)' | head -1", { timeout: 5000 });
        const cpuMatch = cpuOut.match(/(\d+\.?\d*)\s*id/);
        if (cpuMatch) info.cpu_usage = Math.round((100 - parseFloat(cpuMatch[1])) * 100) / 100;

        const { stdout: diskOut } = await execAsync("df -BG / | tail -1", { timeout: 5000 });
        const diskParts = diskOut.trim().split(/\s+/);
        if (diskParts.length >= 5) {
          info.disk_total = parseInt(diskParts[1]) || 0;
          info.disk_used = parseInt(diskParts[2]) || 0;
          info.disk_percent = parseInt(diskParts[4]) || 0;
        }

        const [load1, load5, load15] = os.loadavg();
        info.load_1 = Math.round(load1 * 100) / 100;
        info.load_5 = Math.round(load5 * 100) / 100;
        info.load_15 = Math.round(load15 * 100) / 100;
      } catch {
        // 命令失败忽略
      }
    }

    // 网络流量采集
    try {
      const nets = os.networkInterfaces();
      let totalRx = 0;
      let totalTx = 0;
      if (isWin) {
        const { stdout } = await execAsync("netstat -e", { timeout: 5000 });
        const rxMatch = stdout.match(/Bytes\s+(\d+)/);
        const txMatch = stdout.match(/Bytes\s+\d+\s+(\d+)/);
        if (rxMatch) totalRx = parseInt(rxMatch[1]);
        if (txMatch) totalTx = parseInt(txMatch[1]);
      } else {
        for (const name of Object.keys(nets)) {
          if (name === "lo") continue;
          try {
            const { stdout } = await execAsync(`cat /sys/class/net/${name}/statistics/rx_bytes`, { timeout: 3000 });
            totalRx += parseInt(stdout.trim()) || 0;
          } catch { /* ignore */ }
          try {
            const { stdout } = await execAsync(`cat /sys/class/net/${name}/statistics/tx_bytes`, { timeout: 3000 });
            totalTx += parseInt(stdout.trim()) || 0;
          } catch { /* ignore */ }
        }
      }
      info.net_rx = totalRx;
      info.net_tx = totalTx;
    } catch {
      // 忽略网络采集失败
    }

    return info;
  } catch (e) {
    log("error", "agent", `系统信息采集异常: ${e.message}`);
    return null;
  }
}

async function reportSysInfo(sysInfo) {
  if (!sysInfo) return;
  try {
    await fetch(`${server_url}/sysinfo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sysInfo),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    log("warn", "agent", `系统信息上报失败: ${e.message}`);
  }
}

// ================= 全量进程列表获取 =================

async function getProcessList() {
  try {
    const list = [];
    if (isWin) {
      const { stdout } = await execAsync(
        'tasklist /FO CSV /NH', { timeout: 15000 }
      );
      const lines = stdout.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        const fields = line.replace(/"/g, "").split(",");
        if (fields.length >= 5) {
          const name = (fields[0] || "").trim();
          const pid = parseInt(fields[1]) || 0;
          const memKb = parseInt((fields[4] || "0").replace(/[^0-9]/g, "")) || 0;
          if (pid > 0) {
            list.push({
              name,
              pid,
              mem_mb: Math.round((memKb / 1024) * 10) / 10,
              is_target: auto_detect_targets.some((t) => {
                const patterns = KNOWN_PROCESS_PATTERNS[t];
                return patterns && patterns.win.some((p) => name.toLowerCase().includes(p.toLowerCase()));
              }),
            });
          }
        }
      }
    } else {
      const { stdout } = await execAsync("ps aux --no-headers", { timeout: 10000 });
      const lines = stdout.trim().split("\n").filter(Boolean);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 11) {
          const name = parts[10] || "";
          const pid = parseInt(parts[1]) || 0;
          const cpu = parseFloat(parts[2]) || 0;
          const mem = Math.round(((parseInt(parts[5]) || 0) / 1024) * 10) / 10;
          if (pid > 0) {
            list.push({
              name,
              pid,
              cpu_percent: cpu,
              mem_mb: mem,
              is_target: auto_detect_targets.some((t) => {
                const patterns = KNOWN_PROCESS_PATTERNS[t];
                return patterns && patterns.linux.some((p) => name.toLowerCase().includes(p.toLowerCase()));
              }),
            });
          }
        }
      }
    }

    return list;
  } catch (e) {
    log("error", "agent", `进程列表获取异常: ${e.message}`);
    return [];
  }
}

async function reportProcessList(processList) {
  if (!processList || !processList.length) return;
  try {
    await fetch(`${server_url}/process-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host_id,
        host_name: host_name || os.hostname(),
        process_list: JSON.stringify(processList),
        total_count: processList.length,
        target_count: processList.filter((p) => p.is_target).length,
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    log("warn", "agent", `进程列表上报失败: ${e.message}`);
  }
}

async function checkProcess(proc) {
  try {
    let alive = false;
    let pid = 0;
    let cpu = 0;
    let mem = 0;

    if (isWin) {
      const pattern = proc.check_pattern || `${proc.name}.exe`;
      const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${pattern}" /FO CSV /NH`, { timeout: 10000 });
      alive = stdout.toLowerCase().includes(pattern.toLowerCase().replace(".exe", ""));
      if (alive) {
        const lines = stdout.trim().split("\n").filter(Boolean);
        const fields = lines[0].replace(/"/g, "").split(",");
        pid = parseInt(fields[1]) || 0;
        const memKb = parseInt(fields[4]?.replace(/[^0-9]/g, "")) || 0;
        mem = Math.round((memKb / 1024) * 10) / 10;
      }
    } else {
      try {
        const { stdout } = await execAsync(`pgrep -f "${proc.check_pattern || proc.name}"`, { timeout: 5000 });
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
    }

    return { alive, pid, cpu, mem };
  } catch (e) {
    log("error", proc.name, `检测异常: ${e.message}`);
    return { alive: false, pid: 0, cpu: 0, mem: 0, error: e.message };
  }
}

async function restartProcess(proc) {
  const now = Date.now();
  const counter = restartCounters[proc.name] || { count: 0, windowStart: now };
  if (now - counter.windowStart > (proc.restart_window || 600) * 1000) {
    counter.count = 0;
    counter.windowStart = now;
  }
  counter.count++;
  restartCounters[proc.name] = counter;

  if (counter.count > (proc.max_restart || 5)) {
    log("critical", proc.name, `重启次数超过阈值 (${proc.max_restart}次/${proc.restart_window}s)，暂停自动重启，请人工介入`);
    await reportEvent(proc.name, "alert", "critical",
      `重启次数超过阈值 (${counter.count}次/${proc.restart_window}s)，已暂停自动重启`, { restart_count: counter.count });
    return false;
  }

  log("warn", proc.name, `进程异常，正在尝试重启 (第${counter.count}次) ...`);

  try {
    if (proc.stop_cmd) {
      log("info", proc.name, `执行停止命令: ${proc.stop_cmd}`);
      await execAsync(proc.stop_cmd, { timeout: 30000 });
      await sleep(3000);
    }

    log("info", proc.name, `执行启动命令: ${proc.start_cmd}`);
    await execAsync(proc.start_cmd, { timeout: 30000 });
    await sleep(5000);

    const { alive } = await checkProcess(proc);
    if (alive) {
      log("info", proc.name, "重启成功，进程已恢复运行");
      await reportEvent(proc.name, "restart", "info", "重启成功，进程已恢复运行", { restart_count: counter.count });
      return true;
    } else {
      log("error", proc.name, "重启后进程仍然未运行");
      await reportEvent(proc.name, "restart", "error", "重启失败，进程仍然未运行", { restart_count: counter.count });
      return false;
    }
  } catch (e) {
    log("error", proc.name, `重启命令执行失败: ${e.message}`);
    await reportEvent(proc.name, "restart", "error", `重启命令执行失败: ${e.message}`, { restart_count: counter.count });
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastReportTime = 0;

async function runCheck() {
  for (const proc of activeProcesses) {
    if (proc.enabled === false) continue;

    const { alive, pid, cpu, mem, error } = await checkProcess(proc);

    if (alive) {
      log("info", proc.name, `运行正常 (PID:${pid} CPU:${cpu}% MEM:${mem}MB)`);
      await reportEvent(proc.name, "check", "info", "运行正常", { pid, cpu, mem });
    } else {
      log("error", proc.name, `进程未运行${error ? " (" + error + ")" : ""}`);
      await reportEvent(proc.name, "check", "error", `进程未运行${error ? ": " + error : ""}`);

      await restartProcess(proc);
    }

    await sleep((proc.interval || 30) * 1000);
  }

  const now = Date.now();
  if (now - lastReportTime > report_interval * 1000) {
    lastReportTime = now;
    await report(activeProcesses);
  }
}

async function main() {
  log("info", "agent", `看门狗 Agent 启动，主机: ${host_name || host_id}，平台: ${os.platform()} ${os.release()}`);
  log("info", "agent", `配置进程数: ${processes.length}，上报间隔: ${report_interval}s`);
  log("info", "agent", `自动发现: ${auto_detect ? "开启" : "关闭"}，目标: ${(auto_detect_targets || []).join(", ")}`);

  // 启动时立即执行一次自动发现
  if (auto_detect) {
    await autoDetectProcesses();
  }

  await report(activeProcesses);
  lastReportTime = Date.now();

  let lastAutoDetectTime = Date.now();
  let lastSysInfoTime = 0;
  let lastProcessListTime = 0;

  while (true) {
    try {
      await runCheck();

      const now = Date.now();

      // 定期自动发现进程
      if (auto_detect && (now - lastAutoDetectTime > auto_detect_interval * 1000)) {
        lastAutoDetectTime = now;
        await autoDetectProcesses();
      }

      // 定期采集系统信息
      if (now - lastSysInfoTime > system_info_interval * 1000) {
        lastSysInfoTime = now;
        const sysInfo = await collectSysInfo();
        await reportSysInfo(sysInfo);
      }

      // 定期上报全量进程列表
      if (now - lastProcessListTime > auto_detect_interval * 1000) {
        lastProcessListTime = now;
        const processList = await getProcessList();
        await reportProcessList(processList);
      }
    } catch (e) {
      log("error", "agent", `主循环异常: ${e.message}`);
      await sleep(10000);
    }
  }
}

process.on("SIGINT", () => {
  log("info", "agent", "收到退出信号，Agent 停止");
  process.exit(0);
});
process.on("SIGTERM", () => {
  log("info", "agent", "收到终止信号，Agent 停止");
  process.exit(0);
});

main();