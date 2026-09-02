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
  title: "",
  subtitle: "",
  slogan: "",
  image: "",
  bg_color: "#0A1633",
  link: "",
  button_text: "",
  sort: 0,
  status: 1,
});

const colors = ["#0A1633", "#0B1E3F", "#10294F", "#123064", "#0A3D62", "#0B4F7A"];

async function load() {
  loading.value = true;
  try {
    const data = await api.banners.list(query);
    list.value = data.list;
    total.value = data.pagination.total;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    title: "",
    subtitle: "",
    slogan: "",
    image: "",
    bg_color: "#0A1633",
    link: "",
    button_text: "",
    sort: 0,
    status: 1,
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
    title: row.title,
    subtitle: row.subtitle || "",
    slogan: row.slogan || "",
    image: row.image || "",
    bg_color: row.bg_color || "#0A1633",
    link: row.link || "",
    button_text: row.button_text || "",
    sort: row.sort,
    status: row.status,
  });
  dialogVisible.value = true;
}

async function save() {
  if (!form.title.trim()) return ElMessage.warning("请填写 Banner 标题");
  saving.value = true;
  try {
    if (editingId.value) {
      await api.banners.update(editingId.value, form);
      ElMessage.success("更新成功");
    } else {
      await api.banners.create(form);
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
  await ElMessageBox.confirm(`确定删除 Banner「${row.title}」吗？`, "删除确认", { type: "warning" });
  await api.banners.remove(row.id);
  ElMessage.success("删除成功");
  load();
}

async function toggleStatus(row: any) {
  const status = row.status === 1 ? 0 : 1;
  await api.banners.status(row.id, status);
  row.status = status;
  ElMessage.success(status === 1 ? "已启用" : "已停用");
}

async function onUpload(options: UploadRequestOptions) {
  try {
    const data = await http.upload(options.file as File, "image", (percent) => {
      options.onProgress({ percent });
    });
    form.image = data.url;
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
      <span class="page-title">Banner 管理</span>
      <div class="toolbar-right">
        <el-input v-model="query.keyword" class="search-input" placeholder="搜索标题 / 副标题" clearable @keyup.enter="search" @clear="search">
          <template #append><el-button @click="search">搜索</el-button></template>
        </el-input>
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>新增 Banner
        </el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list">
        <el-table-column label="预览" width="300">
          <template #default="{ row }">
            <div class="banner-preview" :style="{ background: row.bg_color }">
              <div class="banner-preview__text">
                <b v-if="row.slogan">{{ row.slogan }}</b>
                <span>{{ row.title }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="subtitle" label="副标题" min-width="200" show-overflow-tooltip />
        <el-table-column label="跳转链接" min-width="140">
          <template #default="{ row }">{{ row.link || "--" }}</template>
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
        <el-pagination
          v-model:current-page="query.page"
          :page-size="query.size"
          :total="total"
          layout="total, prev, pager, next"
          @current-change="load"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑 Banner' : '新增 Banner'" width="560px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="Banner 标题" required>
          <el-input v-model="form.title" placeholder="请输入标题" maxlength="40" />
        </el-form-item>
        <el-form-item label="副标题">
          <el-input v-model="form.subtitle" placeholder="请输入副标题" maxlength="80" />
        </el-form-item>
        <el-form-item label="口号标语">
          <el-input v-model="form.slogan" placeholder="如：智慧物联 · 科技赋能" maxlength="40" />
        </el-form-item>
        <el-form-item label="背景图片">
          <el-upload
            :show-file-list="false"
            :http-request="onUpload"
            accept="image/*"
            action="#"
          >
            <div v-if="form.image" class="banner-upload">
              <img :src="form.image" alt="" />
              <span class="banner-upload__overlay">点击更换</span>
            </div>
            <el-button v-else>上传背景图（可选）</el-button>
          </el-upload>
        </el-form-item>
        <el-form-item label="背景色">
          <div class="color-row">
            <button
              v-for="c in colors"
              :key="c"
              class="color-swatch"
              :style="{ background: c }"
              :class="{ 'color-swatch--active': form.bg_color === c }"
              @click="form.bg_color = c"
            ></button>
            <el-input v-model="form.bg_color" style="width: 120px" />
          </div>
        </el-form-item>
        <el-form-item label="按钮文字">
          <el-input v-model="form.button_text" placeholder="如：了解产品" maxlength="12" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.link" placeholder="如：/products" />
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
.banner-preview {
  height: 64px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  overflow: hidden;
  position: relative;
}

.banner-preview__text {
  display: flex;
  flex-direction: column;
  color: #fff;
  font-size: 12px;
  gap: 2px;
  position: relative;
  z-index: 1;
}

.banner-preview__text b {
  color: #7de8ff;
  font-size: 10px;
  letter-spacing: 1px;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.banner-upload {
  position: relative;
  width: 320px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.banner-upload img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner-upload__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.2s;
}

.banner-upload:hover .banner-upload__overlay {
  opacity: 1;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s;
}

.color-swatch:hover {
  transform: scale(1.12);
}

.color-swatch--active {
  border-color: var(--cyan-500);
  box-shadow: 0 0 0 2px rgba(0, 200, 255, 0.3);
}
</style>