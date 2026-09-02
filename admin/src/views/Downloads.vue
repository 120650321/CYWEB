<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, http } from "@/api";

interface FileItem {
  name: string;
  format: string;
  size: string;
  url: string;
}

const loading = ref(false);
const saving = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const categories = ref<any[]>([]);
const uploading = ref(false);
const uploadPercent = ref(0);

const query = reactive({
  page: 1,
  size: 10,
  category: "",
  keyword: "",
});

const dialogVisible = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const formRef = ref();
const form = reactive<any>({
  name: "",
  category_id: null,
  version: "",
  icon: "",
  intro: "",
  detail: "",
  files: [] as FileItem[],
  update_log: "",
  system_require: "",
  status: 1,
  sort: 0,
});

const rules = {
  name: [{ required: true, message: "请输入资料名称", trigger: "blur" }],
  category_id: [{ required: true, message: "请选择资料分类", trigger: "change" }],
};

const fileInput = ref<HTMLInputElement>();
const fileInputId = "download-file-input-" + Math.random().toString(36).slice(2, 8);

const fileAccept = ".pdf,.zip,.rar,.7z,.exe,.img,.iso,.doc,.docx,.xls,.xlsx,.txt,.tar,.gz,.apk,.bin,.fw";

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: query.page, size: query.size };
    if (query.category) params.category = query.category;
    if (query.keyword) params.keyword = query.keyword;
    const res = await api.downloads.list(params);
    list.value = res.list;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

async function fetchCategories() {
  const res = await api.downloadCategories.all();
  categories.value = res;
}

