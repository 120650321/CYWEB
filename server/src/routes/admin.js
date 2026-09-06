import { Router } from "express";
import { db } from "../db.js";
import { authRequired, roleRequired, signToken, verifyPassword, hashPassword } from "../auth.js";
import { ok, fail, paginate, paged, decodeJSON, getClientIp, resolveRegion } from "../utils.js";

const router = Router();

// ================= 认证 =================
router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return fail(res, 400, "请输入用户名和密码");
  const user = await db.prepare("SELECT * FROM users WHERE username = ?").get(String(username));
  if (!user || !verifyPassword(password, user.password_hash)) {
    await db.prepare("INSERT INTO operation_logs (username, action, detail, ip) VALUES (?, ?, ?, ?)")
      .run(String(username), "登录失败", `用户 ${username} 登录失败`, getClientIp(req));
    return fail(res, 401, "用户名或密码错误");
  }
  if (user.status !== 1) return fail(res, 403, "账号已被禁用，请联系管理员");
  await db.prepare("UPDATE users SET last_login_at = NOW() WHERE id = ?").run(user.id);
  await db.prepare("INSERT INTO operation_logs (user_id, username, action, detail, ip) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.username, "登录", "登录后台管理系统", getClientIp(req));
  const token = signToken(user);
  ok(res, {
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role, phone: user.phone, email: user.email },
    must_change_password: user.must_change_password === 1,
  });
});

// 除登录外的所有后台接口均需认证
router.use(authRequired);

router.get("/auth/profile", (req, res) => {
  ok(res, { id: req.user.id, username: req.user.username, name: req.user.name, role: req.user.role, phone: req.user.phone, email: req.user.email });
});

router.put("/auth/password", async (req, res) => {
  const { old_password, new_password } = req.body || {};
  if (!old_password || !new_password) return fail(res, 400, "请填写原密码与新密码");
  if (String(new_password).length < 6) return fail(res, 400, "新密码长度不能少于 6 位");
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  if (!verifyPassword(old_password, user.password_hash)) return fail(res, 400, "原密码不正确");
  await db.prepare("UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?").run(hashPassword(new_password), user.id);
  await db.prepare("INSERT INTO operation_logs (user_id, username, action, detail, ip) VALUES (?, ?, ?, ?, ?)")
    .run(user.id, user.username, "修改密码", "修改登录密码", getClientIp(req));
  ok(res, null, "密码修改成功");
});

// ================= 工具 =================
async function log(req, action, detail) {
  await db.prepare("INSERT INTO operation_logs (user_id, username, action, detail, ip) VALUES (?, ?, ?, ?, ?)")
    .run(req.user.id, req.user.username, action, detail, getClientIp(req));
}

