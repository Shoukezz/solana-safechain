$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$backupKey = Join-Path $root 'keys\safechain-keypair.local.json'
$targetKey = Join-Path $root 'target\deploy\safechain-keypair.json'

if (-not (Test-Path $backupKey) -and (Test-Path $targetKey)) {
  Write-Host 'No backup key found. Creating backup first...' -ForegroundColor Yellow
  & (Join-Path $PSScriptRoot 'backup-critical.ps1')
}

Write-Host 'Removing heavy folders...' -ForegroundColor Yellow
$paths = @(
  (Join-Path $root 'test-ledger'),
  (Join-Path $root 'target'),
  (Join-Path $root 'node_modules'),
  (Join-Path $root 'app\frontend\node_modules'),
  (Join-Path $root 'backend\node_modules'),
  (Join-Path $root 'app\frontend\dist'),
  (Join-Path $root 'backend\dist')
)

foreach ($p in $paths) {
  if (Test-Path $p) {
    Remove-Item $p -Recurse -Force
    Write-Host "Deleted: $p"
  }
}

Write-Host 'Done. You can restore and run with: npm run dev:box' -ForegroundColor Green
