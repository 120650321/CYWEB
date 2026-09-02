// 后台关键 API 冒烟测试（生产模式）
const BASE = "http://localhost:3000/api/admin";

async function req(method, url, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let pass = 0;
let fail = 0;
function check(name, ok, extra = "") {
  if (ok) {
    pass++;
    console.log(`  ✅ ${name} ${extra}`);
  } else {
    fail++;
    console.log(`  ❌ ${name} ${extra}`);
  }
}

async function main() {
  console.log("[1] 登录");
  const login = await req("POST", "/auth/login", { username: "admin", password: "admin123" });
  check("管理员登录", login.status === 200 && login.data.data?.token, `status=${login.status}`);
  const token = login.data.data?.token;
  if (!token) return process.exit(1);

  console.log("[2] 仪表盘");
  const dash = await req("GET", "/dashboard/stats", null, token);
  check("仪表盘统计", dash.status === 200, `status=${dash.status}`);
  const trend = await req("GET", "/dashboard/trends?days=7", null, token);
  check("访问趋势", trend.status === 200, `status=${trend.status}`);
  const top = await req("GET", "/dashboard/top-downloads", null, token);
  check("TOP 下载", top.status === 200, `status=${top.status}`);

  console.log("[3] 软件资料");
  const dl = await req("GET", "/downloads?page=1&size=5", null, token);
  check("资料列表", dl.status === 200 && dl.data.data?.list?.length > 0, `total=${dl.data.data?.pagination?.total}`);
  const dlId = dl.data.data?.list?.[0]?.id;
  if (dlId) {
    const rc = await req("PUT", `/downloads/${dlId}/reset-count`, null, token);
    check("重置下载量", rc.status === 200, `status=${rc.status}`);
  }

  console.log("[4] 新闻资讯");
  const ar = await req("GET", "/articles?page=1&size=5", null, token);
  check("文章列表", ar.status === 200 && ar.data.data?.list?.length > 0, `total=${ar.data.data?.total}`);

  console.log("[5] 留言");
  const ms = await req("GET", "/messages?page=1&size=5", null, token);
  check("留言列表", ms.status === 200, `status=${ms.status}`);
  const mid = ms.data.data?.list?.[0]?.id;
  if (mid) {
    const s1 = await req("PUT", `/messages/${mid}/status`, { status: "processing" }, token);
    check("状态流转→处理中", s1.status === 200, `status=${s1.status}`);
    const rp = await req("PUT", `/messages/${mid}/reply`, { reply: "感谢您的咨询，我司已收到需求，稍后将有专员与您联系。" }, token);
    check("留言回复", rp.status === 200, `status=${rp.status}`);
  }

  console.log("[6] 用户与角色");
  const us = await req("GET", "/users", null, token);
  check("用户列表", us.status === 200 && Array.isArray(us.data.data), `count=${us.data.data?.length}`);
  const ro = await req("GET", "/roles", null, token);
  check("角色列表", ro.status === 200 && Array.isArray(ro.data.data), `count=${ro.data.data?.length}`);

  console.log("[7] 设置");
  const st = await req("GET", "/settings", null, token);
  check("站点设置", st.status === 200, `status=${st.status}`);
  const ab = await req("GET", "/about", null, token);
  check("关于我们", ab.status === 200, `status=${ab.status}`);
  const hp = await req("GET", "/homepage", null, token);
  check("首页设置", hp.status === 200, `status=${hp.status}`);

  console.log("[8] 日志");
  const lg = await req("GET", "/logs?page=1&size=10", null, token);
  check("操作日志", lg.status === 200, `status=${lg.status} count=${lg.data.data?.list?.length}`);

  console.log("[9] 权限控制");
  const pub = await fetch("http://localhost:3000/api/public/banners");
  const pubData = await pub.json();
  check("前台 API 开放访问", pub.status === 200 && pubData.data?.length > 0, `status=${pub.status}`);
  const noAuth = await req("GET", "/users", null, null);
  check("后台无 Token 拒绝", noAuth.status === 401, `status=${noAuth.status}`);

  console.log(`\n结果: 通过 ${pass} / ${pass + fail}`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("测试异常:", e);
  process.exit(1);
});
