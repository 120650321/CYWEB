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
  { path: "/", name: "home", component: () => import("@/views/Home.vue"), meta: { title: "云南驰耀科技 - 物联网平台与智能监测系统解决方案提供商", description: "云南驰耀科技专注物联网智能监测平台研发，提供软硬件一体化解决方案，支持定制开发、项目实施部署与运维服务，助力行业智能化升级。" } },
  { path: "/关于我们", name: "about", component: () => import("@/views/About.vue"), meta: { title: "关于我们 - 深耕行业数字化领域 | 云南驰耀科技", description: "云南驰耀科技深耕行业数字化建设，专注物联网平台与智能监测系统研发，技术为本、服务落地，具备完整项目实施经验。" } },
  { path: "/产品中心", name: "products", component: () => import("@/views/Products.vue"), meta: { title: "产品中心 - 自研物联网平台与智能硬件 | 云南驰耀科技", description: "云南驰耀科技自主研发物联网平台、智能监测设备与软件系统，支持国产化适配与信创兼容，提供全栈技术产品。" } },
  { path: "/产品中心/:id", name: "product-detail", component: () => import("@/views/ProductDetail.vue"), meta: { title: "产品详情 - 云南驰耀科技" } },
  { path: "/解决方案", name: "solutions", component: () => import("@/views/Solutions.vue"), meta: { title: "解决方案 - 行业数字化与智能监测方案 | 云南驰耀科技", description: "面向行业场景深度定制的智慧化整体方案，涵盖物联网监控、安防监测、设备运维、大数据可视化等领域。" } },
  { path: "/解决方案/:id", name: "solution-detail", component: () => import("@/views/SolutionDetail.vue"), meta: { title: "方案详情 - 云南驰耀科技" } },
  { path: "/案例展示", name: "cases", component: () => import("@/views/Cases.vue"), meta: { title: "案例展示 - 实战落地案例 | 云南驰耀科技", description: "深耕行业场景，用真实交付案例验证方案价值，涵盖物联网平台、智能监测、系统集成等多个领域。" } },
  { path: "/案例展示/:id", name: "case-detail", component: () => import("@/views/CaseDetail.vue"), meta: { title: "案例详情 - 云南驰耀科技" } },
  { path: "/软件资料", name: "downloads", component: () => import("@/views/Downloads.vue"), meta: { title: "软件资料 - 产品文档与技术支持 | 云南驰耀科技", description: "提供物联网平台、智能监测系统等产品的技术文档、操作手册与软件下载，支持售后技术支持与运维服务。" } },
  { path: "/软件资料/:id", name: "download-detail", component: () => import("@/views/DownloadDetail.vue"), meta: { title: "资料详情 - 云南驰耀科技" } },
  { path: "/新闻资讯", name: "news", component: () => import("@/views/News.vue"), meta: { title: "新闻资讯 - 行业动态与技术前沿 | 云南驰耀科技", description: "关注云南驰耀科技动态，掌握物联网、智能监测、数字化转型等行业前沿技术与资讯。" } },
  { path: "/新闻资讯/:id", name: "news-detail", component: () => import("@/views/NewsDetail.vue"), meta: { title: "文章详情 - 云南驰耀科技" } },
  { path: "/联系我们", name: "contact", component: () => import("@/views/Contact.vue"), meta: { title: "联系我们 - 开启智慧物联合作 | 云南驰耀科技", description: "无论您是产品咨询、方案设计还是项目实施需求，欢迎联系云南驰耀科技，我们将在24小时内响应。" } },
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
  const title = (to.meta.title as string) || "云南驰耀科技 - 物联网平台与智能监测系统解决方案提供商";
  const description = (to.meta.description as string) || "云南驰耀科技有限公司专注行业数字化、物联网智能监测平台研发，提供软硬件一体化解决方案，支持定制开发、项目实施部署与运维服务，助力行业智能化升级。";
  const keywords = (to.meta.keywords as string) || "云南驰耀科技,物联网平台,智能监测系统,数字化解决方案,智慧物联,安防监控,系统集成,软硬件定制开发";
  const canonicalUrl = `https://www.ynyzzn.com${to.path}`;

  document.title = title;

  const setMeta = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  setMeta('meta[name="description"]', "content", description);
  setMeta('meta[name="keywords"]', "content", keywords);
  setMeta('meta[property="og:title"]', "content", title);
  setMeta('meta[property="og:description"]', "content", description);
  setMeta('meta[property="og:url"]', "content", canonicalUrl);
  setMeta('meta[name="twitter:title"]', "content", title);
  setMeta('meta[name="twitter:description"]', "content", description);
  setMeta('link[rel="canonical"]', "href", canonicalUrl);

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