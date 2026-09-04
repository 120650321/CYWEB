import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { config } from "../config.js";
import { authRequired } from "../auth.js";
import { ok, fail } from "../utils.js";

const router = Router();

// 允许的图片与文档类型（扩展名 + MIME 双重校验）
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
const IMAGE_MIME = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp"];
const FILE_EXT = [".pdf", ".zip", ".rar", ".7z", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".md", ".tar", ".gz", ".tar.gz", ".apk", ".bin", ".fw", ".py", ".js", ".json"];
const FILE_MIME = [
  "application/pdf",
  "application/zip", "application/x-zip-compressed",
  "application/x-rar-compressed", "application/vnd.rar",
  "application/x-7z-compressed",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/markdown",
  "application/x-tar", "application/gzip",
  "application/vnd.android.package-archive",
  "application/octet-stream",
  "text/x-python", "text/javascript", "application/json",
];

const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_IMAGE_SIZE = 20 * 1024 * 1024;  // 20MB

function sanitizeFilename(filename) {
  return filename
    .replace(/\.\./g, "")
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/^\.+/, "")
    .substring(0, 255);
}

function isAllowedMime(mime, type) {
  if (!mime) return false;
  if (type === "file") return [...IMAGE_MIME, ...FILE_MIME].includes(mime);
  return IMAGE_MIME.includes(mime);
}

function detectFileMagic(buffer, ext) {
  if (!buffer || buffer.length < 4) return true;
  const head = buffer.slice(0, 4);
  const extToMagic = {
    ".jpg": [0xFF, 0xD8, 0xFF],
    ".jpeg": [0xFF, 0xD8, 0xFF],
    ".png": [0x89, 0x50, 0x4E, 0x47],
    ".gif": [0x47, 0x49, 0x46],
    ".webp": [0x52, 0x49, 0x46, 0x46],
    ".bmp": [0x42, 0x4D],
    ".pdf": [0x25, 0x50, 0x44, 0x46],
    ".zip": [0x50, 0x4B, 0x03, 0x04],
    ".rar": [0x52, 0x61, 0x72, 0x21],
    ".7z": [0x37, 0x7A, 0xBC, 0xAF],
    ".gz": [0x1F, 0x8B],
    ".doc": [0xD0, 0xCF, 0x11, 0xE0],
    ".docx": [0x50, 0x4B, 0x03, 0x04],
    ".xls": [0xD0, 0xCF, 0x11, 0xE0],
    ".xlsx": [0x50, 0x4B, 0x03, 0x04],
  };
  const magic = extToMagic[ext];
  if (!magic) return true;
  for (let i = 0; i < magic.length; i++) {
    if (head[i] !== magic[i]) return false;
  }
  return true;
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = req.query.type === "file" ? "files" : "images";
    const dir = path.join(config.uploadDir, type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = sanitizeFilename(path.basename(file.originalname, ext));
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExt = req.query.type === "file" ? [...IMAGE_EXT, ...FILE_EXT] : IMAGE_EXT;
    if (!allowedExt.includes(ext)) {
      return cb(new Error(`不支持的文件格式：${ext || "未知"}`));
    }
    if (!isAllowedMime(file.mimetype, req.query.type)) {
      return cb(new Error(`不支持的文件类型：${file.mimetype}`));
    }
    cb(null, true);
  },
});

router.post("/", authRequired, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return fail(res, 413, "文件大小超过限制（最大 200MB）");
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return fail(res, 400, "一次只能上传一个文件");
      }
      return fail(res, 400, err.message || "上传失败");
    }
    if (!req.file) return fail(res, 400, "未接收到文件");

    const ext = path.extname(req.file.originalname).toLowerCase();
    const isImage = IMAGE_EXT.includes(ext);

    // 图片文件大小限制
    if (isImage && req.file.size > MAX_IMAGE_SIZE) {
      fs.unlink(req.file.path, () => {});
      return fail(res, 413, "图片文件大小超过限制（最大 20MB）");
    }

    // 文件魔数校验（防止扩展名伪造）
    try {
      const fd = fs.openSync(req.file.path, "r");
      const buf = Buffer.alloc(8);
      fs.readSync(fd, buf, 0, 8, 0);
      fs.closeSync(fd);
      if (!detectFileMagic(buf, ext)) {
        fs.unlink(req.file.path, () => {});
        return fail(res, 400, "文件内容与扩展名不匹配，上传被拒绝");
      }
    } catch (magicErr) {
      fs.unlink(req.file.path, () => {});
      return fail(res, 400, "无法验证文件完整性");
    }

    const type = req.query.type === "file" ? "files" : "images";
    const url = `${config.publicBase}/${type}/${req.file.filename}`;
    ok(res, {
      url,
      name: req.file.originalname,
      size: req.file.size,
      type: isImage ? "image" : "file",
    }, "上传成功");
  });
});

export default router;