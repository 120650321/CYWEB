<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, computed } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import * as echarts from "echarts";
import { api } from "@/api";

const loading = ref(false);
const stats = ref<any>({});
const trends = ref<any>({ labels: [], pvSeries: [], uvSeries: [], hours: [], hourPV: [], hourUV: [] });
const pages = ref<any[]>([]);
const regions = ref<any[]>([]);
const list = ref<any[]>([]);
const total = ref(0);
const query = reactive({ page: 1, size: 20, keyword: "" });

const trendDays = ref(7);
const dateRange = ref<[string, string] | null>(null);
const customDateMode = ref(false);

const trendRef = ref<HTMLElement | null>(null);
const hourRef = ref<HTMLElement | null>(null);
const pageRef = ref<HTMLElement | null>(null);
const regionRef = ref<HTMLElement | null>(null);
let trendChart: echarts.ECharts | null = null;
let hourChart: echarts.ECharts | null = null;
let pageChart: echarts.ECharts | null = null;
let regionChart: echarts.ECharts | null = null;
let resizeHandler: (() => void) | null = null;

const statCards = [
  { key: "totalPV", label: "总访问量 (PV)", icon: "👁️", cls: "stat-card__icon--blue" },
  { key: "totalUV", label: "独立访客 (UV)", icon: "👤", cls: "stat-card__icon--purple" },
  { key: "todayPV", label: "今日 PV", icon: "📅", cls: "stat-card__icon--cyan" },
  { key: "todayUV", label: "今日 UV", icon: "🆕", cls: "stat-card__icon--green" },
  { key: "yesterdayPV", label: "昨日 PV", icon: "📆", cls: "stat-card__icon--orange" },
  { key: "yesterdayUV", label: "昨日 UV", icon: "🔄", cls: "stat-card__icon--red" },
  { key: "weekPV", label: "近7天 PV", icon: "📊", cls: "stat-card__icon--blue" },
  { key: "weekUV", label: "近7天 UV", icon: "📈", cls: "stat-card__icon--purple" },
  { key: "monthPV", label: "近30天 PV", icon: "📋", cls: "stat-card__icon--cyan" },
  { key: "monthUV", label: "近30天 UV", icon: "📉", cls: "stat-card__icon--green" },
];

const clearPresets = [
  { label: "近一个月", days: 30 },
  { label: "近三个月", days: 90 },
  { label: "近半年", days: 180 },
  { label: "近一年", days: 365 },
];

const dateParams = computed(() => {
  if (customDateMode.value && dateRange.value) {
    return { start_date: dateRange.value[0], end_date: dateRange.value[1] };
  }
  return {};
});

function fmtDate(v: string) {
  return v ? v.replace("T", " ").slice(0, 19) : "-";
}

async function fetchStats() {
  const [s, t, p, r] = await Promise.all([
    api.visits.stats(dateParams.value),
    api.visits.trends({ ...dateParams.value, days: trendDays.value }),
    api.visits.pages(dateParams.value),
    api.visits.regions(dateParams.value),
  ]);
  stats.value = s;
  trends.value = t;
  pages.value = p;
  regions.value = r;
  setTimeout(initCharts, 100);
}

async function fetchLogs() {
  loading.value = true;
  try {
    const params: any = { page: query.page, size: query.size };
    if (query.keyword) params.keyword = query.keyword;
    if (customDateMode.value && dateRange.value) {
      params.start_date = dateRange.value[0];
      params.end_date = dateRange.value[1];
    }
    const res = await api.visits.logs(params);
    list.value = res.list;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

async function changeDays(days: number) {
  trendDays.value = days;
  customDateMode.value = false;
  dateRange.value = null;
  const t = await api.visits.trends({ days });
  trends.value = t;
  updateTrendChart();
  await fetchStats();
  await fetchLogs();
}

async function applyDateRange() {
  if (!dateRange.value) return;
  customDateMode.value = true;
  await fetchStats();
  await fetchLogs();
}

function resetDateRange() {
  customDateMode.value = false;
  dateRange.value = null;
  trendDays.value = 7;
  fetchStats();
  fetchLogs();
}

function initCharts() {
  if (trendRef.value && !trendChart) {
    trendChart = echarts.init(trendRef.value);
    updateTrendChart();
  }
  if (hourRef.value && !hourChart) {
    hourChart = echarts.init(hourRef.value);
    updateHourChart();
  }
  if (pageRef.value && !pageChart) {
    pageChart = echarts.init(pageRef.value);
    updatePageChart();
  }
  if (regionRef.value && !regionChart) {
    regionChart = echarts.init(regionRef.value);
    updateRegionChart();
  }
}

function updateTrendChart() {
  if (!trendChart) return;
  trendChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["PV", "UV"], top: 0, right: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: "category",
      data: trends.value.labels,
      boundaryGap: false,
      axisLine: { lineStyle: { color: "#d4deee" } },
      axisLabel: { color: "#5a6b85" },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#eef2f8" } },
      axisLabel: { color: "#93a1b8" },
    },
    series: [
      {
        name: "PV",
        type: "line",
        smooth: true,
        data: trends.value.pvSeries,
        symbolSize: 7,
        lineStyle: { width: 3, color: "#0b5fff" },
        itemStyle: { color: "#0b5fff" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(11,95,255,0.25)" },
            { offset: 1, color: "rgba(11,95,255,0.02)" },
          ]),
        },
      },
      {
        name: "UV",
        type: "line",
        smooth: true,
        data: trends.value.uvSeries,
        symbolSize: 7,
        lineStyle: { width: 3, color: "#00c8ff" },
        itemStyle: { color: "#00c8ff" },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(0,200,255,0.2)" },
            { offset: 1, color: "rgba(0,200,255,0.02)" },
          ]),
        },
      },
    ],
  });
}

