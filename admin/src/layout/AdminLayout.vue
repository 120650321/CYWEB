<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const collapsed = ref(false);
const mobileOpen = ref(false);

const menus = [
  { path: "/dashboard", title: "仪表盘", icon: "Odometer" },
  { path: "/banners", title: "Banner 管理", icon: "Picture" },
  {
    title: "产品中心",
    icon: "Box",
    children: [
      { path: "/products", title: "产品管理" },
      { path: "/product-categories", title: "产品分类" },
    ],
  },
  { path: "/solutions", title: "解决方案", icon: "Compass" },
  {
    title: "案例中心",
    icon: "Medal",
    children: [
      { path: "/cases", title: "案例管理" },
      { path: "/case-categories", title: "案例分类" },
    ],
  },
  {
    title: "资料中心",
    icon: "Download",
    children: [
      { path: "/downloads", title: "软件资料" },
      { path: "/download-categories", title: "资料分类" },
    ],
  },
  { path: "/articles", title: "新闻资讯", icon: "Document" },
  { path: "/messages", title: "留言管理", icon: "ChatDotRound" },
];

const adminMenus = [
  { path: "/users", title: "用户管理", icon: "User" },
  { path: "/roles", title: "角色权限", icon: "Key" },
];

const otherMenus = [
  { path: "/settings", title: "系统设置", icon: "Setting" },
  { path: "/logs", title: "操作日志", icon: "List" },
  { path: "/visits", title: "访问统计", icon: "DataAnalysis" },
  { path: "/watchdog", title: "看门狗监控", icon: "Monitor" },
];

const allMenus = computed(() => {
  const list: any[] = [...menus];
  if (auth.isSuperadmin) list.push(...adminMenus);
  list.push(...otherMenus);
  return list;
});

const activeMenu = computed(() => route.path);
const pageTitle = computed(() => (route.meta.title as string) || "");

const userName = computed(() => auth.user?.name || auth.user?.username || "管理员");
const roleLabel = computed(() => {
  const map: Record<string, string> = {
    superadmin: "超级管理员",
    editor: "内容编辑",
    operator: "运营人员",
  };
  return map[auth.user?.role || ""] || auth.user?.role || "";
});

function toggleMenu(path: string) {
  if (!path) return;
  mobileOpen.value = false;
  router.push(path);
}

function logout() {
  auth.logout();
  router.push("/login");
}

onMounted(() => {
  if (!auth.user) auth.loadProfile();
});
</script>

<template>
  <div class="layout">
    <div v-if="mobileOpen" class="layout__mask" @click="mobileOpen = false"></div>

    <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed, 'sidebar--open': mobileOpen }">
      <div class="sidebar__logo" @click="router.push('/dashboard')">
        <img src="/logo.png" alt="驰耀科技" />
        <div v-show="!collapsed" class="sidebar__logo-text">
          <span>驰耀科技</span>
          <em>CHIYAO ADMIN</em>
        </div>
      </div>

      <nav class="sidebar__nav">
        <el-menu
          :default-active="activeMenu"
          :collapse="collapsed"
          :collapse-transition="false"
          router
          background-color="transparent"
          text-color="rgba(255,255,255,0.72)"
          active-text-color="#00e0ff"
        >
          <template v-for="m in allMenus" :key="m.path || m.title">
            <el-sub-menu v-if="m.children" :index="m.title">
              <template #title>
                <el-icon><component :is="m.icon" /></el-icon>
                <span>{{ m.title }}</span>
              </template>
              <el-menu-item v-for="c in m.children" :key="c.path" :index="c.path">
                {{ c.title }}
              </el-menu-item>
            </el-sub-menu>
            <el-menu-item v-else :index="m.path">
              <el-icon><component :is="m.icon" /></el-icon>
              <template #title>{{ m.title }}</template>
            </el-menu-item>
          </template>
        </el-menu>
      </nav>

      <div class="sidebar__foot">
        <button class="sidebar__collapse" @click="collapsed = !collapsed">
          <el-icon><component :is="collapsed ? 'Expand' : 'Fold'" /></el-icon>
        </button>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <button class="topbar__burger" @click="mobileOpen = !mobileOpen">
          <el-icon size="20"><Menu /></el-icon>
        </button>
        <div class="topbar__title">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="pageTitle">{{ pageTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="topbar__right">
          <el-dropdown trigger="click">
            <div class="topbar__user">
              <el-avatar :size="34" class="topbar__avatar">{{ userName.slice(0, 1) }}</el-avatar>
              <div class="topbar__user-info">
                <span class="topbar__user-name">{{ userName }}</span>
                <span class="topbar__user-role">{{ roleLabel }}</span>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="router.push('/dashboard')">
                  <el-icon><Odometer /></el-icon>工作台
                </el-dropdown-item>
                <el-dropdown-item divided @click="logout">
                  <el-icon><SwitchButton /></el-icon>退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="main__content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.layout__mask {
  position: fixed;
  inset: 0;
  background: rgba(6, 14, 34, 0.5);
  z-index: 60;
  backdrop-filter: blur(4px);
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: linear-gradient(195deg, #060e22 0%, #0a1633 30%, #0b1e3f 70%, #10294f 100%);
  display: flex;
  flex-direction: column;
  transition: width 0.35s cubic-bezier(0.22,1,0.36,1);
  z-index: 70;
  position: relative;
  overflow: hidden;
}

.sidebar::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0,200,255,0.3), transparent);
}

