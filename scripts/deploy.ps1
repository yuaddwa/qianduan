# One-click: build + upload dist (tar over SSH = full replace, avoids stale files)
# Usage:
#   npm run deploy | deploy:web   # 构建相同；区别仅你习惯的脚本名（-BaseWeb 已不影响构建）
#   npm run update | update:web
# Windows：项目根目录「一键更新.bat」
# Override: pwsh -File scripts/deploy.ps1 -User root -RemotePath /opt/ysc/frontend/dist
# -BaseWeb：保留参数兼容旧命令，无实际作用（Vite 已用相对路径，根路径与 /web/ 共用一份 dist）

param(
  [string]$Server = "101.37.157.23",
  [string]$User = "root",
  [string]$KeyPath = "C:\Users\ysc02\.ssh\kx.pem",
  [string]$RemotePath = "/opt/ysc/frontend/dist",
  [switch]$BaseWeb
)

try {
  chcp 65001 | Out-Null
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch { }

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not (Test-Path $KeyPath)) {
  throw "Key file not found: $KeyPath"
}

# 前端已用 Vite base=`./`，根路径与 /web/ 共用同一份 dist，无需再分两种 build
Write-Host ">>> npm run build" -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

$dist = Join-Path $ProjectRoot "dist"
if (-not (Test-Path $dist)) { throw "dist folder missing" }

$sshCommon = @("-i", $KeyPath, "-o", "StrictHostKeyChecking=accept-new")

# Local: show which JS bundle this build produced (for you to compare on server)
$localIndex = Join-Path $dist "index.html"
$localSnippet = ""
if (Test-Path $localIndex) {
  $localSnippet = (Select-String -Path $localIndex -Pattern 'assets/index-[^"]+\.js' | Select-Object -First 1).Matches.Value
  Write-Host ">>> local index references: $localSnippet" -ForegroundColor Gray
}

# 不要用「tar | ssh」经 PowerShell 管道传二进制，会被破坏导致远端报 Not a tar archive。
# 做法：本地打 .tgz -> scp 上传 -> 远端解压后删临时包

Write-Host ">>> pack dist (.tgz) then scp (PowerShell-safe)" -ForegroundColor Cyan

$tarCmd = Get-Command tar -ErrorAction SilentlyContinue
if (-not $tarCmd) {
  throw "Windows tar not found (需要 Windows 10+ 自带 tar)."
}

$bundleName = "qianduan-dist-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()).tgz"
$bundlePath = Join-Path $env:TEMP $bundleName
Remove-Item $bundlePath -Force -ErrorAction SilentlyContinue

& tar -czf $bundlePath -C $dist .
if ($LASTEXITCODE -ne 0) { throw "local tar -czf failed" }

$remoteTmp = "/tmp/$bundleName"
Write-Host ">>> scp -> ${User}@${Server}:$remoteTmp" -ForegroundColor Cyan
& scp @sshCommon $bundlePath "${User}@${Server}:$remoteTmp"
if ($LASTEXITCODE -ne 0) { throw "scp of bundle failed" }

Write-Host ">>> extract on server -> $RemotePath" -ForegroundColor Cyan
$extractCmd = "mkdir -p $RemotePath && find $RemotePath -mindepth 1 -delete && tar -xzf $remoteTmp -C $RemotePath && rm -f $remoteTmp"
& ssh @sshCommon "${User}@${Server}" $extractCmd
if ($LASTEXITCODE -ne 0) { throw "remote tar extract failed" }

Remove-Item $bundlePath -Force -ErrorAction SilentlyContinue

Write-Host ">>> verify remote" -ForegroundColor Cyan
$rp = $RemotePath
& ssh @sshCommon "${User}@${Server}" "echo '--- ls' && ls -la $rp && echo '--- assets' && ls -la $rp/assets && echo '--- script line' && grep -E 'src=.*assets/index-' $rp/index.html | head -1 && echo '--- index mtime' && stat $rp/index.html"

Write-Host ""
Write-Host ">>> Done. If browser still shows old UI: hard refresh (Ctrl+F5) or disable cache." -ForegroundColor Green
Write-Host ">>> Compare remote grep line with local: $localSnippet" -ForegroundColor Gray