function updateHourChart() {
  if (!hourChart) return;
  hourChart.setOption({
    tooltip: { trigger: "axis" },
    legend: { data: ["PV", "UV"], top: 0, right: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: "category",
      data: trends.value.hours,
      axisLine: { lineStyle: { color: "#d4deee" } },
      axisLabel: { color: "#5a6b85", rotate: 45 },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#eef2f8" } },
      axisLabel: { color: "#93a1b8" },
    },
    series: [
      {
        name: "PV",
        type: "bar",
        data: trends.value.hourPV,
        barWidth: 10,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#0b5fff" },
            { offset: 1, color: "#6ba3ff" },
          ]),
        },
      },
      {
        name: "UV",
        type: "bar",
        data: trends.value.hourUV,
        barWidth: 10,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#00c8ff" },
            { offset: 1, color: "#6be0ff" },
          ]),
        },
      },
    ],
  });
}

function updatePageChart() {
  if (!pageChart) return;
  const data = pages.value.slice(0, 15);
  pageChart.setOption({
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 10, right: 60, top: 20, bottom: 10, containLabel: true },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "#eef2f8" } },
      axisLabel: { color: "#93a1b8" },
    },
    yAxis: {
      type: "category",
      data: data.map((d: any) => (d.page_title || d.page_path).slice(0, 12) + ((d.page_title || d.page_path).length > 12 ? "..." : "")).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#5a6b85" },
    },
    series: [
      {
        name: "PV",
        type: "bar",
        data: data.map((d: any) => d.pv).reverse(),
        barWidth: 16,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: "#0b5fff" },
            { offset: 1, color: "#00c8ff" },
          ]),
        },
        label: { show: true, position: "right", color: "#0b5fff", fontWeight: 700 },
      },
    ],
  });
}

function updateRegionChart() {
  if (!regionChart) return;
  const data = regions.value.slice(0, 10);
  const colors = ["#0b5fff", "#00c8ff", "#36cfc9", "#b37feb", "#ff9c6e", "#ffc069", "#95de64", "#5cdbd3", "#d3adf7", "#ffadd2"];
  regionChart.setOption({
    tooltip: { trigger: "item", formatter: "{b}: {c} PV ({d}%)" },
    legend: { type: "scroll", orient: "vertical", right: 10, top: 20, bottom: 20, textStyle: { color: "#5a6b85" } },
    series: [
      {
        name: "访问区域",
        type: "pie",
        radius: ["40%", "70%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: "#fff", borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: "bold" } },
        data: data.map((d: any, i: number) => ({
          value: d.pv,
          name: d.region || "未知区域",
          itemStyle: { color: colors[i % colors.length] },
        })),
      },
    ],
  });
}

function resizeCharts() {
  trendChart?.resize();
  hourChart?.resize();
  pageChart?.resize();
  regionChart?.resize();
}

async function handleClear() {
  try {
    await ElMessageBox.confirm("确定要清空全部访问日志吗？此操作不可恢复。", "确认清空", {
      type: "warning",
      confirmButtonText: "确定清空",
      cancelButtonText: "取消",
    });
    await api.visits.clear();
    await fetchStats();
    await fetchLogs();
    ElMessage.success("访问日志已清空");
  } catch { }
}

async function handleClearByPreset(days: number) {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  try {
    const preset = clearPresets.find((p) => p.days === days);
    await ElMessageBox.confirm(
      `确定要清理 ${startDate} 至 ${endDate}（${preset?.label}）的访问日志吗？`,
      "确认清理",
      { type: "warning", confirmButtonText: "确定清理", cancelButtonText: "取消" }
    );
    await api.visits.clearByDate({ start_date: startDate, end_date: endDate });
    await fetchStats();
    await fetchLogs();
    ElMessage.success(`已清理${preset?.label}的访问日志`);
  } catch { }
}

async function handleClearByCustom() {
  if (!dateRange.value) {
    ElMessage.warning("请先选择日期范围");
    return;
  }
  try {
    await ElMessageBox.confirm(
      `确定要清理 ${dateRange.value[0]} 至 ${dateRange.value[1]} 的访问日志吗？`,
      "确认清理",
      { type: "warning", confirmButtonText: "确定清理", cancelButtonText: "取消" }
    );
    await api.visits.clearByDate({ start_date: dateRange.value[0], end_date: dateRange.value[1] });
    await fetchStats();
    await fetchLogs();
    ElMessage.success("已清理指定时段的访问日志");
  } catch { }
}

async function handleExportExcel() {
  const params = new URLSearchParams();
  if (customDateMode.value && dateRange.value) {
    params.append("start_date", dateRange.value[0]);
    params.append("end_date", dateRange.value[1]);
  }
  if (query.keyword) params.append("keyword", query.keyword);

  const token = localStorage.getItem("admin_token");
  const url = `/api/admin/visits/export-excel?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: "导出失败" }));
      ElMessage.error(err.message || "导出失败");
      return;
    }
    const blob = await response.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `visit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    ElMessage.success("导出成功");
  } catch {
    ElMessage.error("导出失败，请重试");
  }
}

