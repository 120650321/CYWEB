<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";

const loading = ref(false);
const saving = ref(false);
const list = ref<any[]>([]);

const dialogVisible = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const editingId = ref<number | null>(null);
const formRef = ref();
const form = reactive<any>({
  name: "",
  code: "",
  description: "",
  permissions: [] as string[],
});

const rules = {
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入角色标识", trigger: "blur" }],
};

const permissionGroups = [
  {
    label: "仪表盘与内容",
    items: [
      { code: "dashboard", label: "仪表盘" },
      { code: "banners", label: "Banner 管理" },
    ],
  },
  {
    label: "产品与方案",
    items: [
      { code: "products", label: "产品中心" },
      { code: "solutions", label: "解决方案" },
    ],
  },
  {
    label: "案例与资料",
    items: [
      { code: "cases", label: "案例中心" },
      { code: "downloads", label: "软件资料" },
    ],
  },
  {
    label: "资讯与互动",
    items: [
      { code: "articles", label: "新闻资讯" },
      { code: "messages", label: "留言管理" },
    ],
  },
  {
    label: "系统管理",
    items: [
      { code: "users", label: "用户管理" },
      { code: "roles", label: "角色权限" },
      { code: "settings", label: "系统设置" },
      { code: "logs", label: "操作日志" },
    ],
  },
];

async function fetchList() {
  loading.value = true;
  try {
    const res = await api.roles.list();
    list.value = res as any[];
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialogMode.value = "create";
  editingId.value = null;
  Object.assign(form, { name: "", code: "", description: "", permissions: [] });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  dialogMode.value = "edit";
  editingId.value = row.id;
  Object.assign(form, {
    name: row.name,
    code: row.code,
    description: row.description || "",
    permissions: Array.isArray(row.permissions) ? [...row.permissions] : [],
  });
  dialogVisible.value = true;
}

async function submit() {
  await formRef.value.validate();
  saving.value = true;
  try {
    if (dialogMode.value === "create") {
      await api.roles.create({ ...form });
      ElMessage.success("创建成功");
    } else {
      await api.roles.update(editingId.value, { ...form });
      ElMessage.success("保存成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function onRemove(row: any) {
  if (row.code === "superadmin") {
    ElMessage.warning("内置超管角色不可删除");
    return;
  }
  await ElMessageBox.confirm(`确定删除角色「${row.name}」吗？`, "删除确认", {
    type: "warning",
  });
  await api.roles.remove(row.id);
  ElMessage.success("已删除");
  fetchList();
}

function togglePermission(code: string, checked: boolean) {
  if (checked) {
    if (!form.permissions.includes(code)) form.permissions.push(code);
  } else {
    form.permissions = form.permissions.filter((x) => x !== code);
  }
}

function checkAll(group: any) {
  const codes = group.items.map((i: any) => i.code);
  const allChecked = codes.every((c: string) => form.permissions.includes(c));
  if (allChecked) form.permissions = form.permissions.filter((x) => !codes.includes(x));
  else {
    codes.forEach((c: string) => {
      if (!form.permissions.includes(c)) form.permissions.push(c);
    });
  }
}

onMounted(fetchList);
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">角色权限管理</div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>新增角色
      </el-button>
    </div>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="角色" min-width="160">
          <template #default="{ row }">
            <div class="role-cell">
              <el-icon class="role-cell__icon"><Key /></el-icon>
              <div>
                <div class="role-cell__name">
                  {{ row.name }}
                  <el-tag v-if="row.code === 'superadmin'" size="small" type="danger" effect="dark">内置</el-tag>
                </div>
                <div class="role-cell__code">{{ row.code }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="权限" min-width="260">
          <template #default="{ row }">
            <div v-if="row.code === 'superadmin'" class="perm-all">全部权限</div>
            <div v-else class="perm-tags">
              <el-tag v-for="p in row.permissions" :key="p" size="small" effect="plain">{{ p }}</el-tag>
              <span v-if="!row.permissions?.length" class="text-muted">无权限</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.code === 'superadmin'" @click="onRemove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增角色' : '编辑角色'" width="720px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="84px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="角色名称" prop="name">
              <el-input v-model="form.name" placeholder="如：运营专员" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="角色标识" prop="code">
              <el-input v-model="form.code" :disabled="dialogMode === 'edit'" placeholder="如：operator2，字母数字下划线" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" placeholder="角色职责说明" />
        </el-form-item>

        <el-form-item label="权限配置">
          <div class="perms">
            <div v-for="(g, gi) in permissionGroups" :key="gi" class="perms__group">
              <div class="perms__group-head">
                <el-checkbox
                  :model-value="g.items.every((i: any) => form.permissions.includes(i.code))"
                  :indeterminate="g.items.some((i: any) => form.permissions.includes(i.code)) && !g.items.every((i: any) => form.permissions.includes(i.code))"
                  @change="checkAll(g)"
                >
                  {{ g.label }}
                </el-checkbox>
              </div>
              <div class="perms__items">
                <el-checkbox
                  v-for="item in g.items"
                  :key="item.code"
                  :model-value="form.permissions.includes(item.code)"
                  @change="togglePermission(item.code, $event as boolean)"
                >
                  {{ item.label }}
                </el-checkbox>
              </div>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.role-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.role-cell__icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: linear-gradient(135deg, #0b5fff, #00c8ff);
  color: #fff;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.role-cell__name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.role-cell__code {
  font-size: 12px;
  color: var(--text-secondary);
}
.perm-all {
  color: var(--brand-500);
  font-weight: 600;
}
.perm-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.text-muted {
  color: #a0a8b8;
}
.perms {
  width: 100%;
  border: 1px solid var(--border-light);
  border-radius: 10px;
  padding: 6px 14px;
}
.perms__group {
  padding: 10px 0;
  border-bottom: 1px dashed var(--border-light);
}
.perms__group:last-child {
  border-bottom: none;
}
.perms__group-head {
  font-weight: 600;
  margin-bottom: 6px;
}
.perms__items {
  display: flex;
  gap: 6px 18px;
  flex-wrap: wrap;
  padding-left: 26px;
}
</style>
