#!/usr/bin/env pwsh
# Trust the Adagio local dev CA on this Windows machine (one-time per machine).
# Chrome reads the Windows user cert store automatically — no restart required
# for new navigations after this runs.

$certPath = Join-Path $PSScriptRoot "..\public\dev-ca\adagio-local-dev-ca.crt"
$certPath = (Resolve-Path $certPath).Path

$existing = certutil -user -store Root 2>$null | Select-String "Adagio Local Dev CA"
if ($existing) {
    Write-Host "Already trusted: Adagio Local Dev CA is in the Windows user root store."
    exit 0
}

certutil -addstore -user Root $certPath
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done. Adagio Local Dev CA is now trusted."
    Write-Host "Open a new Chrome tab and navigate to https://adagio.local:5250"
} else {
    Write-Error "certutil failed (exit $LASTEXITCODE). Try running as administrator."
    exit 1
}
