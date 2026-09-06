import { execSync, exec } from "node:child_process";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, "config.json");

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    console.error("[agent] 配置文件 config.json 不存在，请先创建");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf-8"));
}

const cfg = loadConfig();
const API_BASE = cfg.api_base || "http://localhost:3000/api/watchdog";
const HOST_ID = cfg.host_id || os.hostname();
const HOST_NAME = cfg.host_name || os.hostname();
const AGENT_VERSION = "1.0.0";

// 监控的进程列表
const PROCESSES = cfg.processes || [
  { name: "node", display: "Node.js 后端", check_cmd: "check_port 3000", start_cmd: "npm run prod", stop_cmd: "", interval: 30, max_restart: 5, restart_window: 600, enabled: true },
  { name: "nginx", display: "Nginx", check_cmd: "check_port 80", start_cmd: "net start nginx", stop_cmd: "net stop nginx", interval: 30, max_restart: 3, restart_window: 600, enabled: true },
  { name: "mysql", display: "MySQL", check_cmd: "check_service MySQL80", start_cmd: "net start MySQL80", stop_cmd: "net stop MySQL80", interval: 30, max_restart: 3, restart_window: 600, enabled: true },
];

// 重启记录
const restartLog = {};

function httpPost(url, data) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const urlObj = new URL(url);
    const mod = url.startsWith("https") ? https : http;
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
      timeout: 10000,
    };
    const req = mod.request(options, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve(d); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.write(body);
    req.end();
  });
}

function execCmd(cmd, timeout = 10000) {
  try {
    return execSync(cmd, { timeout, encoding: "utf-8", windowsHide: true }).trim();
  } catch {
    return null;
  }
}

