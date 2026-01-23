$AppName = "localdrop"
$InstallDir = "$env:LOCALAPPDATA\localdrop"
$ConfigDir = "$env:APPDATA\localdrop"
$Port = 8080

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null

$Arch = if ($env:PROCESSOR_ARCHITECTURE -eq "AMD64") {
  "amd64"
} elseif ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") {
  "arm64"
} else {
  "386"
}
$Url = "https://github.com/Mo7sen007/LocalDrop/releases/latest/download/localdrop_windows_$Arch.zip"

Invoke-WebRequest $Url -OutFile "$InstallDir\localdrop.zip"
Expand-Archive "$InstallDir\localdrop.zip" -DestinationPath $InstallDir -Force

# setup env
if (!(Test-Path "$ConfigDir\.env")) {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $SessionSecret = -join ($bytes | ForEach-Object { $_.ToString("x2") })

  @"
SESSION_SECRET=$SessionSecret
SESSION_COOKIE_SECURE=false
GIN_MODE=release
"@ | Set-Content -Path "$ConfigDir\.env" -Encoding ASCII
}

# Firewall rule
New-NetFirewallRule `
  -DisplayName "LocalDrop" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort $Port `
  -Action Allow `
  -ErrorAction SilentlyContinue

Write-Host "✔ Installed LocalDrop"
Write-Host "Initializing..."
& "$InstallDir\localdrop.exe" init
