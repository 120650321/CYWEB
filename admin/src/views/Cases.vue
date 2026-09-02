<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { UploadRequestOptions } from "element-plus";
import { api, http } from "@/api";

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const categories = ref<any[]>([]);
const query = reactive({ page: 1, size: 10, keyword: "", category: "" as any });

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  category_id: null as any,
  name: "",
  cover: "",
  intro: "",
  detail: "",
  tags: [] as string[],
  results: [] as [string, string][],
  status: 1,
  sort: 0,
});

async function load() {
  loading.value = true;
  try {
    const data = await api.cases.list(query);
    list.value = data.list;
    total.value = data.pagination.total;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    category_id: categories.value[0]?.id ?? null,
    name: "",
    cover: "",
    intro: "",
    detail: "",
    tags: [],
    results: [],
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
    category_id: row.category_id,
    name: row.name,
    cover: row.cover || "",
    intro: row.intro || "",
    detail: row.detail || "",
    tags: (row.tags || []).length ? row.tags : [],
    results: (row.results || []).length ? row.results : [],
    status: row.status,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

async function save() {
  if (!form.name.trim()) return ElMessage.warning("请填写案例名称");
  if (!form.category_id) return ElMessage.warning("请选择案例分类");
  saving.value = true;
  try {
    if (editingId.value) {
      await api.cases.update(editingId.value, form);
      ElMessage.success("更新成功");
    } else {
      await api.cases.create(form);
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
  await ElMessageBox.confirm(`确定删除案例「${row.name}」吗？`, "删除确认", { type: "warning" });
  await api.cases.remove(row.id);
  ElMessage.success("删除成功");
  load();
}

async function toggleStatus(row: any) {
  const status = row.status === 1 ? 0 : 1;
  await api.cases.status(row.id, status);
  row.status = status;
  ElMessage.success(status === 1 ? "已展示" : "已隐藏");
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

function addResult() {
  form.results.push(["", ""]);
}
function removeResult(i: number) {
  form.results.splice(i, 1);
}

function search() {
  query.page = 1;
  load();
}

onMounted(async () => {
  categories.value = await api.caseCategories.all();
  await load();
});
</script>

<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="page-title">案例管理</span>
      <div class="toolbar-right">
        <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 140px" @change="search">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-input v-model="query.keyword" class="search-input" placeholder="搜索案例名称" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
        <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>新增案例</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list">
        <el-table-column prop="name" label="案例名称" min-width="240" show-overflow-tooltip />
        <el-table-column prop="category_name" label="分类" width="120" />
        <el-table-column label="标签" width="180">
          <template #default="{ row }">
            <el-tag v-for="t in (row.tags || []).slice(0, 2)" :key="t" size="small" style="margin-right: 6px">{{ t }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" style="cursor: pointer" @click="toggleStatus(row)">
              {{ row.status === 1 ? "展示" : "隐藏" }}
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

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑案例' : '新增案例'" width="720px" top="4vh">
      <el-form :model="form" label-width="90px">
        <el-form-item label="案例分类" required>
          <el-select v-model="form.category_id" style="width: 240px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="案例名称" required>
          <el-input v-model="form.name" maxlength="80" />
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
        <el-form-item label="案例简介">
          <el-input v-model="form.intro" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="案例详情">
          <el-input v-model="form.detail" type="textarea" :rows="5" />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple filterable allow-create default-first-option placeholder="输入后回车创建标签" style="width: 100%">
            <el-option v-for="t in form.tags" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目成果">
          <div class="res">
            <div v-for="(r, i) in form.results" :key="i" class="res-row">
              <el-input v-model="r[0]" placeholder="数值，如：600+" style="width: 140px" />
              <el-input v-model="r[1]" placeholder="说明，如：高清监控点位" style="width: 240px" />
              <el-button link type="danger" @click="removeResult(i)"><el-icon><Delete /></el-icon></el-button>
            </div>
            <el-button type="primary" plain size="small" @click="addResult"><el-icon><Plus /></el-icon>添加成果</el-button>
          </div>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="展示" inactive-text="隐藏" />
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

.res {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.res-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>