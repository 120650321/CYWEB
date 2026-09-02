// 后端 API 冒烟测试脚本
import http from "node:http";

const BASE = "http://localhost:3000";

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const u = new URL(BASE + path);
    const r = http.request(
      u,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      }
    );
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}

const results = [];
async function check(name, fn) {
  try {
    const r = await fn();
    const okFlag = r.status === 200 && r.body?.code === 0;
    results.push(`${okFlag ? "✅" : "❌"} ${name} [${r.status}] ${JSON.stringify(r.body?.message || r.body?.code || r.body).slice(0, 80)}`);
  } catch (e) {
    results.push(`❌ ${name} ERROR: ${e.message}`);
  }
}

// 前台公开接口
await check("GET /api/health", () => req("GET", "/api/health"));
await check("GET /api/public/site", () => req("GET", "/api/public/site"));
await check("GET /api/public/home", () => req("GET", "/api/public/home"));
await check("GET /api/public/banners", () => req("GET", "/api/public/banners"));
await check("GET /api/public/product-categories", () => req("GET", "/api/public/product-categories"));
await check("GET /api/public/products", () => req("GET", "/api/public/products?page=1&size=5"));
await check("GET /api/public/products/:id=1", () => req("GET", "/api/public/products/1"));
await check("GET /api/public/solutions", () => req("GET", "/api/public/solutions"));
await check("GET /api/public/solutions/:id=1", () => req("GET", "/api/public/solutions/1"));
await check("GET /api/public/case-categories", () => req("GET", "/api/public/case-categories"));
await check("GET /api/public/cases", () => req("GET", "/api/public/cases?page=1&size=4"));
await check("GET /api/public/cases/:id=1", () => req("GET", "/api/public/cases/1"));
await check("GET /api/public/download-categories", () => req("GET", "/api/public/download-categories"));
await check("GET /api/public/downloads", () => req("GET", "/api/public/downloads?page=1&size=6"));
await check("GET /api/public/downloads/:id=1", () => req("GET", "/api/public/downloads/1"));
await check("POST /api/public/downloads/1/download", () => req("POST", "/api/public/downloads/1/download"));
await check("GET /api/public/articles", () => req("GET", "/api/public/articles?page=1&size=4"));
await check("GET /api/public/articles/:id=1", () => req("GET", "/api/public/articles/1"));
await check("GET /api/public/about", () => req("GET", "/api/public/about"));
await check("POST /api/public/messages", () =>
  req("POST", "/api/public/messages", { name: "测试用户", phone: "13800001111", email: "t@t.com", subject: "测试留言", content: "这是一条自动化测试留言" }));

// 后台接口
const login = await req("POST", "/api/admin/auth/login", { username: "admin", password: "admin123" });
const token = login.body?.data?.token;
await check("POST /api/admin/auth/login", async () => login);
await check("GET /api/admin/auth/profile", () => req("GET", "/api/admin/auth/profile", null, token));
await check("GET /api/admin/dashboard/stats", () => req("GET", "/api/admin/dashboard/stats", null, token));
await check("GET /api/admin/dashboard/trends", () => req("GET", "/api/admin/dashboard/trends", null, token));
await check("GET /api/admin/banners", () => req("GET", "/api/admin/banners?page=1&size=10", null, token));
await check("POST /api/admin/products", () =>
  req("POST", "/api/admin/products", { category_id: 1, name: "测试产品", intro: "测试", detail: "测试", status: 1 }, token));
await check("PUT /api/admin/products/1", () =>
  req("PUT", "/api/admin/products/1", { name: "测试产品-改", sort: 9 }, token));
await check("GET /api/admin/messages", () => req("GET", "/api/admin/messages?page=1&size=10", null, token));
await check("GET /api/admin/settings", () => req("GET", "/api/admin/settings", null, token));
await check("GET /api/admin/users", () => req("GET", "/api/admin/users", null, token));
await check("GET /api/admin/roles", () => req("GET", "/api/admin/roles", null, token));
await check("GET /api/admin/about", () => req("GET", "/api/admin/about", null, token));
await check("GET /api/admin/homepage", () => req("GET", "/api/admin/homepage", null, token));
await check("GET /api/admin/logs", () => req("GET", "/api/admin/logs?page=1&size=5", null, token));
await check("GET /api/admin/operation(未授权应该失败)", () => req("GET", "/api/admin/users")); // 无token应401

console.log("========== API 测试结果 ==========");
results.forEach((r) => console.log(r));
const failed = results.filter((r) => r.includes("❌")).length;
console.log(`总计: ${results.length - failed}/${results.length} 通过`);
process.exit(0);
