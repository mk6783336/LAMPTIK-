# Start the yt-dlp bridge and its named Cloudflare tunnel, once.
#
# Idempotent: whatever is already listening (or already running) is skipped, so
# this is safe to call at logon, from the installer, or by hand while the
# services are up. Paths are resolved from this script, so the repo can move.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bridge-autostart.ps1
#
# Everything it starts is windowless and logs under .scratch/.

$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
$scratch = Join-Path $root ".scratch"
$logFile = Join-Path $scratch "bridge-autostart.log"
$port = 7860
$tunnelName = "lamptik-bridge"
$tunnelHost = "bridge.lamptik.online"

if (-not (Test-Path $scratch)) { New-Item -ItemType Directory -Path $scratch | Out-Null }

function Log([string]$message) {
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
    Add-Content -Path $logFile -Value $line -Encoding utf8
}

function Find-Secret {
    $envFile = Join-Path $root ".env.local"
    if (-not (Test-Path $envFile)) { return $null }
    foreach ($line in Get-Content -Path $envFile -Encoding utf8) {
        if ($line -match '^\s*BRIDGE_SECRET\s*=\s*(.+?)\s*$') {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

# --- bridge ---------------------------------------------------------------
$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
    Log "bridge already listening on :$port (pid $($listening.OwningProcess -join ',')), skipped"
} else {
    $python = $null
    foreach ($candidate in @(
            (Join-Path $root "bridge\.venv\Scripts\python.exe"),
            (Join-Path $scratch "bridge-venv\Scripts\python.exe"))) {
        if (Test-Path $candidate) { $python = $candidate; break }
    }
    if (-not $python) {
        $onPath = Get-Command python.exe -ErrorAction SilentlyContinue
        if ($onPath) { $python = $onPath.Source }
    }

    if (-not $python) {
        Log "ERROR python not found (expected bridge\.venv or .scratch\bridge-venv)"
    } else {
        $secret = Find-Secret
        if (-not $secret) { Log "WARN BRIDGE_SECRET missing from .env.local - bridge starts unsecured" }
        $env:BRIDGE_SECRET = $secret
        $env:PORT = "$port"
        try {
            Start-Process -FilePath $python `
                -ArgumentList "app.py" `
                -WorkingDirectory (Join-Path $root "bridge") `
                -WindowStyle Hidden `
                -RedirectStandardOutput (Join-Path $scratch "bridge.out.log") `
                -RedirectStandardError (Join-Path $scratch "bridge.err.log") | Out-Null
            Log "bridge started with $python on :$port"
        } catch {
            Log "ERROR starting bridge: $($_.Exception.Message)"
        }
    }
}

# --- named tunnel ---------------------------------------------------------
$tunnelRunning = $false
try {
    $tunnelRunning = [bool](Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction Stop |
        Where-Object { $_.CommandLine -and $_.CommandLine -like "*$tunnelName*" })
} catch {
    Log "WARN could not inspect cloudflared processes: $($_.Exception.Message)"
}

if ($tunnelRunning) {
    Log "tunnel $tunnelName already running, skipped"
} else {
    $cloudflared = $null
    foreach ($candidate in @(
            (Join-Path $scratch "cloudflared.exe"),
            (Join-Path $scratch "cloudflared"))) {
        if (Test-Path $candidate) { $cloudflared = $candidate; break }
    }
    if (-not $cloudflared) {
        $onPath = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
        if ($onPath) { $cloudflared = $onPath.Source }
    }

    $config = Join-Path $scratch "cloudflared-bridge.yml"
    if (-not $cloudflared) {
        Log "ERROR cloudflared not found (expected .scratch\cloudflared.exe)"
    } elseif (-not (Test-Path $config)) {
        Log "ERROR tunnel config missing: $config"
    } else {
        # One pre-quoted string: PowerShell 5.1's -ArgumentList joins array
        # items with spaces without quoting, so a repo path containing a space
        # ("E:\lamp tik\...") would split --config into "E:\lamp" + "tik\..."
        # and cloudflared would exit with "open E:\lamp: cannot find the file".
        $tunnelArgs = 'tunnel --config "{0}" run {1}' -f $config, $tunnelName
        try {
            Start-Process -FilePath $cloudflared `
                -ArgumentList $tunnelArgs `
                -WorkingDirectory $root `
                -WindowStyle Hidden `
                -RedirectStandardOutput (Join-Path $scratch "tunnel.out.log") `
                -RedirectStandardError (Join-Path $scratch "tunnel.err.log") | Out-Null
            Log "tunnel $tunnelName started"
        } catch {
            Log "ERROR starting tunnel: $($_.Exception.Message)"
        }
    }
}

# --- readiness ------------------------------------------------------------
$healthy = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $response = Invoke-WebRequest -Uri "https://$tunnelHost/health" -UseBasicParsing -TimeoutSec 6
        if ($response.StatusCode -eq 200) { $healthy = $true; break }
    } catch {
        # tunnel still connecting, or the PC has no network yet
    }
}

if ($healthy) {
    Log "https://$tunnelHost/health answered 200"
} else {
    Log "WARN https://$tunnelHost/health did not answer within 60s (cloudflared retries on its own)"
}

exit 0
