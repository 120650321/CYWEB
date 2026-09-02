<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { api } from "@/api";

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);

const query = reactive({ page: 1, size: 20, keyword: "" });

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: query.page, size: query.size };
    if (query.keyword) params.keyword = query.keyword;
    const res = await api.logs.list(params);
    list.value = res.list;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

function fmtDate(v: string) {
  return v ? v.replace("T", " ").slice(0, 19) : "-";
}

onMounted(fetchList);
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">操作日志</div>
      <el-button @click="fetchList">
        <el-icon><Refresh /></el-icon>刷新
      </el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filter-bar">
        <el-input
          v-model="query.keyword"
          placeholder="搜索操作人 / 操作 / 详情"
          clearable
          style="width: 280px"
          @keyup.enter="query.page = 1; fetchList()"
        />
        <el-button type="primary" plain @click="query.page = 1; fetchList()">查询</el-button>
        <el-button @click="query.keyword = ''; query.page = 1; fetchList()">重置</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="username" label="操作人" width="130">
          <template #default="{ row }">
            <el-tag size="small" effect="light">{{ row.username || "-" }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" min-width="160">
          <template #default="{ row }">
            <el-tag size="small" type="primary" effect="plain">{{ row.action }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="详情" min-width="240" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP" width="140" />
        <el-table-column prop="created_at" label="时间" width="170">
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
          @change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.filter-card {
  margin-bottom: 16px;
}
.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
