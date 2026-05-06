$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'target\deploy\safechain-keypair.json'
$destDir = Join-Path $root 'keys'
$dest = Join-Path $destDir 'safechain-keypair.local.json'

if (-not (Test-Path $destDir)) {
  New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

if (-not (Test-Path $source)) {
  Write-Host 'Source keypair not found at target/deploy/safechain-keypair.json' -ForegroundColor Yellow
  Write-Host 'Run: anchor build (or npm run dev:box) first.' -ForegroundColor Yellow
  exit 1
}

Copy-Item $source $dest -Force
Write-Host "Backup created: $dest" -ForegroundColor Green
Write-Host 'IMPORTANT: keep this file private. Do NOT commit to GitHub.' -ForegroundColor Yellow
