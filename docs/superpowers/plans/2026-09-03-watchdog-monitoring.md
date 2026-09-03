# 看门狗监控系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现跨平台 B/S 架构看门狗监控系统，监控 node/npm、nginx、mysql 进程，支持异常自动重启、日志记录、Web 管理面板。

**Architecture:** Agent（客户端）部署在被监控机器上周期性检测进程并上报至 Server API；Server 端（Node.js + Express + MySQL）存储数据并提供 REST API；Admin 面板（Vue3）通过浏览器查看所有节点状态、进程详情和历史日志。

**Tech Stack:** Node.js 22+, Express, MySQL 8.0, Vue 3 + TypeScript + Vite + Element Plus

---

## 架构说明

```
watchdog-agent/          # 独立 Agent 客户端（部署到被监控机器）
  ├── package.json
  ├── config.json        # 监控配置（进程列表、检测间隔、重启阈值）
  ├── agent.js           # 核心：周期检测、上报、重启逻辑
  ├── install-service.js # 注册系统服务（Windows sc / Linux systemd）
  └── logs/              # 本地日志落盘目录

server/src/
  ├── routes/watchdog.js # 新增：watchdog API 路由
  └── migrate.js         # 修改：增加 watchdog 表迁移

admin/src/views/
  └── Watchdog.vue       # 新增：看门狗监控面板
```

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `watchdog-agent/agent.js` | 核心监控逻辑：进程检测、自愈重启、HTTP上报、本地日志 |
| `watchdog-agent/config.json` | 配置文件：主机标识、进程列表、检测间隔、重启阈值 |
| `watchdog-agent/install-service.js` | 安装为系统服务（Windows sc / Linux systemd） |
| `watchdog-agent/package.json` | Agent 独立依赖（无第三方依赖，纯 Node.js 内置模块） |
| `server/src/routes/watchdog.js` | 服务端 API：接收上报、查询主机/进程状态、日志查询 |
| `server/src/index.js` | 修改：挂载 watchdog 路由 |
| `server/src/migrate.js` | 修改：增加 watchdog 表结构 |
| `admin/src/views/Watchdog.vue` | 管理面板：主机列表、进程状态卡片、日志表格 |
| `admin/src/router/index.ts` | 修改：增加 watchdog 路由 |
| `admin/src/layout/AdminLayout.vue` | 修改：增加看门狗菜单项 |
| `admin/src/api/index.ts` | 修改：增加 watchdog API 方法 |

---

### Task 1: 数据库迁移 — watchdog 表

**Files:**
- Modify: `f:\kaifa\CYWEB\server\src\migrate.js`

- [ ] **Step 1: 添加 watchdog 三张表到迁移脚本**

在 `f:\kaifa\CYWEB\server\src\migrate.js` 现有 SQL 后追加以下 DDL：

```sql
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
```

- [ ] **Step 2: 运行迁移验证**

```bash
cd f:\kaifa\CYWEB\server && node src/migrate.js
```

预期输出包含 `[ok] watchdog_hosts 表创建成功`、`[ok] watchdog_config 表创建成功`、`[ok] watchdog_event_log 表创建成功`。

- [ ] **Step 3: 提交**

```bash
git add server/src/migrate.js
git commit -m "feat: 添加 watchdog 数据库表迁移"
```

---

### Task 2: 服务端 API — watchdog 路由

**Files:**
- Create: `f:\kaifa\CYWEB\server\src\routes\watchdog.js`
- Modify: `f:\kaifa\CYWEB\server\src\index.js`

- [ ] **Step 1: 创建 watchdog 路由文件**

创建 `f:\kaifa\CYWEB\server\src\routes\watchdog.js`：

