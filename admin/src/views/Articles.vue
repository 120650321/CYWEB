<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, http } from "@/api";

const loading = ref(false);
const saving = ref(false);
const uploading = ref(false);
const uploadPercent = ref(0);
const list = ref<any[]>([]);
const total = ref(0);

const query = reactive({
  page: 1,
  size: 10,
  category: "",
  keyword: "",
});

const categoryOptions = [
  { label: "公司动态", value: "company" },
  { label: "行业资讯", value: "news" },
  { label: "技术分享", value: "tech" },
];

const dialogVisible = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const formRef = ref();
const form = reactive<any>({
  title: "",
  category: "company",
  cover: "",
  summary: "",
  author: "驰耀科技",
  tags: [] as string[],
  content: "",
  is_top: 0,
  status: 1,
  publish_time: "",
});

const rules = {
  title: [{ required: true, message: "请输入文章标题", trigger: "blur" }],
  category: [{ required: true, message: "请选择分类", trigger: "change" }],
};

const coverInput = ref<HTMLInputElement>();
const coverInputId = "article-cover-input-" + Math.random().toString(36).slice(2, 8);
const tagInput = ref("");
const editingId = ref<number | null>(null);

async function fetchList() {
  loading.value = true;
  try {
    const params: any = { page: query.page, size: query.size };
    if (query.keyword) params.keyword = query.keyword;
    const res = await api.articles.list(params);
    list.value = res.list;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

function filterByCategory() {
  query.page = 1;
  fetchList();
}

function openCreate() {
  dialogMode.value = "create";
  editingId.value = null;
  Object.assign(form, {
    title: "",
    category: "company",
    cover: "",
    summary: "",
    author: "驰耀科技",
    tags: [],
    content: "",
    is_top: 0,
    status: 1,
    publish_time: "",
  });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  dialogMode.value = "edit";
  editingId.value = row.id;
  Object.assign(form, {
    title: row.title,
    category: row.category,
    cover: row.cover || "",
    summary: row.summary || "",
    author: row.author || "",
    tags: Array.isArray(row.tags) ? [...row.tags] : [],
    content: row.content || "",
    is_top: row.is_top,
    status: row.status,
    publish_time: row.publish_time || "",
  });
  dialogVisible.value = true;
}

function pickCover() {
  const el = coverInput.value || document.getElementById(coverInputId) as HTMLInputElement;
  if (!el) {
    ElMessage.warning("上传组件未就绪");
    return;
  }
  el.value = "";
  el.click();
}

async function onCoverChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  uploading.value = true;
  uploadPercent.value = 0;
  try {
    const res = await http.upload(file, "image", (p) => { uploadPercent.value = p; });
    form.cover = res.url;
    ElMessage.success("封面上传成功");
  } catch {
    ElMessage.error("封面上传失败");
  } finally {
    uploading.value = false;
  }
}

function addTag() {
  const v = tagInput.value.trim();
  if (!v) return;
  if (!form.tags.includes(v)) form.tags.push(v);
  tagInput.value = "";
}

function removeTag(i: number) {
  form.tags.splice(i, 1);
}

async function submit() {
  await formRef.value.validate();
  saving.value = true;
  try {
    const payload = {
      ...form,
      tags: JSON.stringify(form.tags),
      publish_time: form.publish_time || new Date().toISOString().slice(0, 19).replace("T", " "),
    };
    if (dialogMode.value === "create") {
      await api.articles.create(payload);
      ElMessage.success("创建成功");
    } else {
      await api.articles.update(editingId.value, payload);
      ElMessage.success("保存成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function onRemove(row: any) {
  await ElMessageBox.confirm(`确定删除文章「${row.title}」吗？`, "删除确认", {
    type: "warning",
  });
  await api.articles.remove(row.id);
  ElMessage.success("已删除");
  fetchList();
}

async function toggleTop(row: any) {
  await api.articles.update(row.id, { is_top: row.is_top ? 0 : 1 });
  ElMessage.success(row.is_top ? "已取消置顶" : "已置顶");
  fetchList();
}

function toggleStatus(row: any) {
  api.articles.update(row.id, { status: row.status ? 0 : 1 }).then(() => {
    ElMessage.success("状态已更新");
    fetchList();
  });
}

function fmtDate(v: string) {
  return v ? v.replace("T", " ").slice(0, 16) : "-";
}

const filteredList = () => {
  if (!query.category) return list.value;
  return list.value.filter((x) => x.category === query.category);
};

onMounted(fetchList);
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">新闻资讯管理</div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>发布文章
      </el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filter-bar">
        <el-radio-group v-model="query.category" @change="filterByCategory">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</el-radio-button>
        </el-radio-group>
        <el-input
          v-model="query.keyword"
          placeholder="搜索标题 / 作者"
          clearable
          style="width: 240px"
          @keyup.enter="query.page = 1; fetchList()"
        />
        <el-button type="primary" plain @click="query.page = 1; fetchList()">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="filteredList()" stripe>
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="title-cell">
              <el-tag v-if="row.is_top" size="small" type="danger" effect="dark" class="title-cell__top">置顶</el-tag>
              <span>{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.category === 'company' ? 'primary' : row.category === 'news' ? 'success' : 'warning'" effect="plain">
              {{ categoryOptions.find((c) => c.value === row.category)?.label || row.category }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" width="110" />
        <el-table-column prop="views" label="浏览量" width="80" sortable />
        <el-table-column label="发布状态" width="90">
          <template #default="{ row }">
            <el-switch :model-value="!!row.status" @change="toggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="publish_time" label="发布时间" width="150">
          <template #default="{ row }">{{ fmtDate(row.publish_time) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link :type="row.is_top ? 'info' : 'warning'" @click="toggleTop(row)">
              {{ row.is_top ? "取消置顶" : "置顶" }}
            </el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '发布文章' : '编辑文章'" width="820px" top="4vh">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="84px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入文章标题" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="分类" prop="category">
              <el-select v-model="form.category" style="width: 100%">
                <el-option v-for="c in categoryOptions" :key="c.value" :label="c.label" :value="c.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="作者">
              <el-input v-model="form.author" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="发布时间">
              <el-date-picker v-model="form.publish_time" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="封面">
          <div class="cover-box">
            <div v-if="form.cover" class="cover-box__preview">
              <img :src="form.cover" alt="封面" />
              <div class="cover-box__mask">
                <el-button link type="danger" @click="form.cover = ''">移除</el-button>
              </div>
            </div>
            <div v-else class="cover-box__empty" @click="pickCover">
              <el-icon><Picture /></el-icon>
              <span>点击上传封面</span>
            </div>
            <el-progress v-if="uploading" :percentage="uploadPercent" :stroke-width="6" style="margin-top:8px" />
            <input :id="coverInputId" ref="coverInput" type="file" accept="image/*" style="position:fixed;top:-9999px;left:-9999px" @change="onCoverChange" />
          </div>
        </el-form-item>

        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" :rows="2" placeholder="文章摘要（列表页展示）" />
        </el-form-item>

        <el-form-item label="标签">
          <div class="tags-editor">
            <el-tag v-for="(t, i) in form.tags" :key="i" closable @close="removeTag(i)">{{ t }}</el-tag>
            <el-input
              v-model="tagInput"
              size="small"
              placeholder="输入标签后回车"
              class="tags-editor__input"
              @keyup.enter="addTag"
            />
          </div>
        </el-form-item>

        <el-form-item label="正文">
          <el-input v-model="form.content" type="textarea" :rows="10" placeholder="文章正文内容" />
        </el-form-item>

        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="置顶">
              <el-switch v-model="form.is_top" :active-value="1" :inactive-value="0" active-text="是" inactive-text="否" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发布">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="发布" inactive-text="草稿" />
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
  align-items: center;
  flex-wrap: wrap;
}
.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.title-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}
.title-cell__top {
  flex-shrink: 0;
}
.cover-box__preview {
  width: 180px;
  height: 100px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  border: 1px solid var(--border-light);
}
.cover-box__preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-box__mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.cover-box__preview:hover .cover-box__mask {
  opacity: 1;
}
.cover-box__empty {
  width: 180px;
  height: 100px;
  border: 1.5px dashed #c6d0e0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #a0a8b8;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}
.cover-box__empty:hover {
  border-color: var(--brand-500);
  color: var(--brand-500);
}
.tags-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.tags-editor__input {
  width: 160px;
}
</style>