import { parseJSON } from "./db.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

export function ok(res, data = null, message = "ok") {
  res.json({ code: 0, message, data });
}

export function fail(res, status = 400, message = "请求失败") {
  res.status(status).json({ code: status, message });
}

export function paginate(page = 1, size = 10) {
  page = Math.max(1, parseInt(page) || 1);
  size = Math.min(50, Math.max(1, parseInt(size) || 10));
  return { page, size, offset: (page - 1) * size };
}

export function paged(data, page, size, total) {
  return {
    list: data,
    pagination: { page, size, total, totalPages: Math.ceil(total / size) },
  };
}

export function decodeJSON(v, fallback = []) {
  return parseJSON(v, fallback);
}

export function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || "";
}

// IP 区域解析（基于 ip2region 离线数据库）
const IP2Region = require("ip2region").default;
const ip2regionSearcher = (() => {
  try {
    return new IP2Region();
  } catch (e) {
    console.warn("ip2region 初始化失败，将使用简单 IP 识别:", e.message);
    return null;
  }
})();

export function resolveRegion(ip) {
  if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
    return "本地网络";
  }
  if (ip2regionSearcher) {
    try {
      const result = ip2regionSearcher.search(ip);
      if (result) {
        const { country, province, city, isp } = result;
        const arr = [];
        if (country && country !== "0") arr.push(country);
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