import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeExe = process.execPath;
const agentPath = path.join(__dirname, "agent.js");
const isWin = os.platform() === "win32";

if (isWin) {
  const serviceName = "ChiyaoWatchdog";
  const displayName = "驰耀科技看门狗监控";

  console.log("注册 Windows 服务...");

  try {
    try { execSync(`sc stop ${serviceName}`, { stdio: "ignore" }); } catch { /* ignore */ }
    try { execSync(`sc delete ${serviceName}`, { stdio: "ignore" }); } catch { /* ignore */ }

    execSync(
      `sc create ${serviceName} binPath= "\\"${nodeExe}\\" \\"${agentPath}\\"" start= auto DisplayName= "${displayName}"`,
      { stdio: "inherit" }
    );

    execSync(
      `sc failure ${serviceName} reset= 86400 actions= restart/60000/restart/60000/restart/60000`,
      { stdio: "inherit" }
    );

    execSync(`sc start ${serviceName}`, { stdio: "inherit" });

    console.log(`Windows 服务 "${displayName}" 安装并启动成功`);
    console.log(`管理命令: sc start|stop|query ${serviceName}`);
  } catch (e) {
    console.error("安装 Windows 服务失败:", e.message);
    console.error("请以管理员权限运行此脚本");
    process.exit(1);
  }
} else {
  const serviceContent = `[Unit]
Description=驰耀科技看门狗监控 Agent
After=network.target

[Service]
Type=simple
User=root
ExecStart=${nodeExe} ${agentPath}
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=chiyao-watchdog

[Install]
WantedBy=multi-user.target
`;

  const servicePath = "/etc/systemd/system/chiyao-watchdog.service";

  try {
    fs.writeFileSync(servicePath, serviceContent);
    execSync("systemctl daemon-reload", { stdio: "inherit" });
    execSync("systemctl enable chiyao-watchdog", { stdio: "inherit" });
    execSync("systemctl start chiyao-watchdog", { stdio: "inherit" });
    console.log("systemd 服务安装并启动成功");
    console.log("管理命令: systemctl start|stop|restart|status chiyao-watchdog");
  } catch (e) {
    console.error("安装 systemd 服务失败:", e.message);
    console.error("请以 root 权限运行此脚本");
    process.exit(1);
  }
}