function handleExportPDF() {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  const now = new Date().toLocaleString("zh-CN");
  const rows = list.value
    .map(
      (r: any) => `
    <tr>
      <td>${r.id}</td>
      <td>${(r.visitor_id || "").slice(0, 12)}</td>
      <td>${r.page_title || r.page_path}</td>
      <td>${r.page_path}</td>
      <td>${r.ip || "-"}</td>
      <td>${r.region || "-"}</td>
      <td>${fmtDate(r.created_at)}</td>
    </tr>`
    )
    .join("");
  printWindow.document.write(`
    <!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>访问统计报告</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; padding: 30px; color: #333; }
      h1 { text-align: center; font-size: 22px; margin-bottom: 8px; color: #0b5fff; }
      .subtitle { text-align: center; color: #888; font-size: 13px; margin-bottom: 20px; }
      .summary { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
      .summary-item { flex: 1; min-width: 120px; background: #f5f7fa; border-radius: 8px; padding: 12px; text-align: center; }
      .summary-item .val { font-size: 24px; font-weight: 700; color: #0b5fff; }
      .summary-item .lbl { font-size: 12px; color: #888; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th { background: #0b5fff; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600; }
      td { padding: 7px 10px; border-bottom: 1px solid #eef2f8; }
      tr:nth-child(even) td { background: #f9fafb; }
      .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #aaa; }
      @media print { body { padding: 20px; } }
    </style></head><body>
    <h1>访问统计报告</h1>
    <div class="subtitle">生成时间：${now}</div>
    <div class="summary">
      <div class="summary-item"><div class="val">${stats.value.totalPV ?? "-"}</div><div class="lbl">总PV</div></div>
      <div class="summary-item"><div class="val">${stats.value.totalUV ?? "-"}</div><div class="lbl">总UV</div></div>
      <div class="summary-item"><div class="val">${stats.value.todayPV ?? "-"}</div><div class="lbl">今日PV</div></div>
      <div class="summary-item"><div class="val">${stats.value.todayUV ?? "-"}</div><div class="lbl">今日UV</div></div>
      <div class="summary-item"><div class="val">${total}</div><div class="lbl">当前记录</div></div>
    </div>
    <table>
      <thead><tr><th>ID</th><th>访客标识</th><th>页面标题</th><th>页面路径</th><th>IP</th><th>区域</th><th>访问时间</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">云南驰耀科技 - 访问统计报告</div>
    </body></html>
  `);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
}

onMounted(async () => {
  await Promise.all([fetchStats(), fetchLogs()]);
  resizeHandler = () => resizeCharts();
  window.addEventListener("resize", resizeHandler);
});

