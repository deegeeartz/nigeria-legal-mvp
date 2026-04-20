param(
    [Parameter(Mandatory = $false)]
    [string]$ApiUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

Write-Output "Running container migration smoke checks..."

$health = Invoke-RestMethod -Method Get -Uri "$ApiUrl/health"
if ($health.status -ne "ok") {
    throw "API health check failed"
}

$adminLogin = Invoke-RestMethod -Method Post -Uri "$ApiUrl/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@legalmvp.local","password":"AdminPass123!"}'
if (-not $adminLogin.access_token) {
    throw "Admin login failed"
}

$headers = @{ "X-Auth-Token" = $adminLogin.access_token }
$tracker = Invoke-RestMethod -Method Get -Uri "$ApiUrl/api/tracker" -Headers $headers
if (-not $tracker.project) {
    throw "Tracker endpoint check failed"
}

Write-Output "Container migration smoke checks passed ✅"
