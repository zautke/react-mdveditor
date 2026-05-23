#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

$scriptPath = $PSCommandPath
if (-not $scriptPath) {
  throw 'Unable to determine the installer path.'
}

$resolvedScriptPath = (Resolve-Path -LiteralPath $scriptPath).Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path (Split-Path -Parent $resolvedScriptPath) '..')).Path
$sourceScript = Join-Path $repoRoot 'scripts/mdeo.ps1'
$targetDir = Join-Path $HOME '.local/bin'
$targetPath = Join-Path $targetDir 'mdeo.ps1'

if (-not (Test-Path -LiteralPath $sourceScript)) {
  throw "Launcher not found: $sourceScript"
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
if (Test-Path -LiteralPath $targetPath) {
  Remove-Item -LiteralPath $targetPath -Force
}

New-Item -ItemType SymbolicLink -Force -Path $targetPath -Target $sourceScript | Out-Null
Write-Host "Linked $targetPath -> $sourceScript"
