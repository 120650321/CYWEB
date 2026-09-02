<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import * as echarts from "echarts";
import { api } from "@/api";

const stats = ref<any>({});
const trends = ref<{ labels: string[]; views: number[]; messages: number[] }>({
  labels: [],
  views: [],
  messages: [],
});
const topDownloads = ref<any[]>([]);
const latestMessages = ref<any[]>([]);

const trendRef = ref<HTMLElement | null>(null);
const topRef = ref<HTMLElement | null>(null);
let trendChart: echarts.ECharts | null = null;
let topChart: echarts.ECharts | null = null;
let resizeHandler: (() => void) | null = null;

const statCards = ref([
  { key: "userCount", label: "后台用户", icon: "👥", cls: "stat-card__icon--blue" },
  { key: "productCount", label: "产品总数", icon: "📦", cls: "stat-card__icon--cyan" },
  { key: "solutionCount", label: "解决方案", icon: "🧭", cls: "stat-card__icon--purple" },
  { key: "caseCount", label: "项目案例", icon: "🏆", cls: "stat-card__icon--green" },
  { key: "articleCount", label: "资讯文章", icon: "📰", cls: "stat-card__icon--orange" },
  { key: "downloadCount", label: "软件资料", icon: "📥", cls: "stat-card__icon--cyan" },
  { key: "messagePending", label: "待处理留言", icon: "💬", cls: "stat-card__icon--red" },
  { key: "totalDownloads", label: "累计下载量", icon: "📈", cls: "stat-card__icon--green" },
]);

const statusMap: Record<string, { label: string; type: string }> = {
  pending: { label: "待处理", type: "warning" },
  processing: { label: "处理中", type: "primary" },
  done: { label: "已完成", type: "success" },
};

function initCharts() {
  if (trendRef.value && !trendChart) {
    trendChart = echarts.init(trendRef.value);
    trendChart.setOption({
      tooltip: { trigger: "axis" },
      legend: { data: ["浏览量", "留言量"], top: 0, right: 0 },
      grid: { left: 40, right: 20, top: 40, bottom: 30 },
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
          name: "浏览量",
          type: "line",
          smooth: true,
          data: trends.value.views,
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
          name: "留言量",
          type: "line",
          smooth: true,
          data: trends.value.messages,
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

  if (topRef.value && !topChart) {
    topChart = echarts.init(topRef.value);
    topChart.setOption({
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 10, right: 40, top: 20, bottom: 10, containLabel: true },
      xAxis: {
        type: "value",
        splitLine: { lineStyle: { color: "#eef2f8" } },
        axisLabel: { color: "#93a1b8" },
      },
      yAxis: {
        type: "category",
        data: topDownloads.value.map((d) => d.name.slice(0, 12) + (d.name.length > 12 ? "..." : "")).reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "#5a6b85" },
      },
      series: [
        {
          type: "bar",
          data: topDownloads.value.map((d) => d.download_count).reverse(),
          barWidth: 18,
          itemStyle: {
            borderRadius: [0, 9, 9, 0],
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
}

function resizeCharts() {
  trendChart?.resize();
  topChart?.resize();
}

onMounted(async () => {
  const [s, t, td, lm] = await Promise.all([
    api.dashboard.stats(),
    api.dashboard.trends(),
    api.dashboard.topDownloads(),
    api.dashboard.latestMessages(),
  ]);
  stats.value = s;
  trends.value = t;
  topDownloads.value = td;
  latestMessages.value = lm;

  setTimeout(() => {
    initCharts();
    resizeHandler = () => resizeCharts();
    window.addEventListener("resize", resizeHandler);
  }, 100);
});

onBeforeUnmount(() => {
  resizeHandler && window.removeEventListener("resize", resizeHandler);
  trendChart?.dispose();
  topChart?.dispose();
});
</script>

<template>
  <div>
    <div class="dash-hello">
      <div>
        <h2>欢迎回来 👋</h2>
        <p>这里是驰耀科技官网后台管理仪表盘，实时掌握站点运营数据。</p>
      </div>
      <router-link to="/settings" class="dash-hello__link">站点设置 →</router-link>
    </div>

    <div class="dash-stats">
      <div v-for="(c, i) in statCards" :key="c.key" class="stat-card">
        <div class="stat-card__icon" :class="c.cls">{{ c.icon }}</div>
        <div>
          <div class="stat-card__value num">{{ stats[c.key] ?? "--" }}</div>
          <div class="stat-card__label">{{ c.label }}</div>
        </div>
      </div>
    </div>

    <div class="dash-grid">
      <el-card shadow="never" class="dash-chart">
        <template #header>
          <span>近 7 天访问趋势</span>
        </template>
        <div ref="trendRef" style="height: 320px"></div>
      </el-card>

      <el-card shadow="never" class="dash-chart">
        <template #header>
          <span>下载量 TOP 5</span>
        </template>
        <div ref="topRef" style="height: 320px"></div>
      </el-card>
    </div>

    <el-card shadow="never">
      <template #header>
        <span>最新留言</span>
        <el-button text type="primary" @click="$router.push('/messages')">查看全部 →</el-button>
      </template>
      <el-table :data="latestMessages" style="width: 100%">
        <el-table-column prop="name" label="姓名" width="120" />
        <el-table-column prop="phone" label="联系电话" width="150" />
        <el-table-column prop="subject" label="主题" min-width="160" />
        <el-table-column prop="created_at" label="提交时间" width="170" />
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="(statusMap[row.status]?.type as any) || 'info'" size="small">
              {{ statusMap[row.status]?.label || row.status }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.dash-hello {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #0a1633, #123064);
  border-radius: 16px;
  padding: 28px 32px;
  color: #fff;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;
}

.dash-hello::before {
  content: "";
  position: absolute;
  top: -50%;
  right: -10%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(0,200,255,0.12), transparent 60%);
  pointer-events: none;
}

.dash-hello::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cyan-500), transparent);
}

.dash-hello h2 {
  font-size: 22px;
  margin-bottom: 6px;
  font-weight: 800;
  position: relative;
  z-index: 1;
}

.dash-hello p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
  position: relative;
  z-index: 1;
}

.dash-hello__link {
  flex-shrink: 0;
  color: var(--cyan-500);
  font-size: 14px;
  font-weight: 600;
  padding: 10px 20px;
  border: 1px solid rgba(0, 200, 255, 0.4);
  border-radius: 10px;
  transition: all 0.2s;
  position: relative;
  z-index: 1;
}

.dash-hello__link:hover {
  background: rgba(0, 200, 255, 0.15);
  border-color: rgba(0, 200, 255, 0.6);
  box-shadow: 0 0 20px rgba(0,200,255,0.15);
  transform: translateY(-1px);
}

.dash-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.dash-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.dash-chart {
  border-radius: 14px;
  border: 1px solid var(--border-light);
  transition: box-shadow 0.3s;
}

.dash-chart:hover {
  box-shadow: var(--shadow-md);
}

.dash-chart :deep(.el-card__header) {
  font-weight: 700;
  font-size: 15px;
  border-bottom: 1px solid var(--border-light);
}

@media (max-width: 1200px) {
  .dash-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .dash-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .dash-stats {
    grid-template-columns: 1fr;
  }
}
</style>