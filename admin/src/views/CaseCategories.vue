<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const list = ref<any[]>([]);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: "", sort: 0 });

async function load() {
  loading.value = true;
  try {
    const data = await api.caseCategories.list({ page: 1, size: 100 });
    list.value = data.list;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  Object.assign(form, { name: "", sort: 0 });
  editingId.value = null;
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, sort: row.sort });
  dialogVisible.value = true;
}

async function save() {
  if (!form.name.trim()) return ElMessage.warning("请填写分类名称");
  saving.value = true;
  try {
    if (editingId.value) await api.caseCategories.update(editingId.value, form);
    else await api.caseCategories.create(form);
    ElMessage.success("保存成功");
    dialogVisible.value = false;
    load();
  } catch (e: any) {
    ElMessage.error(e.message);
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  await ElMessageBox.confirm(`确定删除分类「${row.name}」吗？`, "删除确认", { type: "warning" });
  await api.caseCategories.remove(row.id);
  ElMessage.success("删除成功");
  load();
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="page-title">案例分类</span>
      <el-button type="primary" @click="openCreate"><el-icon><Plus /></el-icon>新增分类</el-button>
    </div>
    <el-card shadow="never">
      <el-table v-loading="loading" :data="list">
        <el-table-column prop="name" label="分类名称" min-width="200" />
        <el-table-column prop="sort" label="排序" width="100" align="center" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新增分类'" width="420px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称" required><el-input v-model="form.name" maxlength="30" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" :max="999" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
