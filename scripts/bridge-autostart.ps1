# Start the yt-dlp bridge and a Cloudflare Quick Tunnel, then point production
# at the tunnel's hostname.
#
# Why a quick tunnel instead of the named one: a Cloudflare named tunnel only
# serves a hostname whose zone lives in the same Cloudflare account, and
# lamptik.online's nameservers moved to Netlify. `bridge.lamptik.online` has no
# DNS any more, so `.scratch/cloudflared-bridge.yml` is dormant. A Quick Tunnel
# needs no DNS at all, but its hostname changes every time cloudflared starts —
# so this script writes the new value to Netlify's YTDLP_BRIDGE_URL and triggers
# the build Netlify requires before an environment change takes effect.
#
# Idempotent: a live tunnel whose URL production already uses is reused and no
# build is triggered. Paths are resolved from this script, so the repo can move.
#
# The tunnel runs with `--protocol http2` on purpose. cloudflared defaults to
# QUIC (UDP), and residential ISPs drop UDP often enough that connections die
# with "no recent network activity". HTTP/2 rides TCP and holds.
#
# One-time setup (kept in the gitignored .env.local):
#   NETLIFY_AUTH_TOKEN  Netlify -> Applications -> Personal access tokens.
#                       Tokens expire: this script logs a clear warning when one
#                       stops working (HTTP 401), and the site keeps running on
#                       the JavaScript engines meanwhile.
#   NETLIFY_SITE_ID     Project configuration -> General -> Site information.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/bridge-autostart.ps1
#
# Everything it starts is windowless and logs under .scratch/.

$ErrorActionPreference = "Continue"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$root = Split-Path -Parent $PSScriptRoot
$scratch = Join-Path $root ".scratch"
$logFile = Join-Path $scratch "bridge-autostart.log"
$urlFile = Join-Path $scratch "bridge-url.txt"
$tunnelPidFile = Join-Path $scratch "tunnel.pid"
$quickConfig = Join-Path $scratch "quick-tunnel.yml"
$quickCredentials = Join-Path $scratch "quick-credentials.json"
$tunnelOutLog = Join-Path $scratch "tunnel.out.log"
$tunnelErrLog = Join-Path $scratch "tunnel.err.log"
$port = 7860
$publicBase = "https://lamptik.online"
$netlifyApi = "https://api.netlify.com/api/v1"

if (-not (Test-Path $scratch)) { New-Item -ItemType Directory -Path $scratch | Out-Null }

function Log([string]$message) {
    $line = "{0}  {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $message
    Add-Content -Path $logFile -Value $line -Encoding utf8
}

# --- .env.local -----------------------------------------------------------
# Read once. Values are never written to the log; this file holds the bridge
# secret and the Netlify token.
function Read-EnvLocal {
    $values = @{}
    $envFile = Join-Path $root ".env.local"
    if (-not (Test-Path $envFile)) { return $values }
    foreach ($line in Get-Content -Path $envFile -Encoding utf8) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }
    return $values
}

$envLocal = Read-EnvLocal

function Setting([string]$name) {
    if ($envLocal.ContainsKey($name) -and $envLocal[$name]) { return [string]$envLocal[$name] }
    $value = [Environment]::GetEnvironmentVariable($name)
    if ($value) { return $value }
    return $null
}

