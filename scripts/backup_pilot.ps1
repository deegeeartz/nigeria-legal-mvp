param(
    [Parameter(Mandatory = $true)]
    [string]$DbPath,

    [Parameter(Mandatory = $true)]
    [string]$UploadsDir,

    [Parameter(Mandatory = $false)]
    [string]$BackupRoot = "C:\Users\PC\Desktop\nigeria-legal-mvp\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $DbPath)) {
    throw "Database file not found: $DbPath"
}

if (-not (Test-Path -Path $UploadsDir)) {
    throw "Uploads directory not found: $UploadsDir"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $BackupRoot $timestamp

New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item -Path $DbPath -Destination (Join-Path $backupDir "legal_mvp.db") -Force
Copy-Item -Path $UploadsDir -Destination (Join-Path $backupDir "uploads") -Recurse -Force

Write-Output "Backup created at: $backupDir"