function checkProcess(cmd) {
  if (!cmd) return true;
  if (cmd.startsWith("check_port ")) {
    const port = cmd.split(" ")[1];
    const out = execCmd(`netstat -ano | findstr :${port}`);
    return out && out.includes("LISTENING");
  }
  if (cmd.startsWith("check_service ")) {
    const svc = cmd.split(" ")[1];
    const out = execCmd(`sc query "${svc}" | findstr "RUNNING"`);
    return out && out.includes("RUNNING");
  }
  if (cmd.startsWith("check_process ")) {
    const name = cmd.split(" ")[1];
    const out = execCmd(`tasklist /FI "IMAGENAME eq ${name}" 2>nul | findstr "${name}"`);
    return out && out.includes(name);
  }
  try {
    execSync(cmd, { timeout: 10000, windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function startProcess(cmd) {
  if (!cmd) return false;
  try {
    exec(cmd, { windowsHide: true, detached: false });
    return true;
  } catch (e) {
    console.error(`[agent] 启动进程失败: ${cmd}`, e.message);
    return false;
  }
}

function getSystemInfo() {
  const cpus = os.cpus();
  const totalIdle = cpus.reduce((a, c) => a + c.times.idle, 0);
  const totalTick = cpus.reduce((a, c) => a + Object.values(c.times).reduce((s, t) => s + t, 0), 0);
  const cpuUsage = totalTick > 0 ? ((1 - totalIdle / totalTick) * 100).toFixed(2) : 0;

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = ((usedMem / totalMem) * 100).toFixed(2);

  const loadAvg = os.loadavg();
  const uptime = os.uptime();

  let diskTotal = 0, diskUsed = 0, diskPercent = 0;
  try {
    const diskOut = execCmd("wmic logicaldisk where drivetype=3 get size,freespace /format:csv", 5000);
    if (diskOut) {
      const lines = diskOut.trim().split("\n").slice(1);
      for (const line of lines) {
        const parts = line.split(",");
        if (parts.length >= 3) {
          // wmic CSV 格式: Node,FreeSpace,Size
          const freeSpace = parseInt(parts[1]) || 0;
          const size = parseInt(parts[2]) || 0;
          diskTotal += size;
          diskUsed += size - freeSpace;
        }
      }
      diskPercent = diskTotal > 0 ? ((diskUsed / diskTotal) * 100).toFixed(2) : 0;
    }
  } catch { /* ignore */ }

  let netRx = 0, netTx = 0;
  try {
    const netOut = execCmd("netstat -e", 5000);
    if (netOut) {
      const rxMatch = netOut.match(/Bytes\s+(\d+)/);
      const txMatch = netOut.match(/Bytes\s+\d+\s+(\d+)/);
      if (rxMatch) netRx = parseInt(rxMatch[1]);
      if (txMatch) netTx = parseInt(txMatch[1]);
    }
  } catch { /* ignore */ }

  return {
    host_id: HOST_ID,
    host_name: HOST_NAME,
    cpu_usage: Number(cpuUsage),
    mem_total: Math.round(totalMem / 1024 / 1024),
    mem_used: Math.round(usedMem / 1024 / 1024),
    mem_percent: Number(memPercent),
    disk_total: Math.round(diskTotal / 1024 / 1024),
    disk_used: Math.round(diskUsed / 1024 / 1024),
    disk_percent: Number(diskPercent),
    load_1: loadAvg[0] || 0,
    load_5: loadAvg[1] || 0,
    load_15: loadAvg[2] || 0,
    uptime: uptime,
    net_rx: netRx,
    net_tx: netTx,
  };
}

function getProcessList() {
  const list = [];
  try {
    const out = execCmd("tasklist /FO CSV /NH", 8000);
    if (out) {
      const lines = out.trim().split("\n");
      for (const line of lines) {
        const parts = line.replace(/"/g, "").split(",");
        if (parts.length >= 5) {
          const name = parts[0].trim();
          const pid = parseInt(parts[1]) || 0;
          const memKB = parseInt(parts[4].replace(/[^0-9]/g, "")) || 0;
          const isTarget = PROCESSES.some((p) => {
            const exeName = name.toLowerCase();
            if (p.name === "nginx" && exeName.includes("nginx")) return true;
            if (p.name === "mysql" && (exeName.includes("mysqld") || exeName.includes("mysql"))) return true;
            if (p.name === "node" && (exeName.includes("node") || exeName.includes("node.exe"))) return true;
            return false;
          });
          list.push({
            name,
            pid,
            mem_mb: (memKB / 1024).toFixed(1),
            is_target: isTarget,
          });
        }
      }
    }
  } catch (e) {
    console.error("[agent] 获取进程列表失败:", e.message);
  }
  return list;
}

async function reportHeartbeat() {
  try {
    await httpPost(`${API_BASE}/report`, {
      host_id: HOST_ID,
      host_name: HOST_NAME,
      host_os: `${os.type()} ${os.release()}`,
      host_ip: getLocalIP(),
      agent_version: AGENT_VERSION,
      processes: PROCESSES,
    });
    console.log(`[agent] 心跳上报成功 (${new Date().toLocaleTimeString()})`);
  } catch (e) {
    console.error("[agent] 心跳上报失败:", e.message);
  }
}

async function reportSysInfo() {
  try {
    const info = getSystemInfo();
    await httpPost(`${API_BASE}/sysinfo`, info);
    console.log(`[agent] 系统信息上报成功 CPU:${info.cpu_usage}% MEM:${info.mem_percent}%`);
  } catch (e) {
    console.error("[agent] 系统信息上报失败:", e.message);
  }
}

async function reportProcessList() {
  try {
    const list = getProcessList();
    const targetCount = list.filter((p) => p.is_target).length;
    await httpPost(`${API_BASE}/process-list`, {
      host_id: HOST_ID,
      host_name: HOST_NAME,
      process_list: list,
      total_count: list.length,
      target_count: targetCount,
    });
    console.log(`[agent] 进程列表上报成功 共${list.length}个进程, 目标${targetCount}个`);
  } catch (e) {
    console.error("[agent] 进程列表上报失败:", e.message);
  }
}

async function reportEvent(processName, eventType, level, message, pid, cpuPercent, memMb, restartCount) {
  try {
    await httpPost(`${API_BASE}/event`, {
      host_id: HOST_ID,
      process_name: processName,
      event_type: eventType,
      level: level,
      message: message,
      pid: pid || 0,
      cpu_percent: cpuPercent || 0,
      mem_mb: memMb || 0,
      restart_count: restartCount || 0,
    });
  } catch (e) {
    console.error("[agent] 事件上报失败:", e.message);
  }
}

function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}

function isInRestartWindow(processName) {
  const log = restartLog[processName];
  if (!log || log.count === 0) return false;
  const now = Date.now();
  const elapsed = now - log.firstTime;
  const window = (PROCESSES.find((p) => p.name === processName) || {}).restart_window || 600;
  return elapsed < window * 1000;
}

function canRestart(processName) {
  const proc = PROCESSES.find((p) => p.name === processName);
  if (!proc) return false;
  const log = restartLog[processName];
  if (!log || log.count === 0) return true;
  const now = Date.now();
  const elapsed = now - log.firstTime;
  const window = proc.restart_window || 600;
  if (elapsed > window * 1000) {
    restartLog[processName] = { count: 0, firstTime: 0 };
    return true;
  }
  return log.count < (proc.max_restart || 5);
}

function recordRestart(processName) {
  const now = Date.now();
  if (!restartLog[processName] || restartLog[processName].count === 0) {
    restartLog[processName] = { count: 1, firstTime: now };
  } else {
    restartLog[processName].count++;
  }
}

async function checkAllProcesses() {
  for (const proc of PROCESSES) {
    if (!proc.enabled) continue;
    const isRunning = checkProcess(proc.check_cmd);
    if (!isRunning) {
      console.log(`[agent] ${proc.display} (${proc.name}) 检测异常，尝试重启...`);
      if (canRestart(proc.name)) {
        recordRestart(proc.name);
        const count = restartLog[proc.name].count;
        const started = startProcess(proc.start_cmd);
        if (started) {
          console.log(`[agent] ${proc.display} 重启命令已执行 (第${count}次)`);
          await reportEvent(proc.name, "restart", "warn", `${proc.display} 异常，已自动重启 (第${count}次)`, 0, 0, 0, count);
        } else {
          console.log(`[agent] ${proc.display} 重启命令为空，仅上报告警`);
          await reportEvent(proc.name, "alert", "error", `${proc.display} 检测异常，自动重启失败：命令为空`, 0, 0, 0, count);
        }
      } else {
        console.log(`[agent] ${proc.display} 超过重启次数限制，不再自动重启`);
        await reportEvent(proc.name, "alert", "critical", `${proc.display} 频繁异常，已超过重启限制 (${proc.max_restart}次/${proc.restart_window}秒)`, 0, 0, 0, restartLog[proc.name]?.count || 0);
      }
    } else {
      await reportEvent(proc.name, "check", "info", `${proc.display} 运行正常`, 0, 0, 0, 0);
    }
  }
}

async function main() {
  console.log("================================================");
  console.log("  看门狗监控 Agent v" + AGENT_VERSION);
  console.log("  Host ID: " + HOST_ID);
  console.log("  Host Name: " + HOST_NAME);
  console.log("  API: " + API_BASE);
  console.log("  监控进程: " + PROCESSES.filter((p) => p.enabled).map((p) => p.display).join(", "));
  console.log("================================================");

  await reportHeartbeat();
  await reportSysInfo();
  await reportProcessList();

  setInterval(reportHeartbeat, 30000);
  setInterval(reportSysInfo, 60000);
  setInterval(checkAllProcesses, 30000);
  setInterval(reportProcessList, 300000);

  console.log("[agent] 看门狗 Agent 已启动，开始监控...");
}

main().catch((e) => {
  console.error("[agent] 启动失败:", e.message);
  process.exit(1);
});