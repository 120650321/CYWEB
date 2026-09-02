import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { get } from "./db.js";

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const calc = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(calc, "hex"));
}

export function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ code: 401, message: "未登录或登录已过期" });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await get("users", payload.id);
    if (!user || user.status !== 1) {
      return res.status(401).json({ code: 401, message: "账号不存在或已被禁用" });
    }
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ code: 401, message: "登录凭证无效或已过期" });
  }
}

export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: "没有操作权限" });
    }
    next();
  };
}
