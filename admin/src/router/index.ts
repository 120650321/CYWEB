import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/Login.vue"),
      meta: { title: "登录" },
    },
    {
      path: "/",
      component: () => import("@/layout/AdminLayout.vue"),
      redirect: "/dashboard",
      children: [
        { path: "dashboard", name: "dashboard", component: () => import("@/views/Dashboard.vue"), meta: { title: "仪表盘", icon: "Odometer" } },
        { path: "banners", name: "banners", component: () => import("@/views/Banners.vue"), meta: { title: "Banner 管理", icon: "Picture" } },
        { path: "products", name: "products", component: () => import("@/views/Products.vue"), meta: { title: "产品管理", icon: "Box" } },
        { path: "product-categories", name: "product-categories", component: () => import("@/views/ProductCategories.vue"), meta: { title: "产品分类", icon: "Files" } },
        { path: "solutions", name: "solutions", component: () => import("@/views/Solutions.vue"), meta: { title: "解决方案", icon: "Compass" } },
        { path: "cases", name: "cases", component: () => import("@/views/Cases.vue"), meta: { title: "案例管理", icon: "Medal" } },
        { path: "case-categories", name: "case-categories", component: () => import("@/views/CaseCategories.vue"), meta: { title: "案例分类", icon: "Files" } },
        { path: "downloads", name: "downloads", component: () => import("@/views/Downloads.vue"), meta: { title: "软件资料", icon: "Download" } },
        { path: "download-categories", name: "download-categories", component: () => import("@/views/DownloadCategories.vue"), meta: { title: "资料分类", icon: "Files" } },
        { path: "articles", name: "articles", component: () => import("@/views/Articles.vue"), meta: { title: "新闻资讯", icon: "Document" } },
        { path: "messages", name: "messages", component: () => import("@/views/Messages.vue"), meta: { title: "留言管理", icon: "ChatDotRound" } },
        { path: "users", name: "users", component: () => import("@/views/Users.vue"), meta: { title: "用户管理", icon: "User", adminOnly: true } },
        { path: "roles", name: "roles", component: () => import("@/views/Roles.vue"), meta: { title: "角色权限", icon: "Key", adminOnly: true } },
        { path: "settings", name: "settings", component: () => import("@/views/Settings.vue"), meta: { title: "系统设置", icon: "Setting" } },
        { path: "logs", name: "logs", component: () => import("@/views/Logs.vue"), meta: { title: "操作日志", icon: "List", adminOnly: true } },
        { path: "visits", name: "visits", component: () => import("@/views/Visits.vue"), meta: { title: "访问统计", icon: "DataAnalysis" } },
        { path: "watchdog", name: "watchdog", component: () => import("@/views/Watchdog.vue"), meta: { title: "看门狗监控", icon: "Monitor" } },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem("admin_token");
  if (to.path !== "/login" && !token) {
    return "/login";
  }
  if (to.path === "/login" && token) {
    return "/";
  }
  document.title = to.meta.title ? `${to.meta.title} - 驰耀科技后台` : "驰耀科技后台";
  return true;
});

export default router;