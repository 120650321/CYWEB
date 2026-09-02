# ============================================================
# 驰耀科技 - 文件上传修复补丁
# 修复内容：
#   1. Downloads.vue - 软件资料管理文件上传
#   2. Articles.vue  - 文章封面上传
#   3. index.css      - 添加辅助样式
# 
# 使用方法：在项目根目录执行
#   powershell -ExecutionPolicy Bypass -File apply-patch.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ROOT

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  驰耀科技 - 文件上传修复补丁" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# 1. 修复 admin/src/views/Downloads.vue
# ============================================================
Write-Host "[1/3] 修复 Downloads.vue ..." -ForegroundColor Yellow

$downloadsPath = "$ROOT\admin\src\views\Downloads.vue"
$downloadsContent = Get-Content $downloadsPath -Raw -Encoding UTF8

# 1a. 在 fileInput ref 后添加 fileInputId 和 fileAccept
$downloadsContent = $downloadsContent -replace `
  'const fileInput = ref<HTMLInputElement>\(\);',
  'const fileInput = ref<HTMLInputElement>();
const fileInputId = "download-file-input-" + Math.random().toString(36).slice(2, 8);

const fileAccept = ".pdf,.zip,.rar,.7z,.exe,.img,.iso,.doc,.docx,.xls,.xlsx,.txt,.tar,.gz,.apk,.bin,.fw";'

# 1b. 修复 pickFile 函数
$downloadsContent = $downloadsContent -replace `
  'function pickFile\(\) \{\s*fileInput\.value\?\?\.click\(\);\s*\}',
  'function pickFile() {
  const el = fileInput.value || document.getElementById(fileInputId) as HTMLInputElement;
  if (!el) {
    console.error("[文件上传] 文件输入元素未就绪");
    ElMessage.warning("文件上传组件未就绪，请关闭弹窗后重试");
    return;
  }
  el.value = "";
  el.click();
}'

# 1c. 修复 onFileChange 错误处理
$downloadsContent = $downloadsContent -replace `
  '  \} catch \{\s*ElMessage\.error\("文件上传失败"\);\s*\}',
  '  } catch (e: any) {
    console.error("[文件上传失败]", e);
    ElMessage.error(e?.message || "文件上传失败，请重试");
  }'

# 1d. 修复文件输入的 hidden 属性
$downloadsContent = $downloadsContent -replace `
  '<input ref="fileInput" type="file" hidden @change="onFileChange" />',
  '<input :id="fileInputId" ref="fileInput" type="file" :accept="fileAccept" style="position:fixed;top:-9999px;left:-9999px" @change="onFileChange" />'

Set-Content $downloadsPath $downloadsContent -Encoding UTF8 -NoNewline
Write-Host "  [OK] Downloads.vue 已修复" -ForegroundColor Green

# ============================================================
# 2. 修复 admin/src/views/Articles.vue
# ============================================================
Write-Host "[2/3] 修复 Articles.vue ..." -ForegroundColor Yellow

$articlesPath = "$ROOT\admin\src\views\Articles.vue"
$articlesContent = Get-Content $articlesPath -Raw -Encoding UTF8

# 2a. 在 coverInput ref 后添加 coverInputId
$articlesContent = $articlesContent -replace `
  'const coverInput = ref<HTMLInputElement>\(\);',
  'const coverInput = ref<HTMLInputElement>();
const coverInputId = "article-cover-input-" + Math.random().toString(36).slice(2, 8);'

# 2b. 修复 pickCover 函数
$articlesContent = $articlesContent -replace `
  'function pickCover\(\) \{\s*coverInput\.value\?\?\.click\(\);\s*\}',
  'function pickCover() {
  const el = coverInput.value || document.getElementById(coverInputId) as HTMLInputElement;
  if (!el) {
    ElMessage.warning("上传组件未就绪");
    return;
  }
  el.value = "";
  el.click();
}'

# 2c. 修复封面上传的 hidden 属性
$articlesContent = $articlesContent -replace `
  '<input ref="coverInput" type="file" accept="image/\*" hidden @change="onCoverChange" />',
  '<input :id="coverInputId" ref="coverInput" type="file" accept="image/*" style="position:fixed;top:-9999px;left:-9999px" @change="onCoverChange" />'

Set-Content $articlesPath $articlesContent -Encoding UTF8 -NoNewline
Write-Host "  [OK] Articles.vue 已修复" -ForegroundColor Green

# ============================================================
# 3. 修复 admin/src/styles/index.css
# ============================================================
Write-Host "[3/3] 修复 index.css ..." -ForegroundColor Yellow

$cssPath = "$ROOT\admin\src\styles\index.css"
$cssContent = Get-Content $cssPath -Raw -Encoding UTF8

$visuallyHiddenClass = @'
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
'@

if ($cssContent -notmatch '\.visually-hidden') {
  $cssContent = $cssContent -replace `
    '(\.num \{.*?\})',
    "`$1`n`n$visuallyHiddenClass"
  Set-Content $cssPath $cssContent -Encoding UTF8 -NoNewline
  Write-Host "  [OK] index.css 已修复" -ForegroundColor Green
} else {
  Write-Host "  [SKIP] index.css 已包含 .visually-hidden" -ForegroundColor Gray
}

# ============================================================
# 4. 重新构建 admin
# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  开始构建 admin ..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Set-Location "$ROOT\admin"
npm run build

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  补丁应用完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "修复摘要：" -ForegroundColor Yellow
Write-Host "  - Downloads.vue: 文件上传改用 off-screen 定位，替代 hidden 属性"
Write-Host "  - Downloads.vue: 增加 fileInputId 降级方案 + 完善错误处理"
Write-Host "  - Articles.vue:  封面上传同样修复"
Write-Host "  - index.css:     添加 .visually-hidden 辅助类"
Write-Host ""
Write-Host "部署时请将 admin/dist/* 上传至服务器替换原有文件。" -ForegroundColor White
Write-Host ""

Set-Location $ROOT