<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const counts = reactive({ total: 0, pending: 0, processing: 0, done: 0 });

const query = reactive({
  page: 1,
  size: 10,
  status: "",
  keyword: "",
});

const statusMap: Record<string, { label: string; type: "warning" | "primary" | "success" | "info" }> = {
  pending: { label: "待处理", type: "warning" },
  processing: { label: "处理中", type: "primary" },
  done: { label: "已完成", type: "success" },
};

const replyVisible = ref(false);
const replyForm = reactive({ id: null as number | null, reply: "" });
const current = ref<any>(null);

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: query.page, size: query.size };
    if (query.status) params.status = query.status;
    if (query.keyword) params.keyword = query.keyword;
    const res = await api.messages.list(params);
    list.value = res.list;
    total.value = res.pagination.total;
    fetchCounts();
  } finally {
    loading.value = false;
  }
}

async function fetchCounts() {
  try {
    const res = await api.messages.list({ page: 1, size: 1 });
    counts.total = res.pagination.total;
    for (const s of ["pending", "processing", "done"] as const) {
      const r = await api.messages.list({ page: 1, size: 1, status: s });
      counts[s] = r.pagination.total;
    }
  } catch {
    /* ignore */
  }
}

async function changeStatus(row: any) {
  await api.messages.status(row.id, row.status);
  ElMessage.success("状态已更新");
  fetchList();
}

function openReply(row: any) {
  current.value = row;
  replyForm.id = row.id;
  replyForm.reply = row.reply || "";
  replyVisible.value = true;
}

async function submitReply() {
  if (!replyForm.reply.trim()) {
    ElMessage.warning("请输入回复内容");
    return;
  }
  await api.messages.reply(replyForm.id, replyForm.reply);
  if (current.value?.status === "pending") {
    await api.messages.status(replyForm.id, "processing");
  }
  ElMessage.success("回复成功");
  replyVisible.value = false;
  fetchList();
}

async function onRemove(row: any) {
  await ElMessageBox.confirm("确定删除该留言吗？删除后不可恢复。", "删除确认", {
    type: "warning",
  });
  await api.messages.remove(row.id);
  ElMessage.success("已删除");
  fetchList();
}

function fmtDate(v: string) {
  return v ? v.replace("T", " ").slice(0, 19) : "-";
}

function setStatusTab(s: string) {
  query.status = s;
  query.page = 1;
  fetchList();
}

onMounted(fetchList);
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">留言管理</div>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="stat-tabs">
        <div class="stat-tab" :class="{ 'stat-tab--active': !query.status }" @click="setStatusTab('')">
          <span class="stat-tab__num">{{ counts.total }}</span>
          <span class="stat-tab__label">全部留言</span>
        </div>
        <div class="stat-tab" :class="{ 'stat-tab--active': query.status === 'pending' }" @click="setStatusTab('pending')">
          <span class="stat-tab__num stat-tab__num--warn">{{ counts.pending }}</span>
          <span class="stat-tab__label">待处理</span>
        </div>
        <div class="stat-tab" :class="{ 'stat-tab--active': query.status === 'processing' }" @click="setStatusTab('processing')">
          <span class="stat-tab__num stat-tab__num--primary">{{ counts.processing }}</span>
          <span class="stat-tab__label">处理中</span>
        </div>
        <div class="stat-tab" :class="{ 'stat-tab--active': query.status === 'done' }" @click="setStatusTab('done')">
          <span class="stat-tab__num stat-tab__num--success">{{ counts.done }}</span>
          <span class="stat-tab__label">已完成</span>
        </div>
      </div>
      <div class="filter-bar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索姓名 / 电话 / 邮箱 / 主题"
          clearable
          style="width: 280px"
          @keyup.enter="query.page = 1; fetchList()"
        />
        <el-button type="primary" plain @click="query.page = 1; fetchList()">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="name" label="姓名" width="100">
          <template #default="{ row }">
            <div class="msg-user">
              <el-avatar :size="30" class="msg-user__avatar">{{ row.name?.slice(0, 1) }}</el-avatar>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话" width="130" />
        <el-table-column prop="email" label="邮箱" width="170" show-overflow-tooltip />
        <el-table-column prop="subject" label="主题" min-width="140" show-overflow-tooltip />
        <el-table-column label="内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.content }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-select :model-value="row.status" size="small" style="width: 96px" @change="(v: any) => { row.status = v; changeStatus(row); }">
              <el-option v-for="(v, k) in statusMap" :key="k" :label="v.label" :value="k" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openReply(row)">回复</el-button>
            <el-button link type="danger" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.size"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="fetchList"
        />
      </div>
    </el-card>

    <!-- 回复弹窗 -->
    <el-dialog v-model="replyVisible" title="回复留言" width="640px">
      <div v-if="current" class="reply-msg">
        <div class="reply-msg__head">
          <span class="reply-msg__name">{{ current.name }}</span>
          <span class="reply-msg__time">{{ fmtDate(current.created_at) }}</span>
        </div>
        <div class="reply-msg__subject">{{ current.subject }}</div>
        <div class="reply-msg__content">{{ current.content }}</div>
        <div v-if="current.reply" class="reply-msg__prev">
          <div class="reply-msg__prev-label">历史回复：</div>
          {{ current.reply }}
        </div>
      </div>
      <el-input
        v-model="replyForm.reply"
        type="textarea"
        :rows="5"
        placeholder="请输入回复内容，保存后客户可在前台留言详情查看"
      />
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReply">保存回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}
.stat-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.stat-tab {
  flex: 1;
  min-width: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fff;
}
.stat-tab:hover {
  border-color: var(--brand-300);
}
.stat-tab--active {
  border-color: var(--brand-500);
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.06), rgba(0, 200, 255, 0.08));
  box-shadow: 0 4px 14px rgba(11, 95, 255, 0.12);
}
.stat-tab__num {
  font-size: 24px;
  font-weight: 800;
  color: var(--text-primary);
}
.stat-tab__num--warn {
  color: #e6a23c;
}
.stat-tab__num--primary {
  color: var(--brand-500);
}
.stat-tab__num--success {
  color: #67c23a;
}
.stat-tab__label {
  font-size: 12px;
  color: var(--text-secondary);
}
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.msg-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.msg-user__avatar {
  background: linear-gradient(135deg, var(--brand-500), var(--cyan-500));
  font-size: 13px;
  color: #fff;
  flex-shrink: 0;
}
.reply-msg {
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
  background: var(--bg-light);
}
.reply-msg__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.reply-msg__name {
  font-weight: 700;
}
.reply-msg__time {
  font-size: 12px;
  color: var(--text-secondary);
}
.reply-msg__subject {
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-600);
  margin-bottom: 6px;
}
.reply-msg__content {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-primary);
}
.reply-msg__prev {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border-light);
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
}
.reply-msg__prev-label {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
</style>