function crudRoutes(path, table, options = {}) {
  const { jsonFields = [], listFields = "*", listJoin = "", listWhere = "", orderBy = "sort ASC, id DESC", searchFields = [] } = options;
  const listSql = `SELECT ${listFields} FROM ${table} ${listJoin} WHERE 1=1 ${listWhere}`;

  // 列表
  router.get(path, async (req, res) => {
    const { page, size, offset } = paginate(req.query.page, req.query.size);
    const { keyword, status, category } = req.query;
    const conds = [];
    const params = [];
    if (status !== undefined && status !== "") {
      conds.push(`${table}.status = ?`);
      params.push(Number(status));
    }
    if (category !== undefined && category !== "") {
      const col = options.categoryColumn || "category_id";
      conds.push(`${table}.${col} = ?`);
      params.push(Number(category));
    }
    if (keyword && searchFields.length) {
      conds.push("(" + searchFields.map((f) => `${table}.${f} LIKE ?`).join(" OR ") + ")");
      searchFields.forEach(() => params.push(`%${keyword}%`));
    }
    const where = conds.length ? " AND " + conds.join(" AND ") : "";
    const totalRow = await db.prepare(`SELECT COUNT(*) AS c FROM ${table} ${listJoin} WHERE 1=1 ${listWhere}${where}`).get(...params);
    const total = totalRow ? Number(totalRow.c) : 0;
    const list = (await db.prepare(`${listSql}${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
      .all(...params, size, offset)).map((r) => {
        const o = { ...r };
        for (const f of jsonFields) o[f] = decodeJSON(r[f]);
        return o;
      });
    ok(res, paged(list, page, size, total));
  });

  // 全部（不分页，用于下拉选择）
  router.get(`${path}/all`, async (req, res) => {
    const list = (await db.prepare(`${listSql} ORDER BY ${orderBy}`).all()).map((r) => {
      const o = { ...r };
      for (const f of jsonFields) o[f] = decodeJSON(r[f]);
      return o;
    });
    ok(res, list);
  });

  // 详情
  router.get(`${path}/:id`, async (req, res) => {
    const row = await db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(req.params.id));
    if (!row) return fail(res, 404, "数据不存在");
    const o = { ...row };
    for (const f of jsonFields) o[f] = decodeJSON(row[f]);
    ok(res, o);
  });

  // 新增
  router.post(path, async (req, res) => {
    const body = { ...req.body };
    const allowed = options.allowedFields || [];
    const data = {};
    for (const k of Object.keys(body)) {
      if (jsonFields.includes(k)) data[k] = JSON.stringify(body[k] ?? []);
      else if (allowed.includes(k)) data[k] = body[k];
    }
    if (options.required) {
      for (const f of options.required) {
        if (data[f] === undefined || data[f] === "") return fail(res, 400, `请填写必填字段：${f}`);
      }
    }
    const keys = Object.keys(data);
    if (!keys.length) return fail(res, 400, "没有可保存的字段");
    const marks = keys.map(() => "?").join(",");
    const result = await db.prepare(`INSERT INTO ${table} (${keys.join(",")}) VALUES (${marks})`).run(...Object.values(data));
    await log(req, `新增${options.label || table}`, `ID=${result.lastInsertRowid}`);
    ok(res, { id: result.lastInsertRowid }, "新增成功");
  });

  // 更新
  router.put(`${path}/:id`, async (req, res) => {
    const id = Number(req.params.id);
    const exist = await db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id);
    if (!exist) return fail(res, 404, "数据不存在");
    const body = { ...req.body };
    const allowed = options.allowedFields || [];
    const data = {};
    for (const k of Object.keys(body)) {
      if (jsonFields.includes(k)) data[k] = JSON.stringify(body[k] ?? []);
      else if (allowed.includes(k)) data[k] = body[k];
    }
    if (Object.keys(data).length) {
      const sets = Object.keys(data).map((k) => `${k} = ?`).join(",");
      await db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...Object.values(data), id);
    }
    await log(req, `更新${options.label || table}`, `ID=${id}`);
    ok(res, null, "更新成功");
  });

  // 删除
  router.delete(`${path}/:id`, async (req, res) => {
    const id = Number(req.params.id);
    await db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    await log(req, `删除${options.label || table}`, `ID=${id}`);
    ok(res, null, "删除成功");
  });

  // 状态切换
  router.put(`${path}/:id/status`, async (req, res) => {
    const id = Number(req.params.id);
    const status = Number(req.body?.status ?? 1);
    await db.prepare(`UPDATE ${table} SET status = ? WHERE id = ?`).run(status, id);
    await log(req, `更新${options.label || table}状态`, `ID=${id} -> ${status}`);
    ok(res, null, "状态更新成功");
  });

  // 排序
  router.put(`${path}/:id/sort`, async (req, res) => {
    const id = Number(req.params.id);
    const sort = Number(req.body?.sort ?? 0);
    await db.prepare(`UPDATE ${table} SET sort = ? WHERE id = ?`).run(sort, id);
    ok(res, null, "排序更新成功");
  });
}

// ================= 仪表盘 =================
router.get("/dashboard/stats", async (req, res) => {
  const count = async (t, w = "", params = []) => {
    const r = await db.prepare(`SELECT COUNT(*) AS c FROM ${t} ${w}`).get(...params);
    return r ? Number(r.c) : 0;
  };
  const sum = async (sql, ...params) => {
    const r = await db.prepare(sql).get(...params);
    return r ? Number(r.c) : 0;
  };
  const today = new Date().toISOString().slice(0, 10);
  const data = {
    userCount: await count("users", "WHERE status = 1"),
    productCount: await count("products"),
    caseCount: await count("cases"),
    articleCount: await count("articles"),
    downloadCount: await count("downloads"),
    messageTotal: await count("messages"),
    messagePending: await count("messages", "WHERE status = ?", ["pending"]),
    messageToday: await count("messages", "WHERE DATE(created_at) = ?", [today]),
    totalDownloads: await sum("SELECT COALESCE(SUM(download_count),0) AS c FROM downloads"),
    totalViews: await sum("SELECT COALESCE(SUM(views),0) AS c FROM articles"),
    productCategories: await count("product_categories"),
    solutionCount: await count("solutions"),
    bannerCount: await count("banners"),
    downloadCategories: await count("download_categories"),
  };
  ok(res, data);
});

// 趋势（近7天文章浏览量 + 留言量）
router.get("/dashboard/trends", async (req, res) => {
  const days = 7;
  const labels = [];
  const startDate = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }

  const viewRows = await db.prepare(
    "SELECT DATE(created_at) AS dt, COALESCE(SUM(views), 0) AS c FROM articles WHERE DATE(created_at) >= ? GROUP BY DATE(created_at)"
  ).all(startDate);
  const viewMap = Object.fromEntries(viewRows.map((r) => [r.dt, Number(r.c)]));

  const msgRows = await db.prepare(
    "SELECT DATE(created_at) AS dt, COUNT(*) AS c FROM messages WHERE DATE(created_at) >= ? GROUP BY DATE(created_at)"
  ).all(startDate);
  const msgMap = Object.fromEntries(msgRows.map((r) => [r.dt, Number(r.c)]));

  const views = [];
  const messages = [];
  for (let i = days - 1; i >= 0; i--) {
    const ds = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    views.push(viewMap[ds] || 0);
    messages.push(msgMap[ds] || 0);
  }

  ok(res, { labels, views, messages });
});

// 下载量 TOP5
router.get("/dashboard/top-downloads", async (req, res) => {
  const list = await db.prepare("SELECT id, name, download_count FROM downloads ORDER BY download_count DESC LIMIT 5").all();
  ok(res, list);
});

// 最新留言
router.get("/dashboard/latest-messages", async (req, res) => {
  const list = await db.prepare("SELECT id, name, phone, subject, status, created_at FROM messages ORDER BY id DESC LIMIT 6").all();
  ok(res, list);
});

// ================= 各模块 CRUD =================
crudRoutes("/banners", "banners", {
  label: "Banner",
  listFields: "banners.*",
  orderBy: "sort ASC, id DESC",
  searchFields: ["title", "subtitle"],
  allowedFields: ["title", "subtitle", "slogan", "image", "bg_color", "link", "button_text", "sort", "status"],
});

crudRoutes("/product-categories", "product_categories", {
  label: "产品分类",
  orderBy: "sort ASC, id DESC",
  searchFields: ["name"],
  allowedFields: ["name", "icon", "description", "sort", "status"],
});

crudRoutes("/products", "products", {
  label: "产品",
  jsonFields: ["images", "params", "docs"],
  listFields: "products.*, product_categories.name AS category_name",
  listJoin: "JOIN product_categories ON products.category_id = product_categories.id",
  searchFields: ["name", "model"],
  categoryColumn: "category_id",
  allowedFields: ["category_id", "name", "model", "cover", "images", "intro", "detail", "params", "docs", "status", "sort", "seo_title", "seo_keywords", "seo_description"],
});

crudRoutes("/solutions", "solutions", {
  label: "解决方案",
  jsonFields: ["images", "value_points", "related_products", "related_cases"],
  listFields: "solutions.*",
  searchFields: ["name", "industry"],
  allowedFields: ["name", "industry", "cover", "images", "intro", "detail", "scenario", "architecture", "value_points", "related_products", "related_cases", "status", "sort", "seo_title", "seo_keywords", "seo_description"],
});

crudRoutes("/case-categories", "case_categories", {
  label: "案例分类",
  orderBy: "sort ASC, id DESC",
  searchFields: ["name"],
  allowedFields: ["name", "sort"],
});

crudRoutes("/cases", "cases", {
  label: "案例",
  jsonFields: ["images", "tags", "results", "related_products", "related_solutions"],
  listFields: "cases.*, case_categories.name AS category_name",
  listJoin: "JOIN case_categories ON cases.category_id = case_categories.id",
  searchFields: ["name"],
  categoryColumn: "category_id",
  allowedFields: ["category_id", "name", "cover", "images", "intro", "detail", "tags", "results", "related_products", "related_solutions", "status", "sort", "seo_title", "seo_keywords", "seo_description"],
});

crudRoutes("/download-categories", "download_categories", {
  label: "下载分类",
  orderBy: "sort ASC, id DESC",
  searchFields: ["name"],
  allowedFields: ["name", "sort"],
});

crudRoutes("/downloads", "downloads", {
  label: "软件资料",
  jsonFields: ["files", "related_products"],
  listFields: "downloads.*, download_categories.name AS category_name",
  listJoin: "JOIN download_categories ON downloads.category_id = download_categories.id",
  searchFields: ["name"],
  categoryColumn: "category_id",
  allowedFields: ["category_id", "name", "icon", "intro", "detail", "version", "files", "size", "update_log", "system_require", "related_products", "status", "sort", "seo_title", "seo_keywords", "seo_description"],
});

// 下载详情（含文件解析）
router.get("/downloads-admin/:id", async (req, res) => {
  const row = await db.prepare("SELECT * FROM downloads WHERE id = ?").get(Number(req.params.id));
  if (!row) return fail(res, 404, "数据不存在");
  ok(res, { ...row, files: decodeJSON(row.files), related_products: decodeJSON(row.related_products) });
});

// 重置下载次数
router.put("/downloads/:id/reset-count", async (req, res) => {
  await db.prepare("UPDATE downloads SET download_count = 0 WHERE id = ?").run(Number(req.params.id));
  await log(req, "重置下载量", `ID=${req.params.id}`);
  ok(res, null, "下载次数已清零");
});

crudRoutes("/articles", "articles", {
  label: "文章",
  jsonFields: ["tags"],
  listFields: "articles.*",
  orderBy: "is_top DESC, publish_time DESC, id DESC",
  searchFields: ["title", "summary"],
  categoryColumn: "category",
  allowedFields: ["category", "title", "cover", "summary", "content", "tags", "author", "views", "is_top", "status", "publish_time"],
});

// ================= 留言管理 =================
router.get("/messages", async (req, res) => {
  const { page, size, offset } = paginate(req.query.page, req.query.size);
  const { status, keyword } = req.query;
  let sql = "SELECT * FROM messages WHERE 1=1";
  const conds = [];
  const params = [];
  if (status && status !== "all") {
    conds.push("status = ?");
    params.push(status);
  }
  if (keyword) {
    conds.push("(name LIKE ? OR phone LIKE ? OR subject LIKE ? OR content LIKE ?)");
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  if (conds.length) sql += " AND " + conds.join(" AND ");
  const totalRow = await db.prepare(sql.replace("SELECT * FROM", "SELECT COUNT(*) AS c FROM")).get(...params);
  const total = totalRow ? Number(totalRow.c) : 0;
  sql += " ORDER BY id DESC LIMIT ? OFFSET ?";
  const list = await db.prepare(sql).all(...params, size, offset);
  ok(res, paged(list, page, size, total));
});

router.get("/messages/:id", async (req, res) => {
  const row = await db.prepare("SELECT * FROM messages WHERE id = ?").get(Number(req.params.id));
  if (!row) return fail(res, 404, "留言不存在");
  ok(res, row);
});

router.put("/messages/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["pending", "processing", "done"].includes(status)) return fail(res, 400, "状态不合法");
  await db.prepare("UPDATE messages SET status = ? WHERE id = ?").run(status, Number(req.params.id));
  await log(req, "更新留言状态", `ID=${req.params.id} -> ${status}`);
  ok(res, null, "状态更新成功");
});

router.put("/messages/:id/reply", async (req, res) => {
  const { reply } = req.body || {};
  await db.prepare("UPDATE messages SET reply = ?, replied_at = NOW(), status = 'done' WHERE id = ?")
    .run(String(reply || ""), Number(req.params.id));
  await log(req, "回复留言", `ID=${req.params.id}`);
  ok(res, null, "回复成功");
});

router.delete("/messages/:id", async (req, res) => {
  await db.prepare("DELETE FROM messages WHERE id = ?").run(Number(req.params.id));
  await log(req, "删除留言", `ID=${req.params.id}`);
  ok(res, null, "删除成功");
});

// ================= 用户管理 =================
router.get("/users", roleRequired("superadmin"), async (req, res) => {
  const list = await db.prepare("SELECT id, username, name, role, phone, email, status, last_login_at, created_at FROM users ORDER BY id ASC").all();
  ok(res, list);
});

router.post("/users", roleRequired("superadmin"), async (req, res) => {
  const { username, name, role, phone, email, password } = req.body || {};
  if (!username || !password) return fail(res, 400, "请填写用户名与初始密码");
  if (String(password).length < 6) return fail(res, 400, "密码长度不能少于 6 位");
  const exist = await db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (exist) return fail(res, 400, "用户名已存在");
  const result = await db.prepare(
    "INSERT INTO users (username, password_hash, name, role, phone, email) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(username, hashPassword(password), name || username, role || "editor", phone || "", email || "");
  await log(req, "新增用户", `ID=${result.lastInsertRowid} ${username}`);
  ok(res, { id: result.lastInsertRowid }, "新增成功");
});

router.put("/users/:id", roleRequired("superadmin"), async (req, res) => {
  const id = Number(req.params.id);
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  if (!user) return fail(res, 404, "用户不存在");
  const { name, role, phone, email, status, password } = req.body || {};
  const data = { name, role, phone, email, status };
  if (password) {
    if (String(password).length < 6) return fail(res, 400, "密码长度不能少于 6 位");
    data.password_hash = hashPassword(password);
  }
  const keys = Object.keys(data);
  await db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(",")} WHERE id = ?`).run(...Object.values(data), id);
  await log(req, "更新用户", `ID=${id}`);
  ok(res, null, "更新成功");
});

router.delete("/users/:id", roleRequired("superadmin"), async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return fail(res, 400, "不能删除当前登录账号");
  await db.prepare("DELETE FROM users WHERE id = ?").run(id);
  await log(req, "删除用户", `ID=${id}`);
  ok(res, null, "删除成功");
});

// ================= 角色管理 =================
router.get("/roles", roleRequired("superadmin"), async (req, res) => {
  const list = (await db.prepare("SELECT * FROM roles ORDER BY id ASC").all())
    .map((r) => ({ ...r, permissions: decodeJSON(r.permissions) }));
  ok(res, list);
});

router.post("/roles", roleRequired("superadmin"), async (req, res) => {
  const { name, code, description, permissions } = req.body || {};
  if (!name || !code) return fail(res, 400, "请填写角色名称与标识");
  const exist = await db.prepare("SELECT id FROM roles WHERE code = ?").get(code);
  if (exist) return fail(res, 400, "角色标识已存在");
  const result = await db.prepare("INSERT INTO roles (name, code, description, permissions) VALUES (?, ?, ?, ?)")
    .run(name, code, description || "", JSON.stringify(permissions || []));
  await log(req, "新增角色", `ID=${result.lastInsertRowid} ${name}`);
  ok(res, { id: result.lastInsertRowid }, "新增成功");
});

router.put("/roles/:id", roleRequired("superadmin"), async (req, res) => {
  const { name, description, permissions } = req.body || {};
  await db.prepare("UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?")
    .run(name, description || "", JSON.stringify(permissions || []), Number(req.params.id));
  await log(req, "更新角色", `ID=${req.params.id}`);
  ok(res, null, "更新成功");
});

router.delete("/roles/:id", roleRequired("superadmin"), async (req, res) => {
  await db.prepare("DELETE FROM roles WHERE id = ?").run(Number(req.params.id));
  await log(req, "删除角色", `ID=${req.params.id}`);
  ok(res, null, "删除成功");
});

// ================= 系统设置 =================
router.get("/settings", roleRequired("superadmin"), async (req, res) => {
  const rows = await db.prepare("SELECT `key`, `value` FROM settings").all();
  ok(res, Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

router.put("/settings", roleRequired("superadmin"), async (req, res) => {
  const body = req.body || {};
  for (const [k, v] of Object.entries(body)) {
    await db.prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)")
      .run(k, String(v ?? ""));
  }
  await log(req, "更新系统设置", `共 ${Object.keys(body).length} 项`);
  ok(res, null, "设置保存成功");
});

// 关于我们
router.get("/about", async (req, res) => {
  const a = await db.prepare("SELECT * FROM about_us LIMIT 1").get();
  ok(res, a ? { ...a, history: decodeJSON(a.history), honors: decodeJSON(a.honors), team: decodeJSON(a.team) } : null);
});

router.put("/about", async (req, res) => {
  const { title, intro, content, history, honors, team } = req.body || {};
  const exist = await db.prepare("SELECT id FROM about_us LIMIT 1").get();
  const data = {
    title: title ?? "关于我们",
    intro: intro ?? "",
    content: content ?? "",
    history: JSON.stringify(history || []),
    honors: JSON.stringify(honors || []),
    team: JSON.stringify(team || []),
    updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
  };
  if (exist) {
    await db.prepare(`UPDATE about_us SET ${Object.keys(data).map((k) => `${k} = ?`).join(",")} WHERE id = ?`)
      .run(...Object.values(data), exist.id);
  } else {
    await db.prepare(`INSERT INTO about_us (${Object.keys(data).join(",")}) VALUES (${Object.keys(data).map(() => "?").join(",")})`)
      .run(...Object.values(data));
  }
  await log(req, "更新关于我们", "");
  ok(res, null, "保存成功");
});

// 首页设置
router.get("/homepage", async (req, res) => {
  const h = await db.prepare("SELECT * FROM homepage_settings LIMIT 1").get();
  ok(res, h ? { ...h, capabilities: decodeJSON(h.capabilities), partners: decodeJSON(h.partners) } : null);
});

router.put("/homepage", async (req, res) => {
  const { capability_title, capability_desc, capabilities, partners, contact_banner_title, contact_banner_desc } = req.body || {};
  const exist = await db.prepare("SELECT id FROM homepage_settings LIMIT 1").get();
  const data = {
    capability_title: capability_title ?? "核心能力",
    capability_desc: capability_desc ?? "",
    capabilities: JSON.stringify(capabilities || []),
    partners: JSON.stringify(partners || []),
    contact_banner_title: contact_banner_title ?? "",
    contact_banner_desc: contact_banner_desc ?? "",
    updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
  };
  if (exist) {
    await db.prepare(`UPDATE homepage_settings SET ${Object.keys(data).map((k) => `${k} = ?`).join(",")} WHERE id = ?`)
      .run(...Object.values(data), exist.id);
  } else {
    await db.prepare(`INSERT INTO homepage_settings (${Object.keys(data).join(",")}) VALUES (${Object.keys(data).map(() => "?").join(",")})`)
      .run(...Object.values(data));
  }
  await log(req, "更新首页设置", "");
  ok(res, null, "保存成功");
});

// ================= 操作日志 =================
router.get("/logs", roleRequired("superadmin"), async (req, res) => {
  const { page, size, offset } = paginate(req.query.page, req.query.size);
  const { keyword } = req.query;
  let sql = "SELECT * FROM operation_logs WHERE 1=1";
  const params = [];
  if (keyword) {
    sql += " AND (username LIKE ? OR action LIKE ? OR detail LIKE ?)";
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const totalRow = await db.prepare(sql.replace("SELECT * FROM", "SELECT COUNT(*) AS c FROM")).get(...params);
  const total = totalRow ? Number(totalRow.c) : 0;
  sql += " ORDER BY id DESC LIMIT ? OFFSET ?";
  const list = await db.prepare(sql).all(...params, size, offset);
  ok(res, paged(list, page, size, total));
});

// ================= 访问统计 =================
// ================= 访问统计 =================

function buildDateFilter(startDate, endDate) {
  const conds = [];
  const params = [];
  if (startDate) {
    conds.push("created_at >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conds.push("created_at <= ?");
    params.push(endDate + " 23:59:59");
  }
  return { conds, params };
}

router.get("/visits/stats", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const day7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const day30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const cnt = async (sql, ...params) => {
    const r = await db.prepare(sql).get(...params);
    return r ? Number(r.c) : 0;
  };

  const totalPV = await cnt("SELECT COUNT(*) AS c FROM visit_logs");
  const totalUV = await cnt("SELECT COUNT(DISTINCT visitor_id) AS c FROM visit_logs");
  const todayPV = await cnt("SELECT COUNT(*) AS c FROM visit_logs WHERE DATE(created_at) = ?", today);
  const todayUV = await cnt("SELECT COUNT(DISTINCT visitor_id) AS c FROM visit_logs WHERE DATE(created_at) = ?", today);
  const yesterdayPV = await cnt("SELECT COUNT(*) AS c FROM visit_logs WHERE DATE(created_at) = ?", yesterday);
  const yesterdayUV = await cnt("SELECT COUNT(DISTINCT visitor_id) AS c FROM visit_logs WHERE DATE(created_at) = ?", yesterday);
  const weekPV = await cnt("SELECT COUNT(*) AS c FROM visit_logs WHERE DATE(created_at) >= ?", day7);
  const weekUV = await cnt("SELECT COUNT(DISTINCT visitor_id) AS c FROM visit_logs WHERE DATE(created_at) >= ?", day7);
  const monthPV = await cnt("SELECT COUNT(*) AS c FROM visit_logs WHERE DATE(created_at) >= ?", day30);
  const monthUV = await cnt("SELECT COUNT(DISTINCT visitor_id) AS c FROM visit_logs WHERE DATE(created_at) >= ?", day30);

  ok(res, {
    totalPV, totalUV,
    todayPV, todayUV,
    yesterdayPV, yesterdayUV,
    weekPV, weekUV,
    monthPV, monthUV,
  });
});

router.get("/visits/trends", async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 7));
  const { start_date, end_date } = req.query;
  const labels = [];
  const pvSeries = [];
  const uvSeries = [];
  const hours = [];
  const hourPV = [];
  const hourUV = [];

  let dateStart, dateEnd;
  if (start_date && end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffDays = Math.ceil((end - start) / 86400000) + 1;
    const actualDays = Math.min(diffDays, 90);
    dateStart = start.toISOString().slice(0, 10);
    dateEnd = end.toISOString().slice(0, 10);
    for (let i = actualDays - 1; i >= 0; i--) {
      const d = new Date(start.getTime() + i * 86400000);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
  } else {
    dateStart = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    }
  }

  const pvRows = await db.prepare(
    "SELECT DATE(created_at) AS dt, COUNT(*) AS c FROM visit_logs WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? GROUP BY DATE(created_at)"
  ).all(dateStart, dateEnd || dateStart);
  const pvMap = Object.fromEntries(pvRows.map((r) => [r.dt, Number(r.c)]));

  const uvRows = await db.prepare(
    "SELECT DATE(created_at) AS dt, COUNT(DISTINCT visitor_id) AS c FROM visit_logs WHERE DATE(created_at) >= ? AND DATE(created_at) <= ? GROUP BY DATE(created_at)"
  ).all(dateStart, dateEnd || dateStart);
  const uvMap = Object.fromEntries(uvRows.map((r) => [r.dt, Number(r.c)]));

  for (let i = labels.length - 1; i >= 0; i--) {
    const refDate = start_date && end_date
      ? new Date(new Date(start_date).getTime() + (labels.length - 1 - i) * 86400000)
      : new Date(Date.now() - (days - 1 - i) * 86400000);
    const ds = refDate.toISOString().slice(0, 10);
    pvSeries.push(pvMap[ds] || 0);
    uvSeries.push(uvMap[ds] || 0);
  }

  const today = new Date().toISOString().slice(0, 10);
  const hourRows = await db.prepare(
    "SELECT HOUR(created_at) AS h, COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv FROM visit_logs WHERE DATE(created_at) = ? GROUP BY HOUR(created_at)"
  ).all(today);
  const hourPvMap = Object.fromEntries(hourRows.map((r) => [Number(r.h), Number(r.pv)]));
  const hourUvMap = Object.fromEntries(hourRows.map((r) => [Number(r.h), Number(r.uv)]));

  for (let h = 0; h < 24; h++) {
    hours.push(`${String(h).padStart(2, "0")}:00`);
    hourPV.push(hourPvMap[h] || 0);
    hourUV.push(hourUvMap[h] || 0);
  }

  ok(res, { labels, pvSeries, uvSeries, hours, hourPV, hourUV });
});

router.get("/visits/pages", async (req, res) => {
  const { start_date, end_date } = req.query;
  const { conds, params } = buildDateFilter(start_date, end_date);
  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const list = await db.prepare(
    `SELECT page_path, page_title, COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv FROM visit_logs ${where} GROUP BY page_path, page_title ORDER BY pv DESC LIMIT 20`
  ).all(...params);
  ok(res, list.map((r) => ({ ...r, pv: Number(r.pv), uv: Number(r.uv) })));
});

router.get("/visits/regions", async (req, res) => {
  const { start_date, end_date } = req.query;
  const { conds, params } = buildDateFilter(start_date, end_date);
  const where = conds.length ? "WHERE " + conds.join(" AND ") : "";
  const list = await db.prepare(
    `SELECT region, COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv FROM visit_logs ${where} GROUP BY region ORDER BY pv DESC`
  ).all(...params);
  ok(res, list.map((r) => ({ ...r, pv: Number(r.pv), uv: Number(r.uv) })));
});

router.get("/visits/logs", async (req, res) => {
  const { page, size, offset } = paginate(req.query.page, req.query.size);
  const { keyword, start_date, end_date } = req.query;
  let sql = "SELECT * FROM visit_logs WHERE 1=1";
  const params = [];
  if (start_date) {
    sql += " AND created_at >= ?";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND created_at <= ?";
    params.push(end_date + " 23:59:59");
  }
  if (keyword) {
    sql += " AND (page_path LIKE ? OR page_title LIKE ? OR visitor_id LIKE ? OR ip LIKE ? OR region LIKE ?)";
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  const totalRow = await db.prepare(sql.replace("SELECT * FROM", "SELECT COUNT(*) AS c FROM")).get(...params);
  const total = totalRow ? Number(totalRow.c) : 0;
  sql += " ORDER BY id DESC LIMIT ? OFFSET ?";
  const list = await db.prepare(sql).all(...params, size, offset);
  ok(res, paged(list, page, size, total));
});

router.delete("/visits/clear", roleRequired("superadmin"), async (req, res) => {
  await db.prepare("DELETE FROM visit_logs").run();
  await log(req, "清空访问统计", "已清空全部访问日志");
  ok(res, null, "访问日志已清空");
});

router.delete("/visits/clear-by-date", roleRequired("superadmin"), async (req, res) => {
  const { start_date, end_date } = req.body || {};
  let sql = "DELETE FROM visit_logs WHERE 1=1";
  const params = [];
  if (start_date) {
    sql += " AND created_at >= ?";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND created_at <= ?";
    params.push(end_date + " 23:59:59");
  }
  if (!start_date && !end_date) {
    return fail(res, 400, "请指定清理时段");
  }
  const result = await db.prepare(sql).run(...params);
  await log(req, "清理访问统计", `已清理 ${start_date || "之前"} 至 ${end_date || "之后"} 的访问日志，共 ${result.changes} 条`);
  ok(res, { deleted: result.changes }, `已清理 ${result.changes} 条访问日志`);
});

// 刷新历史访问记录的区域数据（重新解析IP）
router.put("/visits/refresh-regions", roleRequired("superadmin"), async (req, res) => {
  const { start_date, end_date } = req.body || {};
  let sql = "SELECT id, ip FROM visit_logs WHERE region = ?";
  const params = ["中国"];
  if (start_date) {
    sql += " AND created_at >= ?";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND created_at <= ?";
    params.push(end_date + " 23:59:59");
  }
  sql += " LIMIT 5000";

  const rows = await db.prepare(sql).all(...params);
  let updated = 0;
  const updateStmt = db.prepare("UPDATE visit_logs SET region = ? WHERE id = ?");

  for (const row of rows) {
    const newRegion = resolveRegion(row.ip);
    if (newRegion && newRegion !== row.region) {
      updateStmt.run(newRegion, row.id);
      updated++;
    }
  }

  await log(req, "刷新访问区域", `重新解析了 ${rows.length} 条记录，更新了 ${updated} 条`);
  ok(res, { total: rows.length, updated }, `已扫描 ${rows.length} 条记录，更新了 ${updated} 条区域数据`);
});

router.get("/visits/export-excel", async (req, res) => {
  const { start_date, end_date, keyword } = req.query;
  let sql = "SELECT id, visitor_id, page_path, page_title, ip, region, user_agent, created_at FROM visit_logs WHERE 1=1";
  const params = [];
  if (start_date) {
    sql += " AND created_at >= ?";
    params.push(start_date);
  }
  if (end_date) {
    sql += " AND created_at <= ?";
    params.push(end_date + " 23:59:59");
  }
  if (keyword) {
    sql += " AND (page_path LIKE ? OR page_title LIKE ? OR visitor_id LIKE ? OR ip LIKE ? OR region LIKE ?)";
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }
  sql += " ORDER BY id DESC";
  const list = await db.prepare(sql).all(...params);

  const headers = ["ID", "访客标识", "页面路径", "页面标题", "IP地址", "访问区域", "User-Agent", "访问时间"];
  const keys = ["id", "visitor_id", "page_path", "page_title", "ip", "region", "user_agent", "created_at"];

  const BOM = "\uFEFF";
  let csv = BOM + headers.join(",") + "\n";
  for (const row of list) {
    csv += keys.map((k) => {
      const v = String(row[k] ?? "").replace(/"/g, '""');
      return `"${v}"`;
    }).join(",") + "\n";
  }

  const filename = `visit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(csv);
});
export default router;