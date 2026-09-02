<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const list = ref<any[]>([]);
const dialogVisible = ref(false);
const saving = ref(false);
const editingId = ref<number | null>(null);
const form = reactive({ name: "", icon: "", description: "", sort: 0, status: 1 });

const iconOptions = ["link", "camera", "chip", "layers", "cpu", "shield", "cloud", "signal", "doc", "code"];

async function load() {
  loading.value = true;
  try {
    const data = await api.productCategories.list({ page: 1, size: 100 });
    list.value = data.list;
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, { name: "", icon: "", description: "", sort: 0, status: 1 });
  editingId.value = null;
}

function openCreate() {
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: any) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, icon: row.icon, description: row.description, sort: row.sort, status: row.status });
  dialogVisible.value = true;
}

async function save() {
  if (!form.name.trim()) return ElMessage.warning("请填写分类名称");
  saving.value = true;
  try {
    if (editingId.value) {
      await api.productCategories.update(editingId.value, form);
      ElMessage.success("更新成功");
    } else {
      await api.productCategories.create(form);
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
  await ElMessageBox.confirm(`确定删除分类「${row.name}」吗？该分类下产品将无法展示。`, "删除确认", { type: "warning" });
  await api.productCategories.remove(row.id);
  ElMessage.success("删除成功");
  load();
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="page-toolbar">
      <span class="page-title">产品分类</span>
      <div class="toolbar-right">
        <el-button type="primary" @click="openCreate">
          <el-icon><Plus /></el-icon>新增分类
        </el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list">
        <el-table-column prop="name" label="分类名称" min-width="140" />
        <el-table-column prop="icon" label="图标标识" width="120" />
        <el-table-column prop="description" label="描述" min-width="260" show-overflow-tooltip />
        <el-table-column prop="sort" label="排序" width="80" align="center" />
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">{{ row.status === 1 ? "启用" : "停用" }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑分类' : '新增分类'" width="480px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="分类名称" required>
          <el-input v-model="form.name" placeholder="如：物联网平台" maxlength="30" />
        </el-form-item>
        <el-form-item label="图标标识">
          <el-select v-model="form.icon" placeholder="选择图标" clearable style="width: 200px">
            <el-option v-for="i in iconOptions" :key="i" :label="i" :value="i" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类描述">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="120" />
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
