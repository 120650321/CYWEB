<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from "vue";
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
  } catch {
    /* ignore */
  }
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
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
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
              {{ isOnline(host) ? "在线" : "离线" }}
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
                <span class="process-card__icon">&#x2699;&#xFE0F;</span>
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
              <el-select
                v-model="eventQuery.process_name"
                placeholder="进程"
                clearable
                size="small"
                style="width: 120px"
                @change="fetchEvents"
              >
                <el-option label="全部" value="" />
                <el-option
                  v-for="cfg in hostConfigs"
                  :key="cfg.process_name"
                  :label="cfg.process_display"
                  :value="cfg.process_name"
                />
              </el-select>
              <el-select
                v-model="eventQuery.event_type"
                placeholder="事件类型"
                clearable
                size="small"
                style="width: 120px"
                @change="fetchEvents"
              >
                <el-option v-for="opt in eventTypeOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <el-select
                v-model="eventQuery.level"
                placeholder="级别"
                clearable
                size="small"
                style="width: 100px"
                @change="fetchEvents"
              >
                <el-option v-for="opt in levelOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <el-date-picker
                v-model="eventQuery.start_date"
                type="datetime"
                placeholder="开始时间"
                size="small"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 180px"
                @change="fetchEvents"
              />
              <el-date-picker
                v-model="eventQuery.end_date"
                type="datetime"
                placeholder="结束时间"
                size="small"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
                style="width: 180px"
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

            <div v-if="eventsTotal > eventQuery.size" class="event-pagination">
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
          <div class="empty-icon">&#x1F4E1;</div>
          <p>请从左侧选择一个监控节点查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.watchdog-page {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h2 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
}
.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.watchdog-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 20px;
  min-height: calc(100vh - 200px);
}

.host-panel {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 16px;
}
.host-panel h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  color: #303133;
}
.host-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.host-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}
.host-item:hover {
  background: #f5f7fa;
}
.host-item.active {
  background: #ecf5ff;
  border: 1px solid #d9ecff;
}
.host-item__status .dot {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.host-item__status .dot.online {
  background: #67c23a;
  box-shadow: 0 0 6px rgba(103, 194, 58, 0.4);
}
.host-item__status .dot.offline {
  background: #f56c6c;
}
.host-item__info {
  flex: 1;
  min-width: 0;
}
.host-item__name {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}
.host-item__meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}
.host-empty {
  text-align: center;
  padding: 40px;
  color: #909399;
  font-size: 13px;
}

.detail-panel {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  padding: 20px;
}
.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #909399;
}
.detail-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.process-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}
.process-card {
  background: #fafbfc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 14px;
}
.process-card.disabled {
  opacity: 0.5;
}
.process-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.process-card__icon {
  font-size: 18px;
}
.process-card__name {
  font-size: 14px;
  font-weight: 600;
  flex: 1;
}
.process-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.process-card__row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
}
.process-card__cmd {
  font-family: monospace;
  font-size: 11px;
  color: #909399;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.process-empty {
  text-align: center;
  padding: 20px;
  color: #909399;
  font-size: 13px;
}

.event-section {
  margin-top: 8px;
}
.event-section h3 {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
}
.event-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.event-pagination {
  display: flex;
  justify-content: center;
  margin-top: 12px;
}
</style>