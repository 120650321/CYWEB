import { parseJSON } from "./db.js";

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
