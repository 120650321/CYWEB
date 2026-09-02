import { createRouter, createWebHistory } from "vue-router";

export function normalizeRoutePath(path: string | null | undefined, fallback = "/") {
  if (!path || typeof path !== "string") return fallback;

  const normalized = path.trim();
  if (!normalized) return fallback;

  const map: Record<string, string> = {
    "/about": "/关于我们",
    "/products": "/产品中心",
    "/solutions": "/解决方案",
    "/cases": "/案例展示",
    "/downloads": "/软件资料",
    "/news": "/新闻资讯",
    "/contact": "/联系我们",
  };

  if (map[normalized]) return map[normalized];

  if (normalized.startsWith("/products/")) return `/产品中心/${normalized.split("/").slice(2).join("/")}`;
  if (normalized.startsWith("/solutions/")) return `/解决方案/${normalized.split("/").slice(2).join("/")}`;
  if (normalized.startsWith("/cases/")) return `/案例展示/${normalized.split("/").slice(2).join("/")}`;
  if (normalized.startsWith("/downloads/")) return `/软件资料/${normalized.split("/").slice(2).join("/")}`;
  if (normalized.startsWith("/news/")) return `/新闻资讯/${normalized.split("/").slice(2).join("/")}`;

  return normalized;
}

const routes = [
  { path: "/", name: "home", component: () => import("@/views/Home.vue"), meta: { title: "首页" } },
  { path: "/关于我们", name: "about", component: () => import("@/views/About.vue"), meta: { title: "关于我们" } },
  { path: "/产品中心", name: "products", component: () => import("@/views/Products.vue"), meta: { title: "产品中心" } },
  { path: "/产品中心/:id", name: "product-detail", component: () => import("@/views/ProductDetail.vue"), meta: { title: "产品详情" } },
  { path: "/解决方案", name: "solutions", component: () => import("@/views/Solutions.vue"), meta: { title: "解决方案" } },
  { path: "/解决方案/:id", name: "solution-detail", component: () => import("@/views/SolutionDetail.vue"), meta: { title: "方案详情" } },
  { path: "/案例展示", name: "cases", component: () => import("@/views/Cases.vue"), meta: { title: "案例展示" } },
  { path: "/案例展示/:id", name: "case-detail", component: () => import("@/views/CaseDetail.vue"), meta: { title: "案例详情" } },
  { path: "/软件资料", name: "downloads", component: () => import("@/views/Downloads.vue"), meta: { title: "软件资料" } },
  { path: "/软件资料/:id", name: "download-detail", component: () => import("@/views/DownloadDetail.vue"), meta: { title: "资料详情" } },
  { path: "/新闻资讯", name: "news", component: () => import("@/views/News.vue"), meta: { title: "新闻资讯" } },
  { path: "/新闻资讯/:id", name: "news-detail", component: () => import("@/views/NewsDetail.vue"), meta: { title: "文章详情" } },
  { path: "/联系我们", name: "contact", component: () => import("@/views/Contact.vue"), meta: { title: "联系我们" } },
  { path: "/about", redirect: "/关于我们" },
  { path: "/products", redirect: "/产品中心" },
  { path: "/products/:id", redirect: to => `/产品中心/${to.params.id}` },
  { path: "/solutions", redirect: "/解决方案" },
  { path: "/solutions/:id", redirect: to => `/解决方案/${to.params.id}` },
  { path: "/cases", redirect: "/案例展示" },
  { path: "/cases/:id", redirect: to => `/案例展示/${to.params.id}` },
  { path: "/downloads", redirect: "/软件资料" },
  { path: "/downloads/:id", redirect: to => `/软件资料/${to.params.id}` },
  { path: "/news", redirect: "/新闻资讯" },
  { path: "/news/:id", redirect: to => `/新闻资讯/${to.params.id}` },
  { path: "/contact", redirect: "/联系我们" },
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

function getVisitorId() {
  const key = "_vid";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(key, id);
  }
  return id;
}

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 云南驰耀科技` : "云南驰耀科技";
  fetch("/api/public/visit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      visitor_id: getVisitorId(),
      page_path: to.path,
      page_title: to.meta.title || "",
    }),
  }).catch((err) => {
    console.error("[visit] 访问统计上报失败:", err.message);
  });
});

export default router;