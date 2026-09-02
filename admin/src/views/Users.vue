<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "@/api";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const loading = ref(false);
const saving = ref(false);
const list = ref<any[]>([]);
const total = ref(0);
const roles = ref<any[]>([]);

const query = reactive({ page: 1, size: 10, keyword: "", role: "" });

const dialogVisible = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const editingId = ref<number | null>(null);
const formRef = ref();
const form = reactive<any>({
  username: "",
  name: "",
  password: "",
  role: "editor",
  phone: "",
  email: "",
  status: 1,
});

const rules = {
  username: [{ required: true, message: "请输入登录账号", trigger: "blur" }],
  name: [{ required: true, message: "请输入姓名", trigger: "blur" }],
  password: [
    {
      validator: (_: any, v: string, cb: any) => {
        if (dialogMode.value === "create" && !v) return cb(new Error("请输入初始密码"));
        if (v && v.length < 6) return cb(new Error("密码至少 6 位"));
        cb();
      },
      trigger: "blur",
    },
  ],
};

async function fetchList() {
  loading.value = true;
  try {
    const res = await api.users.list();
    let items = res as any[];
    if (query.role) items = items.filter((x) => x.role === query.role);
    if (query.keyword) {
      const kw = query.keyword.toLowerCase();
      items = items.filter(
        (x) =>
          x.username.toLowerCase().includes(kw) ||
          x.name.toLowerCase().includes(kw) ||
          (x.phone || "").toLowerCase().includes(kw)
      );
    }
    const start = (query.page - 1) * query.size;
    list.value = items.slice(start, start + query.size);
    total.value = items.length;
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  const res = await api.roles.list();
  roles.value = res as any[];
}

function openCreate() {
  dialogMode.value = "create";
  editingId.value = null;
  Object.assign(form, { username: "", name: "", password: "", role: "editor", phone: "", email: "", status: 1 });
  dialogVisible.value = true;
}

function openEdit(row: any) {
  dialogMode.value = "edit";
  editingId.value = row.id;
  Object.assign(form, {
    username: row.username,
    name: row.name,
    password: "",
    role: row.role,
    phone: row.phone || "",
    email: row.email || "",
    status: row.status,
  });
  dialogVisible.value = true;
}

async function submit() {
  await formRef.value.validate();
  saving.value = true;
  try {
    const payload: any = {
      username: form.username,
      name: form.name,
      role: form.role,
      phone: form.phone,
      email: form.email,
      status: form.status,
    };
    if (form.password) payload.password = form.password;
    if (dialogMode.value === "create") {
      await api.users.create(payload);
      ElMessage.success("创建成功");
    } else {
      await api.users.update(editingId.value, payload);
      ElMessage.success("保存成功");
    }
    dialogVisible.value = false;
    fetchList();
  } finally {
    saving.value = false;
  }
}

async function onRemove(row: any) {
  if (row.id === auth.user?.id) {
    ElMessage.warning("不能删除当前登录账号");
    return;
  }
  await ElMessageBox.confirm(`确定删除用户「${row.name}（${row.username}）」吗？`, "删除确认", {
    type: "warning",
  });
  await api.users.remove(row.id);
  ElMessage.success("已删除");
  fetchList();
}

function toggleStatus(row: any) {
  if (row.id === auth.user?.id) {
    ElMessage.warning("不能停用当前登录账号");
    fetchList();
    return;
  }
  api.users.update(row.id, { status: row.status ? 0 : 1 }).then(() => {
    ElMessage.success("状态已更新");
    fetchList();
  });
}

function fmtDate(v: string) {
  return v ? v.replace("T", " ").slice(0, 19) : "-";
}

const roleLabel = (r: string) => {
  const map: Record<string, string> = { superadmin: "超级管理员", editor: "内容编辑", operator: "运营人员" };
  return map[r] || r;
};

onMounted(() => {
  fetchRoles();
  fetchList();
});
</script>

<template>
  <div class="page">
    <div class="page__head">
      <div class="page__title">用户管理</div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>新增用户
      </el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <div class="filter-bar">
        <el-select v-model="query.role" placeholder="全部角色" clearable style="width: 160px" @change="query.page = 1; fetchList()">
          <el-option label="超级管理员" value="superadmin" />
          <el-option label="内容编辑" value="editor" />
          <el-option label="运营人员" value="operator" />
        </el-select>
        <el-input
          v-model="query.keyword"
          placeholder="搜索账号 / 姓名 / 手机"
          clearable
          style="width: 240px"
          @keyup.enter="query.page = 1; fetchList()"
        />
        <el-button type="primary" plain @click="query.page = 1; fetchList()">查询</el-button>
        <el-button @click="query.keyword = ''; query.role = ''; query.page = 1; fetchList()">重置</el-button>
      </div>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="list" stripe>
        <el-table-column label="用户" min-width="170">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="34" class="user-cell__avatar">{{ row.name?.slice(0, 1) }}</el-avatar>
              <div>
                <div class="user-cell__name">
                  {{ row.name }}
                  <el-tag v-if="row.id === auth.user?.id" size="small" type="warning" effect="plain">当前账号</el-tag>
                </div>
                <div class="user-cell__user">@{{ row.username }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="110">
          <template #default="{ row }">
            <el-tag :type="row.role === 'superadmin' ? 'danger' : row.role === 'editor' ? 'primary' : 'success'" size="small" effect="light">
              {{ roleLabel(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="email" label="邮箱" width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-switch :model-value="!!row.status" :disabled="row.id === auth.user?.id" @change="toggleStatus(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="last_login_at" label="最近登录" width="160">
          <template #default="{ row }">{{ fmtDate(row.last_login_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" :disabled="row.id === auth.user?.id" @click="onRemove(row)">删除</el-button>
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

    <el-dialog v-model="dialogVisible" :title="dialogMode === 'create' ? '新增用户' : '编辑用户'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="84px">
        <el-form-item label="登录账号" prop="username">
          <el-input v-model="form.username" :disabled="dialogMode === 'edit'" placeholder="用于登录后台" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" placeholder="用户姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" show-password :placeholder="dialogMode === 'create' ? '请输入初始密码（至少 6 位）' : '留空则不修改密码'" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option v-for="r in roles" :key="r.code" :label="r.name" :value="r.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="form.phone" placeholder="手机号码" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="电子邮箱" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
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
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.user-cell__avatar {
  background: linear-gradient(135deg, var(--brand-500), var(--cyan-500));
  color: #fff;
  font-weight: 700;
  flex-shrink: 0;
}
.user-cell__name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.user-cell__user {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
