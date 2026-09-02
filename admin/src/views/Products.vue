<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import type { UploadRequestOptions } from "element-plus";
import { api, http } from "@/api";

const loading = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const categories = ref<any[]>([]);
const query = reactive({ page: 1, size: 10, keyword: "", category: "" as any, status: "" as any });

const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({
  category_id: null as any,
  name: "",
  model: "",
  cover: "",
  images: [] as string[],
  intro: "",
  detail: "",
  params: [] as [string, string][],
  status: 1,
  sort: 0,
});

async function load() {
  loading.value = true;
  try {
    const data = await api.products.list(query);
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
    model: "",
    cover: "",
    images: [],
    intro: "",
    detail: "",
    params: [],
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
    model: row.model || "",
    cover: row.cover || "",
    images: row.images || [],
    intro: row.intro || "",
    detail: row.detail || "",
    params: (row.params || []).length ? row.params : [],
    status: row.status,
    sort: row.sort,
  });
  dialogVisible.value = true;
}

async function save() {
  if (!form.name.trim()) return ElMessage.warning("请填写产品名称");
  if (!form.category_id) return ElMessage.warning("请选择产品分类");
  saving.value = true;
  try {
    if (editingId.value) {
      await api.products.update(editingId.value, form);
      ElMessage.success("更新成功");
    } else {
      await api.products.create(form);
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
  await ElMessageBox.confirm(`确定删除产品「${row.name}」吗？`, "删除确认", { type: "warning" });
  await api.products.remove(row.id);
  ElMessage.success("删除成功");
  load();
}

async function toggleStatus(row: any) {
  const status = row.status === 1 ? 0 : 1;
  await api.products.status(row.id, status);
  row.status = status;
  ElMessage.success(status === 1 ? "已上架" : "已下架");
}

async function onUpload(options: UploadRequestOptions, key: "cover" | "images") {
  try {
    const data = await http.upload(options.file as File, "image", (percent) => {
      options.onProgress({ percent });
    });
    if (key === "cover") form.cover = data.url;
    else form.images.push(data.url);
    ElMessage.success("上传成功");
  } catch (e: any) {
    ElMessage.error(e.message || "上传失败");
  }
}

function removeImage(index: number) {
  form.images.splice(index, 1);
}

function setAsCover(imgUrl: string) {
  form.cover = imgUrl;
  ElMessage.success("已设为封面");
}

function addParam() {
  form.params.push(["", ""]);
}

function removeParam(i: number) {
  form.params.splice(i, 1);
}

function search() {
  query.page = 1;
  load();
}

onMounted(async () => {
  categories.value = await api.productCategories.all();
  await load();
});
</script>

<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="page-title">产品管理</span>
      <div class="toolbar-right">
        <el-select v-model="query.category" placeholder="全部分类" clearable style="width: 150px" @change="search">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-select v-model="query.status" placeholder="全部状态" clearable style="width: 120px" @change="search">
          <el-option label="上架" :value="1" />
          <el-option label="下架" :value="0" />
        </el-select>
        <el-input v-model="query.keyword" class="search-input" placeholder="搜索名称 / 型号" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>新增产品
        </el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list">
        <el-table-column label="产品" min-width="260">
          <template #default="{ row }">
            <div class="prod-cell">
              <div class="prod-cell__cover">{{ (row.cover ? "" : "◆") }}</div>
              <div>
                <div class="prod-cell__name">{{ row.name }}</div>
                <div class="prod-cell__model num">{{ row.model || "--" }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category_name" label="分类" width="130" />
        <el-table-column prop="intro" label="简介" min-width="200" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="70" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small" style="cursor: pointer" @click="toggleStatus(row)">
              {{ row.status === 1 ? "上架" : "下架" }}
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
        <el-pagination
          v-model:current-page="query.page"
          :page-size="query.size"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="load"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑产品' : '新增产品'" width="720px" top="4vh">
      <el-form :model="form" label-width="90px">
        <el-form-item label="产品分类" required>
          <el-select v-model="form.category_id" placeholder="请选择分类" style="width: 240px">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="产品名称" required>
          <el-input v-model="form.name" placeholder="请输入产品名称" maxlength="60" />
        </el-form-item>
        <el-form-item label="产品型号">
          <el-input v-model="form.model" placeholder="如：CY-IoT V3.0" maxlength="40" />
        </el-form-item>
        <el-form-item label="产品封面">
          <el-upload :show-file-list="false" :http-request="(o) => onUpload(o, 'cover')" accept="image/*" action="#">
            <div v-if="form.cover" class="img-upload">
              <img :src="form.cover" alt="" />
              <span class="img-upload__overlay">更换</span>
            </div>
            <el-button v-else>上传封面</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="产品图片">
          <div class="images-editor">
            <div v-for="(img, i) in form.images" :key="i" class="img-item">
              <img :src="img" alt="" />
              <div class="img-item__actions">
                <el-button link type="primary" size="small" @click="setAsCover(img)">设封面</el-button>
                <el-button link type="danger" size="small" @click="removeImage(i)">删除</el-button>
              </div>
            </div>
            <div class="img-item img-item--add">
              <el-upload :show-file-list="false" :http-request="(o) => onUpload(o, 'images')" accept="image/*" action="#">
                <el-icon :size="28"><Plus /></el-icon>
                <span>上传</span>
              </el-upload>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="产品简介">
          <el-input v-model="form.intro" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="一句话介绍产品亮点" />
        </el-form-item>
        <el-form-item label="产品详情">
          <el-input v-model="form.detail" type="textarea" :rows="5" placeholder="请输入产品详细介绍" />
        </el-form-item>
        <el-form-item label="产品参数">
          <div class="params-editor">
            <div v-for="(p, i) in form.params" :key="i" class="param-row">
              <el-input v-model="p[0]" placeholder="参数名" style="width: 200px" />
              <el-input v-model="p[1]" placeholder="参数值" style="width: 260px" />
              <el-button link type="danger" @click="removeParam(i)">
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
            <el-button type="primary" plain size="small" @click="addParam">
              <el-icon><Plus /></el-icon>添加参数
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="排序值">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="上架" inactive-text="下架" />
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
.prod-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.prod-cell__cover {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  background: linear-gradient(135deg, #0b1e3f, #16365f);
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.prod-cell__name {
  font-weight: 600;
}

.prod-cell__model {
  font-size: 12px;
  color: #93a1b8;
  margin-top: 3px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.img-upload {
  position: relative;
  width: 180px;
  height: 120px;
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

.params-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.images-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.img-item {
  position: relative;
  width: 120px;
  height: 90px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-light);
  flex-shrink: 0;
}

.img-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-item__actions {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.2s;
}

.img-item:hover .img-item__actions {
  opacity: 1;
}

.img-item--add {
  display: flex;
  align-items: center;
  justify-content: center;
  border-style: dashed;
  cursor: pointer;
  color: #93a1b8;
  transition: color 0.2s, border-color 0.2s;
}

.img-item--add:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.img-item--add :deep(.el-upload) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.img-item--add :deep(.el-upload span) {
  font-size: 12px;
}
</style>