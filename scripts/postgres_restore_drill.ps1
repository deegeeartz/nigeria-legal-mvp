param(
    [Parameter(Mandatory = $true)]
    [string]$DatabaseUrl,
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$RestoreDbName = "nigeria_legal_mvp_restore_drill"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    throw "Backup file not found: $BackupFile"
}

$uri = [System.Uri]$DatabaseUrl
$base = "postgresql://$($uri.UserInfo)@$($uri.Host):$($uri.Port)/postgres"

psql "$base" -c "DROP DATABASE IF EXISTS $RestoreDbName;"
psql "$base" -c "CREATE DATABASE $RestoreDbName;"

$restoreUrl = "postgresql://$($uri.UserInfo)@$($uri.Host):$($uri.Port)/$RestoreDbName"
pg_restore --dbname "$restoreUrl" --clean --if-exists "$BackupFile"

Write-Host "Restore drill completed into database: $RestoreDbName"