function openCreate() {
  dialogMode.value = "create";
  Object.assign(form, {
    name: "",
    category_id: null,
    version: "",
    icon: "",
    intro: "",
    detail: "",
    files: [],
    update_log: "",
    system_require: "",
    status: 1,
    sort: 0,
  });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  dialogMode.value = "edit";
  const files = Array.isArray(row.files) ? row.files.map((f: any) => ({ ...f })) : [];
  Object.assign(form, {
    name: row.name,
    category_id: row.category_id,
    version: row.version,
    icon: row.icon || "",
    intro: row.intro || "",
    detail: row.detail || "",
    files,
    update_log: row.update_log || "",
    system_require: row.system_require || "",
    status: row.status,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

function pickFile() {
  const el = fileInput.value || document.getElementById(fileInputId) as HTMLInputElement;
  if (!el) {
    console.error("[文件上传] 文件输入元素未就绪");
    ElMessage.warning("文件上传组件未就绪，请关闭弹窗后重试");
    return;
  }
  el.value = "";
  el.click();
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  uploading.value = true;
  uploadPercent.value = 0;
  try {
    const res = await http.upload(file, "file", (p) => { uploadPercent.value = p; });
    const url = res.url;
    const sizeText =
      file.size >= 1024 * 1024
        ? (file.size / 1024 / 1024).toFixed(2) + " MB"
        : Math.max(1, Math.round(file.size / 1024)) + " KB";
    const format = (file.name.split(".").pop() || "file").toUpperCase();
    form.files.push({ name: file.name, format, size: sizeText, url });
    ElMessage.success("文件上传成功");
  } catch (e: any) {
    console.error("[文件上传失败]", e);
    ElMessage.error(e?.message || "文件上传失败，请重试");
  } finally {
    uploading.value = false;
  }
}

function removeFile(index: number) {
  form.files.splice(index, 1);
}

const editingId = ref<number | null>(null);

function onEdit(row: any) {
  editingId.value = row.id;
  openEdit(row);
}

async function submit() {
  await formRef.value.validate();
  saving.value = true;
  try {
    const payload = { ...form };
    if (dialogMode.value === "create") {
      await api.downloads.create(payload);
      ElMessage.success("创建成功");
    } else {
      await api.downloads.update(editingId.value, payload);
      ElMessage.success("保存成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function onRemove(row: any) {
  await ElMessageBox.confirm(`确定删除资料「${row.name}」吗？`, "删除确认", {
    type: "warning",
  });
  await api.downloads.remove(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function resetCount(row: any) {
  await ElMessageBox.confirm(`确定重置「${row.name}」的下载量为 0 吗？`, "重置确认", {
    type: "warning",
  });
  await api.downloads.resetCount(row.id);
  ElMessage.success("已重置下载量");
  fetchList();
}

function toggleStatus(row: any) {
  api.downloads.update(row.id, { status: row.status ? 0 : 1 }).then(() => {
    ElMessage.success("状态已更新");
    fetchList();
  });
}

function formatSize(row: any) {
  if (row.size) return row.size;
  const files: any[] = Array.isArray(row.files) ? row.files : [];
  return files.length ? files.map((f) => f.size).join(" / ") : "-";
}

function fmtDate(v: string) {
  return v ? v.replace("T", " ").slice(0, 19) : "-";
}

onMounted(() => {
  fetchCategories();
  fetchList();
});
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">软件资料管理</div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>新增资料
      </el-button>
    </div>

    <!-- 筛选 -->
    <el-card shadow="never" class="filter-card">
      <div class="filter-bar">
        <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 180px" @change="query.page = 1; fetchList()">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-input
          v-model="query.keyword"
          placeholder="搜索资料名称 / 版本号"
          clearable
          style="width: 240px"
          @keyup.enter="query.page = 1; fetchList()"
        />
        <el-button type="primary" plain @click="query.page = 1; fetchList()">查询</el-button>
        <el-button @click="query.keyword = ''; query.category = ''; query.page = 1; fetchList()">重置</el-button>
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column prop="name" label="资料名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="name-cell">
              <span class="name-cell__icon">{{ (row.icon || "FILE").slice(0, 4).toUpperCase() }}</span>
              <div>
                <div class="name-cell__title">{{ row.name }}</div>
                <div class="name-cell__sub">v{{ row.version || "-" }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="110">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.category_name || "-" }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="文件" width="120">
          <template #default="{ row }">
            <div v-if="Array.isArray(row.files) && row.files.length" class="file-list">
              <el-tag v-for="(f, i) in row.files" :key="i" size="small" type="info" effect="light">{{ f.format }}</el-tag>
            </div>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="大小" width="110">
          <template #default="{ row }">{{ formatSize(row) }}</template>
        </el-table-column>
        <el-table-column prop="download_count" label="下载量" width="90" sortable />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch :model-value="!!row.status" @change="toggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.updated_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="onEdit(row)">编辑</el-button>
            <el-button link type="warning" @click="resetCount(row)">重置下载量</el-button>
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

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增资料' : '编辑资料'" width="760px" top="6vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="资料名称" prop="name">
              <el-input v-model="form.name" placeholder="如：驰耀智慧园区管理平台" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="分类" prop="category_id">
              <el-select v-model="form.category_id" placeholder="选择分类" style="width: 100%">
                <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="版本号">
              <el-input v-model="form.version" placeholder="如：V2.3.1" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="图标文字">
              <el-input v-model="form.icon" maxlength="6" placeholder="如：PDF / EXE" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="简介">
          <el-input v-model="form.intro" type="textarea" :rows="2" placeholder="一句话介绍资料内容" />
        </el-form-item>

        <el-form-item label="资料文件">
          <div class="file-editor">
            <div v-for="(f, i) in form.files" :key="i" class="file-editor__item">
              <el-icon class="file-editor__icon"><Document /></el-icon>
              <div class="file-editor__meta">
                <span class="file-editor__name">{{ f.name }}</span>
                <span class="file-editor__size">{{ f.size }} · {{ f.format }}</span>
              </div>
              <el-button link type="danger" @click="removeFile(i)">移除</el-button>
            </div>
            <div v-if="!form.files.length" class="file-editor__empty">暂无文件，请上传资料文件</div>
            <el-button type="primary" plain :loading="uploading" @click="pickFile">
              <el-icon><Upload /></el-icon>{{ uploading ? "上传中..." : "上传文件" }}
            </el-button>
            <el-progress v-if="uploading" :percentage="uploadPercent" :stroke-width="6" style="margin-top:8px" />
            <input :id="fileInputId" ref="fileInput" type="file" :accept="fileAccept" style="position:fixed;top:-9999px;left:-9999px" @change="onFileChange" />
          </div>
        </el-form-item>

        <el-form-item label="更新日志">
          <el-input v-model="form.update_log" type="textarea" :rows="3" placeholder="本版本更新内容，每行一条，如：&#10;1. 优化数据看板加载速度&#10;2. 修复消息推送延迟问题" />
        </el-form-item>

        <el-form-item label="系统要求">
          <el-input v-model="form.system_require" type="textarea" :rows="2" placeholder="如：Windows 10 及以上 / Chrome 86+，8GB 内存" />
        </el-form-item>

        <el-form-item label="详细介绍">
          <el-input v-model="form.detail" type="textarea" :rows="4" placeholder="资料详细介绍" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="上架" inactive-text="下架" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="排序">
              <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
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
.name-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.name-cell__icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0b5fff, #00c8ff);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.name-cell__title {
  font-weight: 600;
  line-height: 1.3;
}
.name-cell__sub {
  font-size: 12px;
  color: var(--text-secondary);
}
.file-list {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.text-muted {
  color: #a0a8b8;
}
.file-editor__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--bg-light);
}
.file-editor__icon {
  color: var(--brand-500);
  font-size: 20px;
}
.file-editor__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.file-editor__name {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.file-editor__size {
  font-size: 12px;
  color: var(--text-secondary);
}
.file-editor__empty {
  font-size: 13px;
  color: #a0a8b8;
  margin-bottom: 10px;
}
</style>