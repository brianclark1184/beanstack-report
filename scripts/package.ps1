$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$extensionRoot = Join-Path $projectRoot 'extension'
& node (Join-Path $PSScriptRoot 'build-pdf-vendor.mjs') --check
if ($LASTEXITCODE -ne 0) { throw 'PDF vendor verification failed.' }
& node (Join-Path $PSScriptRoot 'check-extension-code.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Extension code audit failed.' }
$outputRoot = Join-Path $projectRoot 'output\extension'
$manifest = Get-Content -LiteralPath (Join-Path $extensionRoot 'manifest.json') -Raw | ConvertFrom-Json
$archivePath = Join-Path $outputRoot "reading-log-beanstack-$($manifest.version).zip"
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null
# Package only the distributable extension: never reading records, test fixtures, or PDFs.
Compress-Archive -Path (Join-Path $extensionRoot '*') -DestinationPath $archivePath -Force
Write-Output $archivePath
$hasher = [System.Security.Cryptography.SHA256]::Create()
$stream = [System.IO.File]::OpenRead($archivePath)
try { Write-Output ([System.BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()) }
finally { $stream.Dispose(); $hasher.Dispose() }
