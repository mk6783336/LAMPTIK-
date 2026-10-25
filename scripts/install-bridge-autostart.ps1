# Install (or remove) the logon autostart for the bridge + named tunnel.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-bridge-autostart.ps1
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/install-bridge-autostart.ps1 -Uninstall
#
# A small .vbs launcher is dropped in the user's Startup folder so no console
# window flashes at logon; it calls scripts/bridge-autostart.ps1, which starts
# only what is not already running. No administrator rights are needed, and
# nothing is written outside the repo + that one Startup entry.

param([switch]$Uninstall)

$root = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath("Startup")
$launcher = Join-Path $startup "LampTik Bridge.vbs"
$starter = Join-Path $root "scripts\bridge-autostart.ps1"

if ($Uninstall) {
    if (Test-Path $launcher) {
        Remove-Item -Path $launcher -Force
        Write-Host "Removed $launcher"
        Write-Host "Running processes were left alone; close them by hand if you want the bridge offline."
    } else {
        Write-Host "No autostart entry found at $launcher"
    }
    exit 0
}

if (-not (Test-Path $starter)) {
    Write-Error "Starter not found: $starter"
    exit 1
}

# ASCII, not UTF-16: Windows Script Host treats a BOM-less ASCII file as ANSI
# and runs it; a mismatched encoding is the classic "cannot find script" error.
$content = @"
' LAMP TIK - starts the yt-dlp bridge and its Cloudflare tunnel at logon.
' Installed by scripts/install-bridge-autostart.ps1. Delete this file to disable.
Set sh = CreateObject("WScript.Shell")
sh.Run "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File ""$starter""", 0, False
"@

Set-Content -Path $launcher -Value $content -Encoding ASCII
Write-Host "Installed autostart launcher:"
Write-Host "  $launcher"
Write-Host "  -> $starter"

Write-Host ""
Write-Host "Starting the services now if they are not already up..."
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $starter
