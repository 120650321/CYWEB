#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
============================================================================
  驰耀科技 - 文件上传修复补丁 (Python 版)
  适用于 Ubuntu / Debian / CentOS 等 Linux 发行版
  
  修复内容：
    1. Downloads.vue - 软件资料管理文件上传
    2. Articles.vue  - 文章封面上传  
    3. index.css      - 添加辅助样式类
    4. api.upload → http.upload 修复 (关键)
    5. 413 文件过大错误处理 (Nginx/Express)
    6. 服务端 body-parser 限额提升至 200MB
    7. 上传进度显示 (XMLHttpRequest + el-progress)
  
  用法：
    python3 apply-patch.py              # 仅应用补丁
    python3 apply-patch.py --build      # 应用补丁并重新构建
    python3 apply-patch.py --dry-run    # 预览变更，不实际修改
============================================================================
"""
import sys, os, re, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

DRY_RUN = "--dry-run" in sys.argv
DO_BUILD = "--build" in sys.argv

changes = []
errors = []

def apply(filepath, old, new, desc):
    """Replace old string with new string in file."""
    path = os.path.join(ROOT, filepath)
    if not os.path.exists(path):
        errors.append(f"[ERR] 文件不存在: {filepath}")
        return False

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    if old not in content:
        if new in content:
            changes.append(f"[SKIP] {desc} - 已应用过")
            return True
        errors.append(f"[ERR] {desc} - 未找到匹配内容，文件可能已被修改")
        return False

    new_content = content.replace(old, new, 1)
    if DRY_RUN:
        changes.append(f"[PREVIEW] {desc}")
        return True

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)
    changes.append(f"[OK] {desc}")
    return True


# ============================================================
# 1. admin/src/views/Downloads.vue
# ============================================================
print("[1/7] 修复 Downloads.vue ...")

# 1a. 添加 fileInputId 和 fileAccept 常量
apply(
    "admin/src/views/Downloads.vue",
    "const fileInput = ref<HTMLInputElement>();\n\nasync function fetchList()",
    'const fileInput = ref<HTMLInputElement>();\nconst fileInputId = "download-file-input-" + Math.random().toString(36).slice(2, 8);\n\nconst fileAccept = ".pdf,.zip,.rar,.7z,.exe,.img,.iso,.doc,.docx,.xls,.xlsx,.txt,.tar,.gz,.apk,.bin,.fw";\n\nasync function fetchList()',
    "Downloads.vue: 添加 fileInputId 和 fileAccept"
)

# 1b. 修复 pickFile 函数
apply(
    "admin/src/views/Downloads.vue",
    "function pickFile() {\n  fileInput.value?.click();\n}",
    'function pickFile() {\n  const el = fileInput.value || document.getElementById(fileInputId) as HTMLInputElement;\n  if (!el) {\n    console.error("[文件上传] 文件输入元素未就绪");\n    ElMessage.warning("文件上传组件未就绪，请关闭弹窗后重试");\n    return;\n  }\n  el.value = "";\n  el.click();\n}',
    "Downloads.vue: 修复 pickFile() 函数"
)

# 1c. 修复 onFileChange 错误处理
apply(
    "admin/src/views/Downloads.vue",
    '  } catch {\n    ElMessage.error("文件上传失败");\n  }',
    '  } catch (e: any) {\n    console.error("[文件上传失败]", e);\n    ElMessage.error(e?.message || "文件上传失败，请重试");\n  }',
    "Downloads.vue: 完善 onFileChange 错误处理"
)

# 1d. 修复文件输入 hidden 属性
apply(
    "admin/src/views/Downloads.vue",
    '<input ref="fileInput" type="file" hidden @change="onFileChange" />',
    '<input :id="fileInputId" ref="fileInput" type="file" :accept="fileAccept" style="position:fixed;top:-9999px;left:-9999px" @change="onFileChange" />',
    "Downloads.vue: 文件输入改为 off-screen 定位"
)

# 1e. 修复 api.upload → http.upload (关键)
apply(
    "admin/src/views/Downloads.vue",
    'import { api } from "@/api";',
    'import { api, http } from "@/api";',
    "Downloads.vue: 添加 http 导入"
)
apply(
    "admin/src/views/Downloads.vue",
    "const res = await api.upload(file,",
    "const res = await http.upload(file,",
    "Downloads.vue: api.upload → http.upload"
)


# ============================================================
# 2. admin/src/views/Articles.vue
# ============================================================
print("[2/7] 修复 Articles.vue ...")

# 2a. 添加 coverInputId
apply(
    "admin/src/views/Articles.vue",
    "const coverInput = ref<HTMLInputElement>();\nconst tagInput = ref(",
    'const coverInput = ref<HTMLInputElement>();\nconst coverInputId = "article-cover-input-" + Math.random().toString(36).slice(2, 8);\nconst tagInput = ref(',
    "Articles.vue: 添加 coverInputId"
)

# 2b. 修复 pickCover 函数
apply(
    "admin/src/views/Articles.vue",
    "function pickCover() {\n  coverInput.value?.click();\n}",
    'function pickCover() {\n  const el = coverInput.value || document.getElementById(coverInputId) as HTMLInputElement;\n  if (!el) {\n    ElMessage.warning("上传组件未就绪");\n    return;\n  }\n  el.value = "";\n  el.click();\n}',
    "Articles.vue: 修复 pickCover() 函数"
)

# 2c. 修复封面上传 hidden 属性
apply(
    "admin/src/views/Articles.vue",
    '<input ref="coverInput" type="file" accept="image/*" hidden @change="onCoverChange" />',
    '<input :id="coverInputId" ref="coverInput" type="file" accept="image/*" style="position:fixed;top:-9999px;left:-9999px" @change="onCoverChange" />',
    "Articles.vue: 封面输入改为 off-screen 定位"
)

# 2d. 修复 api.upload → http.upload (关键)
apply(
    "admin/src/views/Articles.vue",
    'import { api } from "@/api";',
    'import { api, http } from "@/api";',
    "Articles.vue: 添加 http 导入"
)
apply(
    "admin/src/views/Articles.vue",
    "const res = await api.upload(file,",
    "const res = await http.upload(file,",
    "Articles.vue: api.upload → http.upload"
)


# ============================================================
# 3. admin/src/styles/index.css
# ============================================================
print("[3/7] 修复 index.css ...")

VISUALLY_HIDDEN_CSS = '''.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}'''

apply(
    "admin/src/styles/index.css",
    '.num { font-family: "DIN Alternate","Bahnschrift","Roboto",sans-serif; font-weight: 700; }\n\n.page',
    '.num { font-family: "DIN Alternate","Bahnschrift","Roboto",sans-serif; font-weight: 700; }\n\n' + VISUALLY_HIDDEN_CSS + '\n\n.page',
    "index.css: 添加 .visually-hidden 辅助类"
)


# ============================================================
# 4. server/src/routes/upload.js - multer 文件大小限制
# ============================================================
print("[4/7] 修复 upload.js ...")

apply(
    "server/src/routes/upload.js",
    "if (err) return fail(res, 400, err.message || \"上传失败\");\n    if (!req.file)",
    "if (err) {\n      if (err.code === \"LIMIT_FILE_SIZE\") {\n        return fail(res, 413, \"文件大小超过限制（最大 200MB）\");\n      }\n      return fail(res, 400, err.message || \"上传失败\");\n    }\n    if (!req.file)",
    "upload.js: 添加 multer 文件大小限制错误处理"
)


# ============================================================
# 5. server/src/index.js - body-parser 限额提升
# ============================================================
print("[5/7] 修复 index.js ...")

apply(
    "server/src/index.js",
    'app.use(express.json({ limit: "10mb" }));\napp.use(express.urlencoded({ extended: true, limit: "10mb" }));',
    'app.use(express.json({ limit: "200mb" }));\napp.use(express.urlencoded({ extended: true, limit: "200mb" }));',
    "index.js: body-parser 限额 10mb → 200mb"
)


# ============================================================
# 6. admin/src/api/index.ts - XMLHttpRequest 上传进度
# ============================================================
print("[6/7] 修复 api/index.ts (上传进度) ...")

apply(
    "admin/src/api/index.ts",
    'upload: async (file: File, type: "image" | "file" = "image") => {',
    'upload: (file: File, type: "image" | "file" = "image", onProgress?: (percent: number) => void) => {',
    "api/index.ts: upload 签名改为支持 onProgress 回调"
)

apply(
    "admin/src/api/index.ts",
    'const token = localStorage.getItem("admin_token");\n    const fd = new FormData();\n    fd.append("file", file);\n    const res = await fetch(`/api/upload?type=${type}`, {\n      method: "POST",\n      headers: token ? { Authorization: `Bearer ${token}` } : {},\n      body: fd,\n    });\n    if (res.status === 413) {\n      throw new ApiError("文件过大，请压缩后重试（最大 200MB），如已配置 Nginx 请确保 client_max_body_size 足够大", 413);\n    }\n    const json = await res.json().catch(() => {\n      throw new ApiError(res.status >= 500 ? "服务器内部错误" : "上传失败，请检查网络", res.status);\n    });\n    if (json.code !== 0) throw new ApiError(json.message || "上传失败", json.code);\n    return json.data as { url: string; name: string; size: number; type: string };',
    'return new Promise((resolve, reject) => {\n      const token = localStorage.getItem("admin_token");\n      const fd = new FormData();\n      fd.append("file", file);\n      const xhr = new XMLHttpRequest();\n      xhr.open("POST", `/api/upload?type=${type}`);\n      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);\n      xhr.upload.onprogress = (e) => {\n        if (e.lengthComputable && onProgress) {\n          onProgress(Math.round((e.loaded / e.total) * 100));\n        }\n      };\n      xhr.onload = () => {\n        if (xhr.status === 413) {\n          reject(new ApiError("文件过大，请压缩后重试（最大 200MB），如已配置 Nginx 请确保 client_max_body_size 足够大", 413));\n          return;\n        }\n        try {\n          const json = JSON.parse(xhr.responseText);\n          if (json.code !== 0) reject(new ApiError(json.message || "上传失败", json.code));\n          else resolve(json.data as { url: string; name: string; size: number; type: string });\n        } catch {\n          reject(new ApiError(xhr.status >= 500 ? "服务器内部错误" : "上传失败，请检查网络", xhr.status));\n        }\n      };\n      xhr.onerror = () => reject(new ApiError("网络异常，请检查连接"));\n      xhr.send(fd);\n    });',
    "api/index.ts: fetch → XMLHttpRequest (支持上传进度)"
)


# ============================================================
# 7. 各页面增加上传进度显示
# ============================================================
print("[7/7] 修复各页面（上传进度显示）...")

# 8a. Downloads.vue
apply(
    "admin/src/views/Downloads.vue",
    "const uploading = ref(false);\n\nconst query = reactive({",
    "const uploading = ref(false);\nconst uploadPercent = ref(0);\n\nconst query = reactive({",
    "Downloads.vue: 添加 uploadPercent 状态"
)
apply(
    "admin/src/views/Downloads.vue",
    'const res = await http.upload(file, "file");',
    'const res = await http.upload(file, "file", (p) => { uploadPercent.value = p; });',
    "Downloads.vue: 传递进度回调"
)
apply(
    "admin/src/views/Downloads.vue",
    "uploading.value = true;\n  try {",
    "uploading.value = true;\n  uploadPercent.value = 0;\n  try {",
    "Downloads.vue: 重置进度"
)
apply(
    "admin/src/views/Downloads.vue",
    '<el-button type="primary" plain :loading="uploading" @click="pickFile">\n              <el-icon><Upload /></el-icon>{{ uploading ? "上传中..." : "上传文件" }}\n            </el-button>',
    '<el-button type="primary" plain :loading="uploading" @click="pickFile">\n              <el-icon><Upload /></el-icon>{{ uploading ? "上传中..." : "上传文件" }}\n            </el-button>\n            <el-progress v-if="uploading" :percentage="uploadPercent" :stroke-width="6" style="margin-top:8px" />',
    "Downloads.vue: 添加进度条"
)

# 8b. Articles.vue
apply(
    "admin/src/views/Articles.vue",
    "const saving = ref(false);\nconst list = ref<any[]>([]);",
    "const saving = ref(false);\nconst uploading = ref(false);\nconst uploadPercent = ref(0);\nconst list = ref<any[]>([]);",
    "Articles.vue: 添加 uploading/uploadPercent 状态"
)
apply(
    "admin/src/views/Articles.vue",
    'const res = await http.upload(file, "image");',
    'const res = await http.upload(file, "image", (p) => { uploadPercent.value = p; });',
    "Articles.vue: 传递进度回调"
)
apply(
    "admin/src/views/Articles.vue",
    'if (!file) return;\n  try {',
    'if (!file) return;\n  uploading.value = true;\n  uploadPercent.value = 0;\n  try {',
    "Articles.vue: 设置上传状态"
)
apply(
    "admin/src/views/Articles.vue",
    'ElMessage.error("封面上传失败");\n  }',
    'ElMessage.error("封面上传失败");\n  } finally {\n    uploading.value = false;\n  }',
    "Articles.vue: 添加 finally 清理"
)
apply(
    "admin/src/views/Articles.vue",
    '<span>点击上传封面</span>\n            </div>',
    '<span>点击上传封面</span>\n            </div>\n            <el-progress v-if="uploading" :percentage="uploadPercent" :stroke-width="6" style="margin-top:8px" />',
    "Articles.vue: 添加进度条"
)

# 8c-8f. Banners / Cases / Solutions / Products (el-upload)
for fname in ["Banners.vue", "Cases.vue", "Solutions.vue"]:
    apply(
        f"admin/src/views/{fname}",
        'await http.upload(options.file as File, "image");',
        'await http.upload(options.file as File, "image", (percent) => {\n      options.onProgress({ percent });\n    });',
        f"{fname}: 传递 onProgress 给 el-upload"
    )

apply(
    "admin/src/views/Products.vue",
    'await http.upload(options.file as File, "image");',
    'await http.upload(options.file as File, "image", (percent) => {\n      options.onProgress({ percent });\n    });',
    "Products.vue: 传递 onProgress 给 el-upload"
)


# ============================================================
# 输出结果
# ============================================================
print()
print("=" * 60)
for c in changes:
    print(f"  {c}")
for e in errors:
    print(f"  {e}")
print("=" * 60)

if DRY_RUN:
    print()
    print("  [DRY-RUN] 未实际修改文件。移除 --dry-run 参数以应用补丁。")
elif errors:
    print()
    print("  [警告] 部分补丁应用失败，请检查上述错误。")
    sys.exit(1)
else:
    print()
    print("  [完成] 补丁已成功应用。")

# ============================================================
# 构建 (可选)
# ============================================================
if DO_BUILD and not DRY_RUN and not errors:
    print()
    print("=" * 60)
    print("  开始构建 admin ...")
    print("=" * 60)
    admin_dir = os.path.join(ROOT, "admin")
    ret = os.system(f"cd {admin_dir} && npm run build")
    if ret == 0:
        print()
        print("  [完成] 构建成功。部署时请将 admin/dist/* 上传至服务器。")
    else:
        print()
        print("  [错误] 构建失败，退出码:", ret)
        sys.exit(1)