.sidebar::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(300px 400px at 50% 20%, rgba(0,200,255,0.04), transparent 60%);
  pointer-events: none;
}

.sidebar--collapsed {
  width: 64px;
}

.sidebar__logo {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.sidebar__logo img {
  width: 38px;
  height: 38px;
  object-fit: contain;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 4px;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.sidebar__logo:hover img {
  transform: scale(1.08);
}

.sidebar__logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
}

.sidebar__logo-text span {
  color: #fff;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 2px;
}

.sidebar__logo-text em {
  font-style: normal;
  font-size: 9px;
  color: var(--cyan-500);
  letter-spacing: 1.5px;
}

.sidebar__nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 10px;
  position: relative;
  z-index: 1;
}

.sidebar__nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar__nav::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.sidebar__nav::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

.sidebar__nav :deep(.el-menu) {
  border-right: none;
}

.sidebar__nav :deep(.el-menu-item),
.sidebar__nav :deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  border-radius: 10px;
  margin-bottom: 3px;
  font-size: 14px;
  transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
}

.sidebar__nav :deep(.el-menu-item:hover),
.sidebar__nav :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #fff !important;
}

.sidebar__nav :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, rgba(11, 95, 255, 0.5), rgba(0, 200, 255, 0.2)) !important;
  box-shadow: 0 0 20px rgba(0, 200, 255, 0.15), inset 0 0 0 1px rgba(0, 200, 255, 0.25);
  color: #fff !important;
  font-weight: 600;
}

.sidebar__nav :deep(.el-sub-menu .el-menu-item) {
  padding-left: 48px !important;
  background: rgba(0, 0, 0, 0.15);
  font-size: 13px;
}

.sidebar__nav :deep(.el-sub-menu__icon-arrow) {
  color: rgba(255,255,255,0.5);
}

.sidebar__foot {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  position: relative;
  z-index: 1;
}

.sidebar__collapse {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.25s;
  cursor: pointer;
}

.sidebar__collapse:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-color: rgba(255,255,255,0.15);
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: linear-gradient(180deg, #f5f7fb, #f9fafc);
}

.topbar {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-light);
  z-index: 50;
}

.topbar__burger {
  display: none;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  background: var(--bg-light);
  color: var(--text-primary);
  border: 1px solid var(--border-light);
  cursor: pointer;
  transition: all 0.2s;
}

.topbar__burger:hover {
  background: #eef2f8;
  border-color: var(--brand-500);
}

.topbar__title {
  flex: 1;
}

.topbar__right {
  display: flex;
  align-items: center;
}

.topbar__user {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 12px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.topbar__user:hover {
  background: var(--bg-light);
  border-color: var(--border-light);
}

.topbar__avatar {
  background: linear-gradient(135deg, var(--brand-600), var(--cyan-500));
  font-weight: 700;
  color: #fff;
  box-shadow: 0 2px 8px rgba(11,95,255,0.3);
}

.topbar__user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.topbar__user-name {
  font-size: 14px;
  font-weight: 600;
}

.topbar__user-role {
  font-size: 11px;
  color: var(--text-secondary);
}

.main__content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.topbar__title :deep(.el-breadcrumb__inner) {
  font-weight: 500 !important;
  color: var(--text-secondary) !important;
}

.topbar__title :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: var(--text-primary) !important;
  font-weight: 700 !important;
}

.fade-slide-enter-active {
  transition: all 0.3s cubic-bezier(0.22,1,0.36,1);
}

.fade-slide-leave-active {
  transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 900px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    transform: translateX(-100%);
    transition: transform 0.35s cubic-bezier(0.22,1,0.36,1);
  }

  .sidebar--open {
    transform: none;
  }

  .sidebar--collapsed {
    width: 240px;
  }

  .topbar__burger {
    display: flex;
  }
}
</style>