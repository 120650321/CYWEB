# ==========================================================
# 云南驰耀科技企业官网 - 生产环境启动脚本 (Windows PowerShell)
# 用法: .\start-prod.ps1 [选项]
#   -Build      仅构建前端和后台
#   -Start      仅启动服务（跳过构建）
#   -Restart    重启服务
#   -Status     查看服务状态
#   -Logs       查看服务日志
#   -Stop       停止服务
#   (无参数)    完整启动（构建 + 启动）
# ==========================================================

param(
    [switch]$Build,
    [switch]$Start,
    [switch]$Restart,
    [switch]$Status,
    [switch]$Logs,
    [switch]$Stop
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# ---------- 配置 ----------
$env:NODE_ENV = "production"
$Port = if ($env:PORT) { $env:PORT } else { "3000" }
$env:PORT = $Port

# 生产环境安全提醒
if (-not $env:JWT_SECRET) {
    Write-Warning "========================================"
    Write-Warning "  [安全警告] JWT_SECRET 未设置，使用默认值！"
    Write-Warning "  请设置环境变量: `$env:JWT_SECRET='your-secret'"
    Write-Warning "========================================"
    $env:JWT_SECRET = "chiyao-tech-jwt-secret-2024"
}

# ---------- 颜色输出 ----------
function Write-Step { Write-Host "`n>> $args" -ForegroundColor Cyan }
function Write-OK   { Write-Host "   ✓ $args" -ForegroundColor Green }
function Write-Err  { Write-Host "   ✗ $args" -ForegroundColor Red }

# ---------- 检查 Node.js ----------
Write-Step "检查 Node.js 环境..."
$nodeVersion = node -v 2>$null
if (-not $nodeVersion) {
    Write-Err "未找到 Node.js，请先安装 Node.js >= 22.5.0"
    exit 1
}
$majorVersion = [int]($nodeVersion -replace "v", "").Split(".")[0]
if ($majorVersion -lt 22) {
    Write-Warning "Node.js 版本: $nodeVersion (建议 >= 22.5.0)"
}
Write-OK "Node.js $nodeVersion"

# ---------- 检查依赖 ----------
Write-Step "检查项目依赖..."
if (-not (Test-Path "node_modules")) {
    Write-Err "node_modules 不存在，请先执行: npm install"
    exit 1
}
Write-OK "依赖已就绪"

# ---------- 函数：构建 ----------
function Invoke-Build {
    Write-Step "构建前端项目 (frontend + admin)..."
    Write-Host "  正在构建前台 (frontend)..."
    npm run build --workspace frontend 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "前台构建失败"
        exit 1
    }
    Write-OK "前台构建完成"

    Write-Host "  正在构建后台管理 (admin)..."
    npm run build --workspace admin 2>&1 | ForEach-Object { Write-Host "  $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Err "后台管理构建失败"
        exit 1
    }
    Write-OK "后台管理构建完成"

    if (-not (Test-Path "frontend\dist")) {
        Write-Err "frontend/dist 目录不存在，构建可能未成功"
        exit 1
    }
    if (-not (Test-Path "admin\dist")) {
        Write-Err "admin/dist 目录不存在，构建可能未成功"
        exit 1
    }
}

# ---------- 函数：启动服务 ----------
function Invoke-StartServer {
    Write-Step "启动生产服务 (端口: $Port)..."
    Write-Host "  环境: NODE_ENV=$env:NODE_ENV, PORT=$env:PORT"
    Write-Host ""

    $logDir = "server\logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }

    $logFile = Join-Path $logDir "server.log"
    $pidFile = Join-Path $ScriptDir ".server.pid"

    # 使用 Start-Process 启动 Node.js 服务
    $process = Start-Process -FilePath "node" `
        -ArgumentList "server/src/index.js" `
        -WorkingDirectory $ScriptDir `
        -PassThru `
        -NoNewWindow `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $logFile

    $process.Id | Out-File -FilePath $pidFile -NoNewline
    Write-OK "服务已启动 (PID: $($process.Id))"
    Write-Host "  日志文件: $logFile"
    Write-Host "  访问地址: http://localhost:$Port"
    Write-Host "  健康检查: http://localhost:$Port/api/health"
    Write-Host "  Sitemap:  http://localhost:$Port/api/public/sitemap.xml"
    Write-Host ""
    Write-Host "  停止服务: .\start-prod.ps1 -Stop"
    Write-Host "  查看日志: .\start-prod.ps1 -Logs"
}

# ---------- 函数：停止服务 ----------
function Invoke-StopServer {
    Write-Step "停止服务..."
    $pidFile = Join-Path $ScriptDir ".server.pid"
    if (Test-Path $pidFile) {
        $pid = Get-Content $pidFile
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            Stop-Process -Id $pid -Force
            Write-OK "服务已停止 (PID: $pid)"
        } catch {
            Write-Warning "进程 $pid 不存在，可能已停止"
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    } else {
        # 尝试通过端口查找
        $proc = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($proc) {
            Stop-Process -Id $proc.OwningProcess -Force
            Write-OK "已停止端口 $Port 上的进程 (PID: $($proc.OwningProcess))"
        } else {
            Write-Warning "未找到运行中的服务"
        }
    }
}

# ---------- 函数：查看状态 ----------
function Show-Status {
    Write-Step "服务状态检查..."
    $pidFile = Join-Path $ScriptDir ".server.pid"
    $running = $false

    if (Test-Path $pidFile) {
        $pid = Get-Content $pidFile
        try {
            $proc = Get-Process -Id $pid -ErrorAction Stop
            Write-OK "服务运行中 (PID: $pid, 内存: $([math]::Round($proc.WorkingSet64/1MB, 1)) MB)"
            $running = $true
        } catch {
            Write-Warning "PID 文件存在但进程已停止"
        }
    }

    if (-not $running) {
        $conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($conn) {
            Write-OK "端口 $Port 有进程监听 (PID: $($conn.OwningProcess))"
        } else {
            Write-Warning "服务未运行 (端口 $Port 无监听)"
        }
    }

    # 健康检查
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:$Port/api/health" -TimeoutSec 5 -ErrorAction Stop
        Write-OK "健康检查通过: $($health.data.name) @ $($health.data.time)"
    } catch {
        Write-Warning "健康检查失败: $($_.Exception.Message)"
    }
}

# ---------- 主流程 ----------
switch ($true) {
    $Build   { Invoke-Build; break }
    $Start   { Invoke-StartServer; break }
    $Restart { Invoke-StopServer; Start-Sleep -Seconds 2; Invoke-StartServer; break }
    $Status  { Show-Status; break }
    $Logs    {
        $logFile = Join-Path $ScriptDir "server\logs\server.log"
        if (Test-Path $logFile) {
            Get-Content $logFile -Tail 50 -Wait
        } else {
            Write-Warning "日志文件不存在: $logFile"
        }
        break
    }
    $Stop    { Invoke-StopServer; break }
    default  {
        Invoke-Build
        Invoke-StartServer
    }
}