```js
import { Router } from "express";
import { db } from "../db.js";
import { ok, fail, paginate } from "../utils.js";

const router = Router();

// ================= Agent 上报接口 =================

// Agent 心跳 + 状态上报
router.post("/report", async (req, res) => {
  const { host_id, host_name, host_os, host_ip, agent_version, processes } = req.body || {};
  if (!host_id) return fail(res, 400, "缺少 host_id");

  try {
    // 更新主机心跳
    await db.query(
      `INSERT INTO watchdog_hosts (host_id, host_name, host_os, host_ip, agent_version, last_heartbeat, status)
       VALUES (?, ?, ?, ?, ?, NOW(), 1)
       ON DUPLICATE KEY UPDATE host_name = VALUES(host_name), host_os = VALUES(host_os),
         host_ip = VALUES(host_ip), agent_version = VALUES(agent_version),
         last_heartbeat = NOW(), status = 1`,
      [host_id, host_name || host_id, host_os || "", host_ip || "", agent_version || ""]
    );

    // 同步进程配置
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

    // 更新主机心跳
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

export default router;
```

- [ ] **Step 2: 在 index.js 中挂载 watchdog 路由**

在 `f:\kaifa\CYWEB\server\src\index.js` 中：

修改 import 区域，添加：
```js
import watchdogRoutes from "./routes/watchdog.js";
```

在 API 路由挂载区域添加（放在 `app.use("/api/upload", uploadRoutes);` 之后）：
```js
app.use("/api/watchdog", watchdogRoutes);
```

- [ ] **Step 3: 提交**

```bash
git add server/src/routes/watchdog.js server/src/index.js
git commit -m "feat: 添加 watchdog 服务端 API 路由"
```

---

### Task 3: 管理面板 — Watchdog.vue 监控页面

**Files:**
- Create: `f:\kaifa\CYWEB\admin\src\views\Watchdog.vue`
- Modify: `f:\kaifa\CYWEB\admin\src\router\index.ts`
- Modify: `f:\kaifa\CYWEB\admin\src\layout\AdminLayout.vue`
- Modify: `f:\kaifa\CYWEB\admin\src\api\index.ts`

- [ ] **Step 1: 在 admin/api/index.ts 中添加 watchdog API 方法**

在 `f:\kaifa\CYWEB\admin\src\api\index.ts` 的 `api` 对象中添加：

```typescript
watchdog: {
  hosts: (params?: Record<string, any>) => http.get<Paged<any>>("/watchdog/hosts", params),
  hostConfig: (hostId: string) => http.get<any[]>(`/watchdog/hosts/${hostId}/config`),
  events: (params?: Record<string, any>) => http.get<Paged<any>>("/watchdog/events", params),
  updateConfig: (hostId: string, processName: string, data: any) =>
    http.put(`/watchdog/hosts/${hostId}/config/${processName}`, data),
},
```

- [ ] **Step 2: 创建 Watchdog.vue 页面**

创建 `f:\kaifa\CYWEB\admin\src\views\Watchdog.vue`：

```vue
<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const hosts = ref<any[]>([]);
const selectedHost = ref<any>(null);
const hostConfigs = ref<any[]>([]);
const events = ref<any[]>([]);
const eventsTotal = ref(0);
const autoRefresh = ref(true);
let timer: ReturnType<typeof setInterval> | null = null;

const eventQuery = reactive({
  page: 1,
  size: 20,
  host_id: "",
  process_name: "",
  event_type: "",
  level: "",
  start_date: "",
  end_date: "",
});

const eventTypeOptions = [
  { label: "全部", value: "" },
  { label: "进程检测", value: "check" },
  { label: "进程重启", value: "restart" },
  { label: "异常告警", value: "alert" },
  { label: "状态变更", value: "status" },
  { label: "心跳上报", value: "heartbeat" },
];

const levelOptions = [
  { label: "全部", value: "" },
  { label: "信息", value: "info" },
  { label: "警告", value: "warn" },
  { label: "错误", value: "error" },
  { label: "严重", value: "critical" },
];

function getLevelTag(level: string) {
  const map: Record<string, string> = {
    info: "success",
    warn: "warning",
    error: "danger",
    critical: "danger",
  };
  return map[level] || "info";
}

function getLevelLabel(level: string) {
  const map: Record<string, string> = {
    info: "信息",
    warn: "警告",
    error: "错误",
    critical: "严重",
  };
  return map[level] || level;
}

function getEventTypeLabel(type: string) {
  const map: Record<string, string> = {
    check: "进程检测",
    restart: "进程重启",
    alert: "异常告警",
    status: "状态变更",
    heartbeat: "心跳上报",
  };
  return map[type] || type;
}

function isOnline(host: any) {
  if (!host.last_heartbeat) return false;
  const t = new Date(host.last_heartbeat).getTime();
  return Date.now() - t < 120000;
}

function fmtTime(v: string) {
  return v ? v.replace("T", " ").slice(0, 19) : "-";
}

function timeAgo(v: string) {
  if (!v) return "从未";
  const diff = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
  if (diff < 60) return `${diff}秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

