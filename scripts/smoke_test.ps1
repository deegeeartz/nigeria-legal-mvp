param(
    [Parameter(Mandatory = $false)]
    [string]$BaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

Write-Output "Running smoke tests against: $BaseUrl"

$health = Invoke-RestMethod -Method Get -Uri "$BaseUrl/health"
if ($health.status -ne "ok") {
    throw "Health check failed"
}

$adminLogin = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/login" -ContentType "application/json" -Body '{"email":"admin@legalmvp.local","password":"AdminPass123!"}'
if (-not $adminLogin.access_token) {
    throw "Admin login failed: no access token returned"
}

$headers = @{ "X-Auth-Token" = $adminLogin.access_token }
$tracker = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/tracker" -Headers $headers
if (-not $tracker.project) {
    throw "Tracker API smoke check failed"
}

$audits = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/audit-events?limit=5" -Headers $headers
if ($null -eq $audits) {
    throw "Audit API smoke check failed"
}

Write-Output "Smoke tests passed ✅"