onBeforeUnmount(() => {
  resizeHandler && window.removeEventListener("resize", resizeHandler);
  trendChart?.dispose();
  hourChart?.dispose();
  pageChart?.dispose();
  regionChart?.dispose();
});
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">访问统计</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap">
        <el-button @click="fetchStats(); fetchLogs()">
          <el-icon><Refresh /></el-icon>刷新
        </el-button>
        <el-button type="primary" plain @click="handleExportExcel">
          <el-icon><Download /></el-icon>导出Excel
        </el-button>
        <el-button type="primary" plain @click="handleExportPDF">
          <el-icon><Document /></el-icon>导出PDF
        </el-button>
        <el-popover placement="bottom" :width="280" trigger="click">
          <template #reference>
            <el-button type="danger" plain>
              <el-icon><Delete /></el-icon>清理数据
            </el-button>
          </template>
          <div style="padding: 8px 0">
            <div style="font-weight: 600; margin-bottom: 10px; color: #333">清理指定时段数据</div>
            <div style="display: flex; flex-direction: column; gap: 6px">
              <el-button
                v-for="p in clearPresets"
                :key="p.days"
                size="small"
                @click="handleClearByPreset(p.days)"
              >清理{{ p.label }}</el-button>
              <el-divider style="margin: 6px 0" />
              <div style="font-size: 12px; color: #888; margin-bottom: 4px">自定义时段</div>
              <el-date-picker
                v-model="dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                size="small"
                style="width: 100%"
              />
              <el-button size="small" type="danger" @click="handleClearByCustom" style="margin-top: 4px">
                清理自定义时段
              </el-button>
              <el-divider style="margin: 6px 0" />
              <el-button size="small" type="danger" @click="handleClear" style="width: 100%">
                清空全部数据
              </el-button>
            </div>
          </div>
        </el-popover>
      </div>
    </div>

    <div class="date-filter-bar">
      <div class="days-tabs">
        <span
          v-for="d in [7, 15, 30, 60, 90]"
          :key="d"
          :class="{ active: trendDays === d && !customDateMode }"
          @click="changeDays(d)"
        >近{{ d }}天</span>
      </div>
      <el-divider direction="vertical" style="height: 32px" />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        size="default"
        style="width: 260px"
        @change="applyDateRange"
      />
      <el-button v-if="customDateMode" size="small" @click="resetDateRange">重置</el-button>
    </div>

    <div class="dash-stats">
      <div v-for="c in statCards" :key="c.key" class="stat-card">
        <div class="stat-card__icon" :class="c.cls">{{ c.icon }}</div>
        <div>
          <div class="stat-card__value num">{{ stats[c.key] ?? "--" }}</div>
          <div class="stat-card__label">{{ c.label }}</div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <el-card shadow="never" class="dash-chart">
        <template #header><span>PV/UV 趋势</span></template>
        <div ref="trendRef" style="height: 300px"></div>
      </el-card>
      <el-card shadow="never" class="dash-chart">
        <template #header><span>今日 24 小时分布</span></template>
        <div ref="hourRef" style="height: 300px"></div>
      </el-card>
    </div>

    <div class="dash-grid">
      <el-card shadow="never" class="dash-chart">
        <template #header><span>页面访问分布 TOP 15</span></template>
        <div ref="pageRef" style="height: 300px"></div>
      </el-card>
      <el-card shadow="never" class="dash-chart">
        <template #header><span>访问区域分布</span></template>
        <div ref="regionRef" style="height: 300px"></div>
      </el-card>
    </div>

    <el-card shadow="never" class="filter-card" style="margin-bottom: 16px">
      <div class="filter-bar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索页面路径 / 标题 / 访客ID / IP / 区域"
          clearable
          style="width: 360px"
          @keyup.enter="query.page = 1; fetchLogs()"
        />
        <el-button type="primary" plain @click="query.page = 1; fetchLogs()">查询</el-button>
        <el-button @click="query.keyword = ''; query.page = 1; fetchLogs()">重置</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="visitor_id" label="访客标识" width="180" show-overflow-tooltip />
        <el-table-column prop="page_title" label="访问页面" min-width="140">
          <template #default="{ row }">
            <el-tag size="small" type="primary" effect="plain">{{ row.page_title || row.page_path }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="page_path" label="页面路径" min-width="160" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP 地址" width="140" />
        <el-table-column prop="region" label="访问区域" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.region" size="small" type="success" effect="plain">{{ row.region }}</el-tag>
            <span v-else style="color: #ccc">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="访问时间" width="170">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @change="fetchLogs"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.dash-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  margin-bottom: 18px;
}

.dash-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}

.dash-chart :deep(.el-card__header) {
  font-weight: 700;
}

.date-filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #f8f9fb;
  border-radius: 10px;
  flex-wrap: wrap;
}

.days-tabs {
  display: flex;
  gap: 4px;
  background: #eef0f4;
  border-radius: 8px;
  padding: 3px;
}

.days-tabs span {
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #5a6b85;
  transition: all 0.2s;
}

.days-tabs span.active {
  background: #0b5fff;
  color: #fff;
}

.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.pager {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>