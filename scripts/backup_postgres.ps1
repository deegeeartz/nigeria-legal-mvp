param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,
    [Parameter(Mandatory = $true)]
    [string]$OutputDir
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupPath = Join-Path $OutputDir ("nigeria_legal_mvp_" + $timestamp + ".backup")

pg_dump --format=custom --dbname "$DatabaseUrl" --file "$backupPath"

Write-Host "PostgreSQL backup created: $backupPath"
