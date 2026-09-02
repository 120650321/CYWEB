import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { config } from "../config.js";
import { authRequired } from "../auth.js";
import { ok, fail } from "../utils.js";

const router = Router();

// 允许的图片与文档类型
const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
const FILE_EXT = [".pdf", ".zip", ".rar", ".7z", ".exe", ".img", ".iso", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".md", ".tar", ".gz", ".tar.gz", ".apk", ".bin", ".fw", ".py", ".js", ".json"];

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const type = req.query.type === "file" ? "files" : "images";
    const dir = path.join(config.uploadDir, type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = req.query.type === "file" ? [...IMAGE_EXT, ...FILE_EXT] : IMAGE_EXT;
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error(`不支持的文件格式：${ext || "未知"}`));
  },
});

router.post("/", authRequired, (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return fail(res, 413, "文件大小超过限制（最大 200MB）");
      }
      return fail(res, 400, err.message || "上传失败");
    }
    if (!req.file) return fail(res, 400, "未接收到文件");
    const isImage = IMAGE_EXT.includes(path.extname(req.file.originalname).toLowerCase());
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