$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = 'http://localhost:4173/'
$pwsh = 'C:\Program Files\PowerShell\7\pwsh.exe'

try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null
}
catch {
    Start-Process -FilePath $pwsh -WindowStyle Hidden -WorkingDirectory $project -ArgumentList @(
        '-NoProfile',
        '-Command',
        'npm run dev -- --host 0.0.0.0 --port 4173 --strictPort'
    )
    Start-Sleep -Seconds 3
}

Start-Process -FilePath 'msedge.exe' -ArgumentList $url
