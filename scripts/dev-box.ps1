$ErrorActionPreference = 'Stop'

$root = 'C:\Users\deesey\Documents\safechain'
Set-Location $root

$backupKey = Join-Path $root 'keys\safechain-keypair.local.json'
$deployDir = Join-Path $root 'target\deploy'
$deployKey = Join-Path $deployDir 'safechain-keypair.json'

Write-Host '== SafeChain: one-click local bootstrap ==' -ForegroundColor Cyan

function Ensure-NpmInstall([string]$path) {
  if (-not (Test-Path (Join-Path $path 'node_modules'))) {
    Write-Host "Installing npm deps in $path ..." -ForegroundColor Yellow
    Push-Location $path
    npm install
    Pop-Location
  }
}

Ensure-NpmInstall $root
Ensure-NpmInstall (Join-Path $root 'app\frontend')
Ensure-NpmInstall (Join-Path $root 'backend')

Write-Host 'Building Anchor program ...' -ForegroundColor Yellow
anchor build --no-idl

if (Test-Path $backupKey) {
  if (-not (Test-Path $deployDir)) {
    New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
  }
  Copy-Item $backupKey $deployKey -Force
  Write-Host 'Restored program keypair from keys/safechain-keypair.local.json' -ForegroundColor Green
}

$validatorRunning = Get-Process solana-test-validator -ErrorAction SilentlyContinue
if (-not $validatorRunning) {
  Write-Host 'Starting local validator ...' -ForegroundColor Yellow
  Start-Process powershell -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$root'; solana-test-validator --ledger '$root\test-ledger' -r"
  ) | Out-Null

  $ready = $false
  for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep -Seconds 1
    try {
      $health = Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8899' -ContentType 'application/json' -Body '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
      if ($health.result -eq 'ok') { $ready = $true; break }
    } catch {}
  }

  if (-not $ready) {
    throw 'Local validator did not become ready in time.'
  }
}

Write-Host 'Deploying program to localnet ...' -ForegroundColor Yellow
if (-not (Test-Path $deployKey)) {
  throw 'Program keypair missing. Run scripts/backup-critical.ps1 once before cleanup to keep stable Program ID.'
}
solana program deploy "$root\target\deploy\safechain.so" --program-id "$deployKey" --url http://127.0.0.1:8899 | Out-Host

Write-Host 'Funding sponsor wallet (if needed) ...' -ForegroundColor Yellow
node -e "const web3=require('./app/frontend/node_modules/@solana/web3.js');const fs=require('fs');const os=require('os');const path=require('path');(async()=>{const conn=new web3.Connection('http://127.0.0.1:8899','confirmed');const s=require('./app/frontend/src/sponsor.json');const sponsor=web3.Keypair.fromSecretKey(new Uint8Array(s));const cfg=path.join(os.homedir(),'.config','solana','id.json');if(!fs.existsSync(cfg)){console.log('No ~/.config/solana/id.json, skip sponsor funding');return;}const payer=web3.Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(cfg,'utf8'))));const sb=await conn.getBalance(sponsor.publicKey);if(sb>=web3.LAMPORTS_PER_SOL){console.log('Sponsor already funded');return;}const tx=new web3.Transaction().add(web3.SystemProgram.transfer({fromPubkey:payer.publicKey,toPubkey:sponsor.publicKey,lamports:5*web3.LAMPORTS_PER_SOL}));const sig=await web3.sendAndConfirmTransaction(conn,tx,[payer]);console.log('Sponsor funded:',sig);})();"

Write-Host 'Starting backend ...' -ForegroundColor Yellow
Start-Process powershell -ArgumentList @('-NoExit','-Command',"Set-Location '$root'; npm --prefix backend run dev") | Out-Null

Write-Host 'Starting frontend ...' -ForegroundColor Yellow
Start-Process powershell -ArgumentList @('-NoExit','-Command',"Set-Location '$root'; npm --prefix app/frontend run dev") | Out-Null

Write-Host 'Done. Frontend: http://localhost:5173 | Backend: http://localhost:8080' -ForegroundColor Green