# Replace (or append) one key without touching the other lines. Used for the
# tunnel URL only; the secret and the token never pass through here.
function Set-EnvLocalValue([string]$key, [string]$value) {
    $envFile = Join-Path $root ".env.local"
    $lines = @()
    if (Test-Path $envFile) { $lines = [System.IO.File]::ReadAllLines($envFile) }
    $found = $false
    $updated = foreach ($line in $lines) {
        if ($line -match ("^\s*" + [regex]::Escape($key) + "\s*=")) { $found = $true; "$key=$value" } else { $line }
    }
    if (-not $found) { $updated = @($updated) + "$key=$value" }
    [System.IO.File]::WriteAllLines($envFile, $updated, (New-Object System.Text.UTF8Encoding($false)))
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
        $secret = Setting "BRIDGE_SECRET"
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

# --- quick tunnel ---------------------------------------------------------
# Cloudflare anycast addresses used for the health probe. The LAN resolver on
# this network intermittently returns nothing for *.trycloudflare.com (1.1.1.1
# answers, the router does not), which made a live tunnel look dead. Pinning the
# edge address keeps the check honest: Host/SNI still choose the tunnel.
$edgeIPs = @("104.16.231.132", "104.16.232.132")

function Test-Health([string]$base, [int]$timeoutSeconds = 8) {
    $uri = [Uri]$base
    $curl = Join-Path $env:SystemRoot "System32\curl.exe"
    if (Test-Path $curl) {
        foreach ($ip in $edgeIPs) {
            $code = & $curl -s -o NUL -w '%{http_code}' -m $timeoutSeconds --resolve "$($uri.Host):443:$ip" "https://$($uri.Host)/health"
            if ($LASTEXITCODE -eq 0 -and $code -eq "200") { return $true }
        }
        return $false
    }
    try {
        $response = Invoke-WebRequest -Uri "$base/health" -UseBasicParsing -TimeoutSec $timeoutSeconds
        return ($response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Get-QuickTunnels {
    try {
        return @(Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction Stop |
            Where-Object {
                $_.CommandLine -and
                $_.CommandLine -notlike "*cloudflared-bridge.yml*" -and
                ($_.CommandLine -like "*--url http://127.0.0.1:$port*" -or
                 $_.CommandLine -like "*quick-tunnel.yml*")
            })
    } catch {
        Log "WARN could not inspect cloudflared processes: $($_.Exception.Message)"
        return @()
    }
}

function Find-Cloudflared {
    foreach ($candidate in @(
            (Join-Path $scratch "cloudflared.exe"),
            (Join-Path $scratch "cloudflared"))) {
        if (Test-Path $candidate) { return $candidate }
    }
    $onPath = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
    if ($onPath) { return $onPath.Source }
    return $null
}

$publicUrl = $null
if (Test-Path $urlFile) { $publicUrl = (Get-Content -Path $urlFile -Raw).Trim() }

function Get-TrackedTunnel {
    if (-not (Test-Path $tunnelPidFile)) { return $null }
    $trackedId = 0
    $raw = (Get-Content -Path $tunnelPidFile -Raw) -replace '\s', ''
    if (-not [int]::TryParse($raw, [ref]$trackedId)) { return $null }
    $process = Get-Process -Id $trackedId -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -like "cloudflared*") { return $process }
    return $null
}

function Stop-QuickTunnels {
    foreach ($proc in Get-QuickTunnels) {
        try {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
            Log "killed stale cloudflared pid $($proc.ProcessId)"
        } catch {
            Log "WARN could not kill cloudflared pid $($proc.ProcessId): $($_.Exception.Message)"
        }
    }
}

$tracked = Get-TrackedTunnel
if ($tracked -and $publicUrl -and (Test-Health $publicUrl 12)) {
    Log "quick tunnel already healthy at $publicUrl (pid $($tracked.Id)), reused"
} else {
    # Do not fall back to the old URL if this run cannot create a tunnel: it is
    # the value that just failed the health check.
    $publicUrl = $null
    if ($tracked) {
        Log "tracked cloudflared pid $($tracked.Id) is not serving the cached URL - recycling"
        Stop-Process -Id $tracked.Id -Force -ErrorAction SilentlyContinue
    }
    Stop-QuickTunnels
    Start-Sleep -Seconds 2

    $cloudflared = Find-Cloudflared
    if (-not $cloudflared) {
        Log "ERROR cloudflared not found (expected .scratch\cloudflared.exe)"
    } else {
        # `cloudflared tunnel --url` asks api.trycloudflare.com for the tunnel
        # and gives that request 15s. On this network the call routinely takes
        # longer and the CLI gives up, while the same POST answers to
        # Invoke-RestMethod — so ask the API here and hand the connector the
        # credentials + ingress the CLI would have written. Same two steps,
        # just without the 15s client ceiling.
        $tunnel = $null
        for ($attempt = 1; $attempt -le 3 -and -not $tunnel; $attempt++) {
            try {
                $response = Invoke-RestMethod -Uri "https://api.trycloudflare.com/tunnel" `
                    -Method Post -ContentType "application/json" -Body "{}" -TimeoutSec 45
                if ($response.success -and $response.result.id -and $response.result.hostname -and $response.result.secret) {
                    $tunnel = $response.result
                } else {
                    Log "WARN quick tunnel API answered without a tunnel (attempt $attempt)"
                }
            } catch {
                Log "WARN quick tunnel API attempt $attempt failed: $($_.Exception.Message)"
            }
            if (-not $tunnel) { Start-Sleep -Seconds 8 }
        }

        if (-not $tunnel) {
            Log "ERROR could not create a quick tunnel (Netlify keeps its previous URL)"
        } else {
            # The connector authenticates with the tunnel secret; the file lives
            # in .scratch (gitignored) and is replaced on every restart.
            $credentials = @{
                AccountTag   = $tunnel.account_tag
                TunnelSecret = $tunnel.secret
                TunnelID     = $tunnel.id
            } | ConvertTo-Json -Compress
            [System.IO.File]::WriteAllText($quickCredentials, $credentials, (New-Object System.Text.UTF8Encoding($false)))

            $credentialsYaml = $quickCredentials.Replace('\', '/')
            $configLines = @(
                "tunnel: $($tunnel.id)",
                "credentials-file: '$credentialsYaml'",
                "ingress:",
                "  - hostname: $($tunnel.hostname)",
                "    service: http://127.0.0.1:$port",
                "  - service: http_status:404"
            )
            [System.IO.File]::WriteAllText($quickConfig, (($configLines -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding($false)))

            foreach ($file in @($tunnelOutLog, $tunnelErrLog)) {
                if (Test-Path $file) { Remove-Item -Path $file -Force -ErrorAction SilentlyContinue }
            }

            $tunnelArgs = 'tunnel --protocol http2 --no-autoupdate --config "{0}" run' -f $quickConfig
            try {
                $connector = Start-Process -FilePath $cloudflared `
                    -ArgumentList $tunnelArgs `
                    -WorkingDirectory $root `
                    -WindowStyle Hidden `
                    -PassThru `
                    -RedirectStandardOutput $tunnelOutLog `
                    -RedirectStandardError $tunnelErrLog
                Set-Content -Path $tunnelPidFile -Value $connector.Id -Encoding ascii
                Log "quick tunnel $($tunnel.hostname) starting with --protocol http2 (pid $($connector.Id))"
            } catch {
                Log "ERROR starting tunnel: $($_.Exception.Message)"
            }

            for ($i = 0; $i -lt 30; $i++) {
                if (Test-Health "https://$($tunnel.hostname)" 8) {
                    $publicUrl = "https://$($tunnel.hostname)"
                    Set-Content -Path $urlFile -Value $publicUrl -Encoding ascii
                    Log "quick tunnel healthy at $publicUrl"
                    break
                }
                Start-Sleep -Seconds 2
            }
            if (-not $publicUrl) {
                Log "ERROR tunnel $($tunnel.hostname) never answered /health within 60s"
            }
        }
    }
}

if (-not $publicUrl) {
    Log "WARN no public bridge URL this run; production keeps its previous value"
    exit 0
}

# Local dev (`npm run dev`) reads the same value.
if ($envLocal["YTDLP_BRIDGE_URL"] -ne $publicUrl) {
    Set-EnvLocalValue "YTDLP_BRIDGE_URL" $publicUrl
    Log "updated YTDLP_BRIDGE_URL in .env.local"
}

# --- publish the URL to Netlify ------------------------------------------
# Production reads YTDLP_BRIDGE_URL from Netlify, and Netlify only applies an
# environment change after a build, so a changed hostname is followed by one
# build. When the value already matches, nothing is triggered.
function Invoke-Netlify {
    param(
        [string]$Method,
        [string]$Path,
        $Body = $null
    )
    $params = @{
        Uri         = "$netlifyApi$Path"
        Headers     = @{ Authorization = "Bearer $script:netlifyToken" }
        Method      = $Method
        TimeoutSec  = 40
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params["ContentType"] = "application/json"
        $params["Body"] = ($Body | ConvertTo-Json -Depth 10 -Compress)
    }
    return Invoke-RestMethod @params
}

$script:netlifyToken = Setting "NETLIFY_AUTH_TOKEN"
$siteId = Setting "NETLIFY_SITE_ID"

if (-not $script:netlifyToken -or -not $siteId) {
    Log "WARN Netlify is not configured: add NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID to .env.local so the new tunnel URL can reach production"
    exit 0
}

try {
    $site = Invoke-Netlify -Method GET -Path "/sites/$siteId"
    $account = $site.account_slug
} catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -eq 401) {
        Log "ERROR NETLIFY_AUTH_TOKEN was rejected (401). Create a new token in Netlify -> Applications -> Personal access tokens and update .env.local"
    } else {
        Log "ERROR Netlify site lookup failed (status $status): $($_.Exception.Message)"
    }
    exit 0
}

$currentUrl = $null
$envVar = $null
try {
    $envVar = Invoke-Netlify -Method GET -Path "/accounts/$account/env/YTDLP_BRIDGE_URL?site_id=$siteId"
    $currentValue = $envVar.values | Where-Object { $_.context -eq "all" } | Select-Object -First 1
    if (-not $currentValue) { $currentValue = $envVar.values | Select-Object -First 1 }
    if ($currentValue) { $currentUrl = ([string]$currentValue.value).Trim() }
} catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    if ($status -ne 404) {
        Log "WARN could not read YTDLP_BRIDGE_URL from Netlify (status $status): $($_.Exception.Message)"
    }
}

if ($currentUrl -eq $publicUrl) {
    Log "Netlify already points at $publicUrl"
    # The variable matching is not proof the last build applied it: a failed
    # deploy leaves the old value live. Ask production itself once; a rebuild is
    # cheaper than a bridge that stays dark until someone reads this log.
    $productionHealthy = $false
    try {
        $health = Invoke-RestMethod -Uri "$publicBase/api/health" -TimeoutSec 15
        $bridge = $health.youtube.ytdlp.bridges | Select-Object -First 1
        $productionHealthy = [bool]($bridge -and $bridge.reachable -and $health.youtube.ytdlp.bridgeSecretConfigured)
    } catch {
        # unreachable site or no network yet: rebuild and re-check below
    }
    if ($productionHealthy) {
        Log "production already sees the bridge, no build needed"
        exit 0
    }
    Log "WARN production does not report the bridge reachable - rebuilding to re-apply the variable"
} else {
    try {
        $scopes = @("builds", "functions", "runtime", "post_processing")
        if ($envVar -and $envVar.scopes) { $scopes = @($envVar.scopes) }

        # Keep every context the variable already had (this one uses "all") and
        # replace only the hostname.
        $values = @()
        if ($envVar -and $envVar.values) {
            foreach ($entry in $envVar.values) { $values += @{ context = $entry.context; value = $publicUrl } }
        }
        if ($values.Count -eq 0) { $values = @(@{ context = "all"; value = $publicUrl }) }

        $payload = @{
            key       = "YTDLP_BRIDGE_URL"
            is_secret = $false
            scopes    = $scopes
            values    = $values
        }
        if ($envVar) {
            Invoke-Netlify -Method PUT -Path "/accounts/$account/env/YTDLP_BRIDGE_URL?site_id=$siteId" -Body $payload | Out-Null
        } else {
            # First run on a project without the variable: create it at site level.
            Invoke-Netlify -Method POST -Path "/accounts/$account/env?site_id=$siteId" -Body @($payload) | Out-Null
        }
        Log "Netlify YTDLP_BRIDGE_URL set to $publicUrl"
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        Log "ERROR updating Netlify YTDLP_BRIDGE_URL (status $status): $($_.Exception.Message)"
        exit 0
    }
}

try {
    $build = Invoke-Netlify -Method POST -Path "/sites/$siteId/builds" -Body @{ branch = "main"; clear_cache = $false }
    Log "Netlify build queued (build $($build.id), deploy $($build.deploy_id))"
} catch {
    $status = 0
    if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
    Log "ERROR could not trigger the Netlify build (status $status): $($_.Exception.Message)"
    exit 0
}

$deployId = $build.deploy_id
$state = "unknown"
$deployUrl = $null
if ($deployId) {
    for ($i = 0; $i -lt 90; $i++) {
        Start-Sleep -Seconds 5
        try {
            $deploy = Invoke-Netlify -Method GET -Path "/sites/$siteId/deploys/$deployId"
            $state = $deploy.state
            $deployUrl = $deploy.admin_url
        } catch {
            # transient API hiccup - keep polling
            continue
        }
        if ($state -in @("ready", "error", "rejected")) { break }
    }
}

if ($state -ne "ready") {
    Log "ERROR Netlify deploy $deployId ended in state '$state' ($deployUrl)"
    exit 0
}
Log "Netlify deploy $deployId is ready"

# The build is live; confirm production actually sees the tunnel. Netlify can
# take a few seconds to switch the new deploy over.
for ($i = 0; $i -lt 12; $i++) {
    try {
        $health = Invoke-RestMethod -Uri "$publicBase/api/health" -TimeoutSec 15
        $bridge = $health.youtube.ytdlp.bridges | Select-Object -First 1
        if ($bridge -and $bridge.reachable -and $health.youtube.ytdlp.bridgeSecretConfigured) {
            Log "production verified: $publicBase/api/health sees $($bridge.url)"
            exit 0
        }
    } catch {
        # deploy switching over, or no network yet
    }
    Start-Sleep -Seconds 5
}

Log "WARN deploy is live but $publicBase/api/health does not report the bridge reachable yet (check bridgeSecretConfigured and the Netlify deploy log)"
exit 0
