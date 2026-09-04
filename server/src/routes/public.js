import { Router } from "express";
import { db } from "../db.js";
import { config } from "../config.js";
import { ok, fail, paginate, paged, decodeJSON, getClientIp } from "../utils.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const IP2Region = require("ip2region");

const router = Router();

// IP 区域解析（基于 ip2region 离线数据库）
const ip2regionSearcher = (() => {
  try {
    return new IP2Region();
  } catch (e) {
    console.warn("ip2region 初始化失败，将使用简单 IP 识别:", e.message);
    return null;
  }
})();

function resolveRegion(ip) {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return "本地网络";
  }

  if (ip2regionSearcher) {
    try {
      const result = ip2regionSearcher.search(ip);
      if (result && result.region) {
        const parts = result.region.split("|");
        const country = parts[0] || "";
        const province = parts[2] || "";
        const city = parts[3] || "";
        const isp = parts[4] || "";

        const arr = [];
        if (country) arr.push(country);
        if (province && province !== "0") arr.push(province);
        if (city && city !== "0" && city !== province) arr.push(city);
        if (isp && isp !== "0") arr.push(isp);

        return arr.join(" ") || "未知";
      }
    } catch {
      // fallback
    }
  }

  const parts = ip.split(".");
  if (parts.length === 4) {
    const first = parseInt(parts[0]);
    if (first >= 14 && first <= 223) return "中国";
  }
  return "其他地区";
}

  function normalizePublicLink(path, fallback = "/") {
  if (!path || typeof path !== "string") return fallback;
  const value = path.trim();
  if (!value) return fallback;

  const map = {
    "/about": "/关于我们",
    "/products": "/产品中心",
    "/product": "/产品中心",
    "/solutions": "/解决方案",
    "/solution": "/解决方案",
    "/cases": "/案例展示",
    "/case": "/案例展示",
    "/downloads": "/软件资料",
    "/download": "/软件资料",
    "/news": "/新闻资讯",
    "/contact": "/联系我们",
  };

  if (map[value]) return map[value];
  if (value.startsWith("/products/")) return `/产品中心/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/product/")) return `/产品中心/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/solutions/")) return `/解决方案/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/solution/")) return `/解决方案/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/cases/")) return `/案例展示/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/case/")) return `/案例展示/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/downloads/")) return `/软件资料/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/download/")) return `/软件资料/${value.split("/").slice(2).join("/")}`;
  if (value.startsWith("/news/")) return `/新闻资讯/${value.split("/").slice(2).join("/")}`;

  return value;
}

function normalizeBannerButtonText(text, path) {
  const raw = (text || "").trim();
  const routeMap = {
    "/about": "关于我们",
    "/关于我们": "关于我们",
    "/products": "了解产品",
    "/产品中心": "产品中心",
    "/solution": "解决方案",
    "/solutions": "解决方案",
    "/解决方案": "解决方案",
    "/case": "查看案例",
    "/cases": "查看案例",
    "/案例展示": "查看案例",
    "/downloads": "下载资料",
    "/软件资料": "下载资料",
    "/news": "了解资讯",
    "/新闻资讯": "了解资讯",
    "/contact": "在线咨询",
    "/联系我们": "在线咨询",
  };

  if (!raw) return routeMap[normalizePublicLink(path, "/产品中心")] || "了解更多";
  if (routeMap[raw]) return routeMap[raw];
  if (raw.startsWith("/")) return routeMap[normalizePublicLink(raw, "/产品中心")] || "了解更多";
  return raw;
}

// 前台公开数据查询统一处理：JSON 字段转换为对象、隐藏内部字段
function publicItem(table, row) {
  const JSON_FIELDS = {
    products: ["images", "params", "docs"],
    solutions: ["images", "value_points", "related_products", "related_cases"],
    cases: ["images", "tags", "results", "related_products", "related_solutions"],
    downloads: ["files", "related_products"],
    articles: ["tags"],
    about_us: ["history", "honors", "team"],
    homepage_settings: ["capabilities", "partners"],
  };
  const fields = JSON_FIELDS[table] || [];
  const out = { ...row };
  for (const f of fields) out[f] = decodeJSON(row[f]);
  return out;
}

// ---------- 站点配置 ----------
router.get("/site", async (req, res) => {
  const rows = await db.prepare("SELECT `key`, `value` FROM settings").all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  ok(res, { ...config.site, ...settings });
});

// ---------- 首页聚合数据 ----------
router.get("/home", async (req, res) => {
  const banners = (await db.prepare("SELECT * FROM banners WHERE status = 1 ORDER BY sort ASC").all()).map((row) => ({
    ...row,
    link: normalizePublicLink(row.link, "/产品中心"),
    button_text: normalizeBannerButtonText(row.button_text, row.link),
  }));

  const capabilitiesRow = await db.prepare("SELECT * FROM homepage_settings LIMIT 1").get();
  const homepage = capabilitiesRow
    ? publicItem("homepage_settings", capabilitiesRow)
    : { capabilities: [], partners: [] };

  const products = (await db.prepare(
    `SELECT p.*, c.name AS category_name FROM products p
     JOIN product_categories c ON p.category_id = c.id
     WHERE p.status = 1 ORDER BY p.sort ASC LIMIT 4`
  ).all()).map((r) => publicItem("products", r));

  const solutions = (await db.prepare(
    "SELECT * FROM solutions WHERE status = 1 ORDER BY sort ASC LIMIT 3"
  ).all()).map((r) => publicItem("solutions", r));

  const cases = (await db.prepare(
    `SELECT c.*, cc.name AS category_name FROM cases c
     JOIN case_categories cc ON c.category_id = cc.id
     WHERE c.status = 1 ORDER BY c.sort ASC LIMIT 3`
  ).all()).map((r) => publicItem("cases", r));

  const articles = (await db.prepare(
    "SELECT * FROM articles WHERE status = 1 ORDER BY is_top DESC, publish_time DESC LIMIT 4"
  ).all()).map((r) => publicItem("articles", r));

  ok(res, {
    banners,
    capabilities: homepage.capabilities,
    partners: homepage.partners,
    products,
    solutions,
    cases,
    articles,
  });
});

// ---------- Banner ----------
router.get("/banners", async (req, res) => {
  const banners = (await db.prepare("SELECT * FROM banners WHERE status = 1 ORDER BY sort ASC").all()).map((row) => ({
    ...row,
    link: normalizePublicLink(row.link, "/产品中心"),
    button_text: normalizeBannerButtonText(row.button_text, row.link),
  }));
  ok(res, banners);
});

// ---------- 产品分类 ----------
router.get("/product-categories", async (req, res) => {
  ok(res, await db.prepare("SELECT * FROM product_categories WHERE status = 1 ORDER BY sort ASC").all());
});

// ---------- 产品列表 ----------
router.get("/products", async (req, res) => {
  const { page, size, offset } = paginate(req.query.page, req.query.size);
  const { category, keyword } = req.query;
  let sql = `SELECT p.*, c.name AS category_name FROM products p JOIN product_categories c ON p.category_id = c.id WHERE p.status = 1`;
  const conds = [];
  const params = [];
  if (category) {
    conds.push("p.category_id = ?");
    params.push(Number(category));
  }
  if (keyword) {
    conds.push("(p.name LIKE ? OR p.intro LIKE ? OR p.model LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (conds.length) sql += " AND " + conds.join(" AND ");
  const totalRow = await db.prepare(sql.replace(/SELECT p\.\*, c\.name AS category_name FROM/, "SELECT COUNT(*) AS c FROM")).get(...params);
  const total = totalRow ? Number(totalRow.c) : 0;
  sql += " ORDER BY p.sort ASC LIMIT ? OFFSET ?";
  const list = (await db.prepare(sql).all(...params, size, offset)).map((r) => publicItem("products", r));
  ok(res, paged(list, page, size, total));
});

// ---------- 产品详情 ----------
router.get("/products/:id", async (req, res) => {
  const p = await db.prepare(
    "SELECT p.*, c.name AS category_name FROM products p JOIN product_categories c ON p.category_id = c.id WHERE p.id = ? AND p.status = 1"
  ).get(Number(req.params.id));
  if (!p) return fail(res, 404, "产品不存在");
  const item = publicItem("products", p);
  const related = await db.prepare(
    "SELECT id, name, cover, intro, model FROM products WHERE category_id = ? AND id != ? AND status = 1 ORDER BY sort ASC LIMIT 4"
  ).all(p.category_id, p.id);
  ok(res, { ...item, related });
});

// ---------- 解决方案列表 ----------
router.get("/solutions", async (req, res) => {
  const list = (await db.prepare("SELECT * FROM solutions WHERE status = 1 ORDER BY sort ASC")
    .all()).map((r) => publicItem("solutions", r));
  ok(res, list);
});

// ---------- 解决方案详情 ----------
router.get("/solutions/:id", async (req, res) => {
  const s = await db.prepare("SELECT * FROM solutions WHERE id = ? AND status = 1").get(Number(req.params.id));
  if (!s) return fail(res, 404, "解决方案不存在");
  const item = publicItem("solutions", s);
  const other = (await db.prepare("SELECT id, name, intro, cover, industry FROM solutions WHERE id != ? AND status = 1 ORDER BY sort ASC LIMIT 3")
    .all(s.id)).map((r) => publicItem("solutions", r));
  ok(res, { ...item, other });
});

// ---------- 案例分类 ----------
router.get("/case-categories", async (req, res) => {
  ok(res, await db.prepare("SELECT * FROM case_categories ORDER BY sort ASC").all());
});

// ---------- 案例列表 ----------
router.get("/cases", async (req, res) => {
  const { page, size, offset } = paginate(req.query.page, req.query.size);
  const { category, keyword } = req.query;
  let sql = `SELECT c.*, cc.name AS category_name FROM cases c JOIN case_categories cc ON c.category_id = cc.id WHERE c.status = 1`;
  const conds = [];
  const params = [];
  if (category) {
    conds.push("c.category_id = ?");
    params.push(Number(category));
  }
  if (keyword) {
    conds.push("(c.name LIKE ? OR c.intro LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (conds.length) sql += " AND " + conds.join(" AND ");
  const totalRow = await db.prepare(sql.replace(/SELECT c\.\*, cc\.name AS category_name FROM/, "SELECT COUNT(*) AS c FROM")).get(...params);
  const total = totalRow ? Number(totalRow.c) : 0;
  sql += " ORDER BY c.sort ASC LIMIT ? OFFSET ?";
  const list = (await db.prepare(sql).all(...params, size, offset)).map((r) => publicItem("cases", r));
  ok(res, paged(list, page, size, total));
});

// ---------- 案例详情 ----------
router.get("/cases/:id", async (req, res) => {
  const c = await db.prepare(
    "SELECT c.*, cc.name AS category_name FROM cases c JOIN case_categories cc ON c.category_id = cc.id WHERE c.id = ? AND c.status = 1"
  ).get(Number(req.params.id));
  if (!c) return fail(res, 404, "案例不存在");
  ok(res, publicItem("cases", c));
});

// ---------- 下载分类 ----------
router.get("/download-categories", async (req, res) => {
  ok(res, await db.prepare("SELECT * FROM download_categories ORDER BY sort ASC").all());
});

// ---------- 下载列表 ----------
router.get("/downloads", async (req, res) => {
  const { page, size, offset } = paginate(req.query.page, req.query.size);
  const { category, keyword } = req.query;
  let sql = `SELECT d.*, dc.name AS category_name FROM downloads d JOIN download_categories dc ON d.category_id = dc.id WHERE d.status = 1`;
  const conds = [];
  const params = [];
  if (category) {
    conds.push("d.category_id = ?");
    params.push(Number(category));
  }
  if (keyword) {
    conds.push("(d.name LIKE ? OR d.intro LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (conds.length) sql += " AND " + conds.join(" AND ");
  const totalRow = await db.prepare(sql.replace(/SELECT d\.\*, dc\.name AS category_name FROM/, "SELECT COUNT(*) AS c FROM")).get(...params);
  const total = totalRow ? Number(totalRow.c) : 0;
  sql += " ORDER BY d.sort ASC, d.id DESC LIMIT ? OFFSET ?";
  const list = (await db.prepare(sql).all(...params, size, offset)).map((r) => publicItem("downloads", r));
  ok(res, paged(list, page, size, total));
});

// ---------- 下载详情 ----------
router.get("/downloads/:id", async (req, res) => {
  const d = await db.prepare(
    "SELECT d.*, dc.name AS category_name FROM downloads d JOIN download_categories dc ON d.category_id = dc.id WHERE d.id = ? AND d.status = 1"
  ).get(Number(req.params.id));
  if (!d) return fail(res, 404, "软件资料不存在");
  const item = publicItem("downloads", d);
  const related = (await db.prepare(
    "SELECT id, name, version, size, intro, icon FROM downloads WHERE id != ? AND status = 1 ORDER BY sort ASC LIMIT 4"
  ).all(d.id)).map((r) => publicItem("downloads", r));
  ok(res, { ...item, related });
});

// ---------- 下载计数 ----------
router.post("/downloads/:id/download", async (req, res) => {
  const result = await db.prepare("UPDATE downloads SET download_count = download_count + 1 WHERE id = ?").run(Number(req.params.id));
  if (result.changes === 0) return fail(res, 404, "软件资料不存在");
  ok(res, { success: true });
});

// ---------- 文章列表 ----------
router.get("/articles", async (req, res) => {
  const { page, size, offset } = paginate(req.query.page, req.query.size);
  const { category, keyword } = req.query;
  let sql = "SELECT * FROM articles WHERE status = 1";
  const conds = [];
  const params = [];
  if (category && category !== "all") {
    conds.push("category = ?");
    params.push(category);
  }
  if (keyword) {
    conds.push("(title LIKE ? OR summary LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (conds.length) sql += " AND " + conds.join(" AND ");
  const totalRow = await db.prepare(sql.replace("SELECT * FROM", "SELECT COUNT(*) AS c FROM")).get(...params);
  const total = totalRow ? Number(totalRow.c) : 0;
  sql += " ORDER BY is_top DESC, publish_time DESC, id DESC LIMIT ? OFFSET ?";
  const list = (await db.prepare(sql).all(...params, size, offset)).map((r) => publicItem("articles", r));
  ok(res, paged(list, page, size, total));
});

// ---------- 文章详情 ----------
router.get("/articles/:id", async (req, res) => {
  const a = await db.prepare("SELECT * FROM articles WHERE id = ? AND status = 1").get(Number(req.params.id));
  if (!a) return fail(res, 404, "文章不存在");
  await db.prepare("UPDATE articles SET views = views + 1 WHERE id = ?").run(a.id);
  const item = publicItem("articles", a);
  const prev = await db.prepare("SELECT id, title FROM articles WHERE status = 1 AND id < ? ORDER BY id DESC LIMIT 1").get(a.id);
  const next = await db.prepare("SELECT id, title FROM articles WHERE status = 1 AND id > ? ORDER BY id ASC LIMIT 1").get(a.id);
  const related = await db.prepare("SELECT id, title, cover, publish_time FROM articles WHERE status = 1 AND category = ? AND id != ? ORDER BY publish_time DESC LIMIT 3")
    .all(a.category, a.id);
  ok(res, { ...item, prev, next, related });
});

// ---------- 关于我们 ----------
router.get("/about", async (req, res) => {
  const a = await db.prepare("SELECT * FROM about_us LIMIT 1").get();
  if (!a) return ok(res, null);
  ok(res, publicItem("about_us", a));
});

// ---------- 联系我们 ----------
router.get("/contact", async (req, res) => {
  const rows = await db.prepare("SELECT `key`, `value` FROM settings").all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  ok(res, { ...config.site, ...settings });
});

// ---------- 提交留言 ----------
router.post("/messages", async (req, res) => {
  const { name, phone, email = "", subject = "", content = "" } = req.body || {};
  if (!name || !phone) return fail(res, 400, "请填写姓名与联系电话");
  if (!/^1[3-9]\d{9}$/.test(String(phone).replace(/\s/g, "")) && !/^\d{6,12}$/.test(String(phone).replace(/\s/g, ""))) {
    return fail(res, 400, "联系电话格式不正确");
  }
  if (subject && subject.length > 100) return fail(res, 400, "主题过长");
  if (content.length > 2000) return fail(res, 400, "留言内容过长");
  const result = await db.prepare(
    "INSERT INTO messages (name, phone, email, subject, content) VALUES (?, ?, ?, ?, ?)"
  ).run(String(name).slice(0, 50), String(phone), String(email).slice(0, 100), subject, content);
  ok(res, { id: result.lastInsertRowid }, "留言提交成功，我们将尽快与您联系");
});

// ---------- 访问统计上报 ----------
router.post("/visit", async (req, res) => {
  const { visitor_id, page_path, page_title } = req.body || {};
  if (!visitor_id || !page_path) return fail(res, 400, "缺少必填参数");
  const ip = getClientIp(req);
  const ua = (req.headers["user-agent"] || "").slice(0, 500);
  const region = resolveRegion(ip);
  await db.prepare(
    "INSERT INTO visit_logs (visitor_id, page_path, page_title, ip, region, user_agent) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(String(visitor_id), String(page_path), String(page_title || ""), ip, region, ua);
  ok(res, null, "ok");
});

// ---------- Sitemap 动态生成 ----------
router.get("/sitemap.xml", async (req, res) => {
  const baseUrl = config.site.url || "https://www.ynyzzn.com";
  const today = new Date().toISOString().split("T")[0];

  const staticPages = [
    { loc: "/", priority: "1.0", changefreq: "daily" },
    { loc: "/关于我们", priority: "0.8", changefreq: "monthly" },
    { loc: "/产品中心", priority: "0.9", changefreq: "weekly" },
    { loc: "/解决方案", priority: "0.9", changefreq: "weekly" },
    { loc: "/案例展示", priority: "0.8", changefreq: "weekly" },
    { loc: "/软件资料", priority: "0.7", changefreq: "weekly" },
    { loc: "/新闻资讯", priority: "0.8", changefreq: "daily" },
    { loc: "/联系我们", priority: "0.7", changefreq: "monthly" },
  ];

  let urls = "";

  for (const p of staticPages) {
    urls += `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  }

  try {
    const products = await db.prepare("SELECT id, updated_at FROM products WHERE status = 1 ORDER BY id").all();
    for (const p of products) {
      const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().split("T")[0] : today;
      urls += `  <url>\n    <loc>${baseUrl}/产品中心/${p.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    const solutions = await db.prepare("SELECT id, updated_at FROM solutions WHERE status = 1 ORDER BY id").all();
    for (const s of solutions) {
      const lastmod = s.updated_at ? new Date(s.updated_at).toISOString().split("T")[0] : today;
      urls += `  <url>\n    <loc>${baseUrl}/解决方案/${s.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }

    const cases = await db.prepare("SELECT id, updated_at FROM cases WHERE status = 1 ORDER BY id").all();
    for (const c of cases) {
      const lastmod = c.updated_at ? new Date(c.updated_at).toISOString().split("T")[0] : today;
      urls += `  <url>\n    <loc>${baseUrl}/案例展示/${c.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    const articles = await db.prepare("SELECT id, publish_time FROM articles WHERE status = 1 ORDER BY id").all();
    for (const a of articles) {
      const lastmod = a.publish_time ? new Date(a.publish_time).toISOString().split("T")[0] : today;
      urls += `  <url>\n    <loc>${baseUrl}/新闻资讯/${a.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
    }

    const downloads = await db.prepare("SELECT id, updated_at FROM downloads WHERE status = 1 ORDER BY id").all();
    for (const d of downloads) {
      const lastmod = d.updated_at ? new Date(d.updated_at).toISOString().split("T")[0] : today;
      urls += `  <url>\n    <loc>${baseUrl}/软件资料/${d.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    }
  } catch (err) {
    console.error("[sitemap] 数据库查询失败:", err.message);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

export default router;