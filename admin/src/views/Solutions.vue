<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { UploadRequestOptions } from "element-plus";
import { api, http } from "@/api";

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const query = reactive({ page: 1, size: 10, keyword: "" });

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  name: "",
  industry: "",
  cover: "",
  intro: "",
  detail: "",
  scenario: "",
  architecture: "",
  value_points: [] as string[],
  status: 1,
  sort: 0,
});

async function load() {
  loading.value = true;
  try {
    const data = await api.solutions.list(query);
    list.value = data.list;
    total.value = data.pagination.total;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    name: "",
    industry: "",
    cover: "",
    intro: "",
    detail: "",
    scenario: "",
    architecture: "",
    value_points: [],
    status: 1,
    sort: 0,
  });
  editingId.value = null;
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    industry: row.industry || "",
    cover: row.cover || "",
    intro: row.intro || "",
    detail: row.detail || "",
    scenario: row.scenario || "",
    architecture: row.architecture || "",
    value_points: (row.value_points || []).length ? row.value_points : [],
    status: row.status,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

async function save() {
  if (!form.name.trim()) return ElMessage.warning("请填写方案名称");
  saving.value = true;
  try {
    if (editingId.value) {
      await api.solutions.update(editingId.value, form);
      ElMessage.success("更新成功");
    } else {
      await api.solutions.create(form);
      ElMessage.success("新增成功");
    }
    dialogVisible.value = false;
    load();
  } catch (e: any) {
    ElMessage.error(e.message);
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除方案「${row.name}」吗？`, "删除确认", { type: "warning" });
  await api.solutions.remove(row.id);
  ElMessage.success("删除成功");
  load();
}

async function toggleStatus(row: any) {
  const status = row.status === 1 ? 0 : 1;
  await api.solutions.status(row.id, status);
  row.status = status;
  ElMessage.success(status === 1 ? "已启用" : "已停用");
}

async function onUpload(options: UploadRequestOptions) {
  try {
    const data = await http.upload(options.file as File, "image", (percent) => {
      options.onProgress({ percent });
    });
    form.cover = data.url;
    ElMessage.success("上传成功");
  } catch (e: any) {
    ElMessage.error(e.message || "上传失败");
  }
}

function search() {
  query.page = 1;
  load();
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="page-title">解决方案</span>
      <div class="toolbar-right">
        <el-input v-model="query.keyword" class="search-input" placeholder="搜索方案名称 / 行业" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>新增方案
        </el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list">
        <el-table-column prop="name" label="方案名称" min-width="220" />
        <el-table-column prop="industry" label="所属行业" width="120" />
        <el-table-column prop="intro" label="简介" min-width="220" show-overflow-tooltip />
        <el-table-column label="价值点" width="90" align="center">
          <template #default="{ row }">{{ (row.value_points || []).length }} 项</template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" style="cursor: pointer" @click="toggleStatus(row)">
              {{ row.status === 1 ? "启用" : "停用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination v-model:current-page="query.page" :page-size="query.size" :total="total" layout="total, prev, pager, next" @current-change="load" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑方案' : '新增方案'" width="720px" top="4vh">
      <el-form :model="form" label-width="90px">
        <el-form-item label="方案名称" required>
          <el-input v-model="form.name" placeholder="如：智慧园区解决方案" maxlength="60" />
        </el-form-item>
        <el-form-item label="所属行业">
          <el-input v-model="form.industry" placeholder="如：智慧园区" maxlength="30" />
        </el-form-item>
        <el-form-item label="封面图">
          <el-upload :show-file-list="false" :http-request="onUpload" accept="image/*" action="#">
            <div v-if="form.cover" class="img-upload">
              <img :src="form.cover" alt="" />
              <span class="img-upload__overlay">更换</span>
            </div>
            <el-button v-else>上传封面</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="方案简介">
          <el-input v-model="form.intro" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="方案详情">
          <el-input v-model="form.detail" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="适用场景">
          <el-input v-model="form.scenario" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="方案架构">
          <el-input v-model="form.architecture" placeholder="各层用 → 分隔，如：感知层 → 网络层 → 平台层 → 应用层" />
        </el-form-item>
        <el-form-item label="方案价值">
          <div class="vals">
            <div v-for="(v, i) in form.value_points" :key="i" class="val-row">
              <el-input v-model="form.value_points[i]" placeholder="如：安防事件响应时间缩短 60%" />
              <el-button link type="danger" @click="form.value_points.splice(i, 1)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" plain size="small" @click="form.value_points.push('')">
              <el-icon><Plus /></el-icon>添加价值点
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.img-upload {
  position: relative;
  width: 200px;
  height: 130px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--border-light);
}

.img-upload img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-upload__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.2s;
}

.img-upload:hover .img-upload__overlay {
  opacity: 1;
}

.vals {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.val-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>