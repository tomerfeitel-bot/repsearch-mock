$ErrorActionPreference = 'Stop'

$Root = 'C:\Users\gilad\repsearch-v2'
$ServerRoot = Join-Path $Root 'server'
$DbLockPath = Join-Path $ServerRoot 'repsearch.db.lock'
$BackendHealthUrl = 'http://127.0.0.1:3002/api/health'
$FrontendUrl = 'http://127.0.0.1:5173/auth'
$FrontendPort = 5173

function Test-Url {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 20
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-Url $Url) { return $true }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

function Get-LanIp {
  try {
    $addresses = Get-NetIPAddress -AddressFamily IPv4 |
      Where-Object {
        -not $_.IPAddress.StartsWith('127.') -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
      } |
      Sort-Object InterfaceMetric |
      Select-Object -ExpandProperty IPAddress

    $ip = $addresses | Select-Object -First 1
    if ($ip) { return $ip }
  } catch {
    $hostEntry = [System.Net.Dns]::GetHostEntry([System.Net.Dns]::GetHostName())
    return $hostEntry.AddressList |
      Where-Object {
        $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
        -not $_.IPAddressToString.StartsWith('127.') -and
        $_.IPAddressToString -notlike '169.254.*'
      } |
      Select-Object -ExpandProperty IPAddressToString -First 1
  }
}

if (-not (Test-Path $Root)) {
  throw "RepSearch folder was not found at $Root"
}

if (-not (Test-Url $BackendHealthUrl)) {
  if (Test-Path $DbLockPath) {
    Remove-Item -LiteralPath $DbLockPath -Force -Recurse
  }

  Start-Process `
    -FilePath 'C:\Program Files\nodejs\node.exe' `
    -ArgumentList 'index.js' `
    -WorkingDirectory $ServerRoot `
    -WindowStyle Hidden
}

if (-not (Wait-ForUrl $BackendHealthUrl 15)) {
  throw "RepSearch backend did not become available at $BackendHealthUrl"
}

if (-not (Test-Url $FrontendUrl)) {
  Start-Process `
    -FilePath 'C:\Program Files\nodejs\npm.cmd' `
    -ArgumentList @('run', 'dev:vite', '--', '--host', '0.0.0.0', '--port', "$FrontendPort") `
    -WorkingDirectory $Root `
    -WindowStyle Hidden
}

if (-not (Wait-ForUrl $FrontendUrl 25)) {
  throw "RepSearch frontend did not become available at $FrontendUrl"
}

$LanIp = Get-LanIp
if ($LanIp) {
  Write-Host "Open RepSearch on your phone: http://$($LanIp):$FrontendPort/auth"
  Write-Host "Your phone must be on the same Wi-Fi as this computer."
} else {
  Write-Host 'RepSearch is running, but no LAN IPv4 address was found.'
}

Start-Process $FrontendUrl