async function fetchHosts() {
  try {
    const res = await api.watchdog.hosts();
    hosts.value = res.list || [];
  } catch { /* ignore */ }
}

async function selectHost(host: any) {
  selectedHost.value = host;
  eventQuery.host_id = host.host_id;
  try {
    hostConfigs.value = await api.watchdog.hostConfig(host.host_id);
  } catch {
    hostConfigs.value = [];
  }
  fetchEvents();
}

async function fetchEvents() {
  loading.value = true;
  try {
    const res = await api.watchdog.events(eventQuery);
    events.value = res.list || [];
    eventsTotal.value = res.pagination?.total || 0;
  } finally {
    loading.value = false;
  }
}

function handleEventPageChange(page: number) {
  eventQuery.page = page;
  fetchEvents();
}

function toggleAutoRefresh() {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

function startAutoRefresh() {
  stopAutoRefresh();
  timer = setInterval(() => {
    fetchHosts();
    if (selectedHost.value) fetchEvents();
  }, 10000);
}

function stopAutoRefresh() {
  if (timer) { clearInterval(timer); timer = null; }
}

onMounted(() => {
  fetchHosts();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
});
</script>

<template>
  <div class="watchdog-page">
    <div class="page-header">
      <h2>看门狗监控</h2>
      <div class="header-actions">
        <el-switch v-model="autoRefresh" active-text="自动刷新" @change="toggleAutoRefresh" />
      </div>
    </div>

    <div class="watchdog-layout">
      <!-- 主机列表 -->
      <div class="host-panel">
        <h3>监控节点 ({{ hosts.length }})</h3>
        <div class="host-list">
          <div
            v-for="host in hosts"
            :key="host.host_id"
            class="host-item"
            :class="{ active: selectedHost?.host_id === host.host_id }"
            @click="selectHost(host)"
          >
            <div class="host-item__status">
              <span class="dot" :class="{ online: isOnline(host), offline: !isOnline(host) }"></span>
            </div>
            <div class="host-item__info">
              <div class="host-item__name">{{ host.host_name }}</div>
              <div class="host-item__meta">
                <span class="host-item__os">{{ host.host_os }}</span>
                <span class="host-item__time">{{ timeAgo(host.last_heartbeat) }}</span>
              </div>
            </div>
            <el-tag :type="isOnline(host) ? 'success' : 'danger'" size="small">
              {{ isOnline(host) ? '在线' : '离线' }}
            </el-tag>
          </div>
          <div v-if="!hosts.length" class="host-empty">暂无监控节点</div>
        </div>
      </div>

      <!-- 详情区 -->
      <div class="detail-panel">
        <template v-if="selectedHost">
          <!-- 进程状态卡片 -->
          <div class="process-cards">
            <div
              v-for="cfg in hostConfigs"
              :key="cfg.process_name"
              class="process-card"
              :class="{ disabled: !cfg.enabled }"
            >
              <div class="process-card__head">
                <span class="process-card__icon">⚙️</span>
                <span class="process-card__name">{{ cfg.process_display }}</span>
                <el-switch :model-value="!!cfg.enabled" size="small" disabled />
              </div>
              <div class="process-card__body">
                <div class="process-card__row">
                  <span>检测间隔</span>
                  <span>{{ cfg.check_interval }}s</span>
                </div>
                <div class="process-card__row">
                  <span>重启阈值</span>
                  <span>{{ cfg.max_restart }}次/{{ cfg.restart_window }}s</span>
                </div>
                <div class="process-card__row">
                  <span>启动命令</span>
                  <span class="process-card__cmd">{{ cfg.start_command }}</span>
                </div>
              </div>
            </div>
            <div v-if="!hostConfigs.length" class="process-empty">暂无进程配置</div>
          </div>

          <!-- 事件日志 -->
          <div class="event-section">
            <h3>事件日志</h3>
            <div class="event-filters">
              <el-select v-model="eventQuery.process_name" placeholder="进程" clearable size="small" style="width:120px" @change="fetchEvents">
                <el-option label="全部" value="" />
                <el-option v-for="cfg in hostConfigs" :key="cfg.process_name" :label="cfg.process_display" :value="cfg.process_name" />
              </el-select>
              <el-select v-model="eventQuery.event_type" placeholder="事件类型" clearable size="small" style="width:120px" @change="fetchEvents">
                <el-option v-for="opt in eventTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <el-select v-model="eventQuery.level" placeholder="级别" clearable size="small" style="width:100px" @change="fetchEvents">
                <el-option v-for="opt in levelOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <el-date-picker
                v-model="eventQuery.start_date"
                type="datetime"
                placeholder="开始时间"
                size="small"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:180px"
                @change="fetchEvents"
              />
              <el-date-picker
                v-model="eventQuery.end_date"
                type="datetime"
                placeholder="结束时间"
                size="small"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width:180px"
                @change="fetchEvents"
              />
            </div>

            <el-table :data="events" v-loading="loading" size="small" stripe>
              <el-table-column prop="created_at" label="时间" width="160">
                <template #default="{ row }">{{ fmtTime(row.created_at) }}</template>
              </el-table-column>
              <el-table-column prop="process_name" label="进程" width="100" />
              <el-table-column prop="event_type" label="事件类型" width="100">
                <template #default="{ row }">{{ getEventTypeLabel(row.event_type) }}</template>
              </el-table-column>
              <el-table-column prop="level" label="级别" width="80">
                <template #default="{ row }">
                  <el-tag :type="getLevelTag(row.level)" size="small">{{ getLevelLabel(row.level) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="message" label="内容" min-width="200" show-overflow-tooltip />
              <el-table-column prop="cpu_percent" label="CPU%" width="70" />
              <el-table-column prop="mem_mb" label="内存MB" width="90" />
              <el-table-column prop="restart_count" label="重启次数" width="90" />
            </el-table>

            <div class="event-pagination" v-if="eventsTotal > eventQuery.size">
              <el-pagination
                v-model:current-page="eventQuery.page"
                :page-size="eventQuery.size"
                :total="eventsTotal"
                layout="prev, pager, next"
                small
                @current-change="handleEventPageChange"
              />
            </div>
          </div>
        </template>

        <div v-else class="detail-empty">
          <div class="empty-icon">📡</div>
          <p>请从左侧选择一个监控节点查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.watchdog-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h2 { font-size: 20px; font-weight: 700; margin: 0; }
.header-actions { display: flex; gap: 12px; align-items: center; }

.watchdog-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; min-height: calc(100vh - 200px); }

.host-panel { background: #fff; border-radius: 8px; border: 1px solid #e4e7ed; padding: 16px; }
.host-panel h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: #303133; }
.host-list { display: flex; flex-direction: column; gap: 4px; }
.host-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 6px; cursor: pointer; transition: background .2s; }
.host-item:hover { background: #f5f7fa; }
.host-item.active { background: #ecf5ff; border: 1px solid #d9ecff; }
.host-item__status .dot { display: block; width: 8px; height: 8px; border-radius: 50%; }
.host-item__status .dot.online { background: #67c23a; box-shadow: 0 0 6px rgba(103,194,58,.4); }
.host-item__status .dot.offline { background: #f56c6c; }
.host-item__info { flex: 1; min-width: 0; }
.host-item__name { font-size: 13px; font-weight: 500; color: #303133; }
.host-item__meta { display: flex; gap: 8px; font-size: 11px; color: #909399; margin-top: 2px; }
.host-empty { text-align: center; padding: 40px; color: #909399; font-size: 13px; }

.detail-panel { background: #fff; border-radius: 8px; border: 1px solid #e4e7ed; padding: 20px; }
.detail-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #909399; }
.detail-empty .empty-icon { font-size: 48px; margin-bottom: 12px; }

.process-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 24px; }
.process-card { background: #fafbfc; border: 1px solid #e4e7ed; border-radius: 8px; padding: 14px; }
.process-card.disabled { opacity: .5; }
.process-card__head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.process-card__icon { font-size: 18px; }
.process-card__name { font-size: 14px; font-weight: 600; flex: 1; }
.process-card__body { display: flex; flex-direction: column; gap: 6px; }
.process-card__row { display: flex; justify-content: space-between; font-size: 12px; color: #606266; }
.process-card__cmd { font-family: monospace; font-size: 11px; color: #909399; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.process-empty { text-align: center; padding: 20px; color: #909399; font-size: 13px; }

.event-section { margin-top: 8px; }
.event-section h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; }
.event-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.event-pagination { display: flex; justify-content: center; margin-top: 12px; }
</style>
```

- [ ] **Step 3: 在 router/index.ts 中添加路由**

在 `f:\kaifa\CYWEB\admin\src\router\index.ts` 的 children 数组中添加：

```typescript
{ path: "watchdog", name: "watchdog", component: () => import("@/views/Watchdog.vue"), meta: { title: "看门狗监控", icon: "Monitor" } },
```

- [ ] **Step 4: 在 AdminLayout.vue 中添加菜单项**

在 `f:\kaifa\CYWEB\admin\src\layout\AdminLayout.vue` 的 `otherMenus` 数组中添加：

```typescript
{ path: "/watchdog", title: "看门狗监控", icon: "Monitor" },
```

- [ ] **Step 5: 提交**

```bash
git add admin/src/views/Watchdog.vue admin/src/router/index.ts admin/src/layout/AdminLayout.vue admin/src/api/index.ts
git commit -m "feat: 添加看门狗监控 B/S 管理面板"
```

---

### Task 4: Watchdog Agent 客户端

**Files:**
- Create: `f:\kaifa\CYWEB\watchdog-agent\package.json`
- Create: `f:\kaifa\CYWEB\watchdog-agent\config.json`
- Create: `f:\kaifa\CYWEB\watchdog-agent\agent.js`
- Create: `f:\kaifa\CYWEB\watchdog-agent\install-service.js`

- [ ] **Step 1: 创建 package.json**

创建 `f:\kaifa\CYWEB\watchdog-agent\package.json`：

```json
{
  "name": "chiyao-watchdog-agent",
  "version": "1.0.0",
  "description": "驰耀科技看门狗监控客户端",
  "type": "module",
  "main": "agent.js",
  "scripts": {
    "start": "node agent.js",
    "install-service": "node install-service.js"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: 创建 config.json 配置文件**

创建 `f:\kaifa\CYWEB\watchdog-agent\config.json`：

```json
{
  "host_id": "server-01",
  "host_name": "生产服务器",
  "server_url": "http://your-server:3000/api/watchdog",
  "report_interval": 30,
  "processes": [
    {
      "name": "node",
      "display": "Node.js 应用",
      "check_cmd": "tasklist",
      "check_pattern": "node.exe",
      "start_cmd": "net start chiyao-site",
      "stop_cmd": "net stop chiyao-site",
      "interval": 30,
      "max_restart": 5,
      "restart_window": 600
    },
    {
      "name": "nginx",
      "display": "Nginx Web 服务",
      "check_cmd": "tasklist",
      "check_pattern": "nginx.exe",
      "start_cmd": "net start nginx",
      "stop_cmd": "net stop nginx",
      "interval": 30,
      "max_restart": 3,
      "restart_window": 600
    },
    {
      "name": "mysql",
      "display": "MySQL 数据库",
      "check_cmd": "tasklist",
      "check_pattern": "mysqld.exe",
      "start_cmd": "net start MySQL80",
      "stop_cmd": "net stop MySQL80",
      "interval": 30,
      "max_restart": 3,
      "restart_window": 600
    }
  ]
}
```

- [ ] **Step 3: 创建 agent.js 核心监控逻辑**

创建 `f:\kaifa\CYWEB\watchdog-agent\agent.js`：

```js
import { exec } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载配置
const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("配置文件 config.json 不存在，请先创建");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const { host_id, host_name, server_url, report_interval = 30, processes = [] } = config;
const LOG_DIR = path.join(__dirname, "logs");
fs.mkdirSync(LOG_DIR, { recursive: true });

// 重启计数器 { processName: { count, windowStart } }
const restartCounters = {};

// ================= 日志系统 =================
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

// ================= HTTP 上报 =================
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
      cpu_percent: extra.cpu_percent || 0,
      mem_mb: extra.mem_mb || 0,
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

// ================= 进程检测 =================
async function checkProcess(proc) {
  const isWin = os.platform() === "win32";

  try {
    let alive = false;
    let pid = 0;
    let cpu_percent = 0;
    let mem_mb = 0;

    if (isWin) {
      // Windows: 使用 tasklist 检测
      const pattern = proc.check_pattern || `${proc.name}.exe`;
      const { stdout } = await execAsync(`tasklist /FI "IMAGENAME eq ${pattern}" /FO CSV /NH`, { timeout: 10000 });
      alive = stdout.toLowerCase().includes(pattern.toLowerCase().replace(".exe", ""));
      if (alive) {
        const lines = stdout.trim().split("\n").filter(Boolean);
        const fields = lines[0].replace(/"/g, "").split(",");
        pid = parseInt(fields[1]) || 0;
        const memKb = parseInt(fields[4]?.replace(/[^0-9]/g, "")) || 0;
        mem_mb = Math.round(memKb / 1024 * 10) / 10;
      }
    } else {
      // Linux: 使用 pgrep
      try {
        const { stdout } = await execAsync(`pgrep -f "${proc.check_pattern || proc.name}"`, { timeout: 5000 });
        const pids = stdout.trim().split("\n").filter(Boolean);
        alive = pids.length > 0;
        if (alive) {
          pid = parseInt(pids[0]);
          try {
            const { stdout: psOut } = await execAsync(`ps -p ${pid} -o %cpu=,rss=`, { timeout: 3000 });
            const parts = psOut.trim().split(/\s+/);
            cpu_percent = parseFloat(parts[0]) || 0;
            mem_mb = Math.round((parseInt(parts[1]) || 0) / 1024 * 10) / 10;
          } catch { /* ps 失败忽略 */ }
        }
      } catch {
        alive = false;
      }
    }

    return { alive, pid, cpu_percent, mem_mb };
  } catch (e) {
    log("error", proc.name, `检测异常: ${e.message}`);
    return { alive: false, pid: 0, cpu_percent: 0, mem_mb: 0, error: e.message };
  }
}

// ================= 重启逻辑 =================
async function restartProcess(proc) {
  const isWin = os.platform() === "win32";

  // 检查重启阈值
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

    // 验证重启是否成功
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

// ================= 主循环 =================
let lastReportTime = 0;

async function runCheck() {
  for (const proc of processes) {
    if (proc.enabled === false) continue;

    const { alive, pid, cpu_percent, mem_mb, error } = await checkProcess(proc);

    if (alive) {
      log("info", proc.name, `运行正常 (PID:${pid} CPU:${cpu_percent}% MEM:${mem_mb}MB)`);
      await reportEvent(proc.name, "check", "info", "运行正常", { pid, cpu_percent, mem_mb });
    } else {
      log("error", proc.name, `进程未运行${error ? " (" + error + ")" : ""}`);
      await reportEvent(proc.name, "check", "error", `进程未运行${error ? ": " + error : ""}`);

      // 尝试自动重启
      await restartProcess(proc);
    }

    // 每个进程检测后等待配置的间隔
    await sleep((proc.interval || 30) * 1000);
  }

  // 定期上报状态
  const now = Date.now();
  if (now - lastReportTime > report_interval * 1000) {
    lastReportTime = now;
    await report(processes);
  }
}

// ================= 启动 =================
async function main() {
  log("info", "agent", `看门狗 Agent 启动，主机: ${host_name || host_id}，平台: ${os.platform()} ${os.release()}`);
  log("info", "agent", `监控进程数: ${processes.length}，上报间隔: ${report_interval}s`);

  // 首次上报
  await report(processes);
  lastReportTime = Date.now();

  // 循环检测
  while (true) {
    try {
      await runCheck();
    } catch (e) {
      log("error", "agent", `主循环异常: ${e.message}`);
      await sleep(10000);
    }
  }
}

// 优雅退出
process.on("SIGINT", () => {
  log("info", "agent", "收到退出信号，Agent 停止");
  process.exit(0);
});
process.on("SIGTERM", () => {
  log("info", "agent", "收到终止信号，Agent 停止");
  process.exit(0);
});

main();
```

- [ ] **Step 4: 创建 install-service.js 安装脚本**

创建 `f:\kaifa\CYWEB\watchdog-agent\install-service.js`：

```js
import { execSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeExe = process.execPath;
const agentPath = path.join(__dirname, "agent.js");
const isWin = os.platform() === "win32";

if (isWin) {
  // Windows: 注册为 Windows 服务
  const serviceName = "ChiyaoWatchdog";
  const displayName = "驰耀科技看门狗监控";

  console.log("注册 Windows 服务...");

  try {
    // 先停止并删除旧服务（如果存在）
    try { execSync(`sc stop ${serviceName}`, { stdio: "ignore" }); } catch {}
    try { execSync(`sc delete ${serviceName}`, { stdio: "ignore" }); } catch {}

    // 创建新服务
    execSync(
      `sc create ${serviceName} binPath= "\\"${nodeExe}\\" \\"${agentPath}\\"" start= auto DisplayName= "${displayName}"`,
      { stdio: "inherit" }
    );

    // 设置失败自动重启
    execSync(
      `sc failure ${serviceName} reset= 86400 actions= restart/60000/restart/60000/restart/60000`,
      { stdio: "inherit" }
    );

    // 启动服务
    execSync(`sc start ${serviceName}`, { stdio: "inherit" });

    console.log(`Windows 服务 "${displayName}" 安装并启动成功`);
    console.log(`管理命令: sc start|stop|query ${serviceName}`);
  } catch (e) {
    console.error("安装 Windows 服务失败:", e.message);
    console.error("请以管理员权限运行此脚本");
    process.exit(1);
  }
} else {
  // Linux: 创建 systemd 服务文件
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
  const fs = await import("node:fs");
  
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
```

- [ ] **Step 5: 提交**

```bash
git add watchdog-agent/
git commit -m "feat: 添加看门狗 Agent 客户端（跨平台进程监控+自愈重启+双端日志）"
```

---

### Task 5: 最终验证与提交

- [ ] **Step 1: 检查所有文件完整性**

```bash
git status
```

- [ ] **Step 2: 推送至 GitHub**

```bash
git push origin main
```

---

## 验证清单

1. 运行 `node server/src/migrate.js` 确认 watchdog 表创建成功
2. 启动 server，测试 `POST /api/watchdog/report` 和 `POST /api/watchdog/event`
3. 启动 admin，访问看门狗监控页面，确认页面正常渲染
4. 部署 agent 到测试机，确认进程检测、日志记录、自动重启功能正常
5. 确认断网场景下 agent 本地日志持续写入，网络恢复后上报恢复

## 注意事项

- Agent 的 `config.json` 需要根据实际部署环境修改 `server_url`、`host_id` 和进程检测命令
- Windows 下的 nginx/mysql 通常是 Windows 服务，使用 `net start/stop` 管理
- Linux 下的 nginx/mysql 是 systemd 服务，使用 `systemctl start/stop` 管理
- Agent 安装服务需要管理员/root 权限
- 重启死循环保护：短时间内重启超过阈值自动暂停，记录严重告警