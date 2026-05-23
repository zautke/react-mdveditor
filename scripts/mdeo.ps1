#!/usr/bin/env pwsh
$ErrorActionPreference = 'Stop'

if (-not $env:MDE_CLI_NAME) {
  $env:MDE_CLI_NAME = 'mdeo'
}

$scriptPath = $PSCommandPath
if (-not $scriptPath) {
  throw 'Unable to determine the launcher path.'
}

$resolvedScriptPath = (Resolve-Path -LiteralPath $scriptPath).Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path (Split-Path -Parent $resolvedScriptPath) '..')).Path
$cliPath = Join-Path $repoRoot 'bin/mde.mjs'

& node $cliPath @args
exit $LASTEXITCODE
