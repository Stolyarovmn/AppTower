$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$manifest = Join-Path $root 'manifest.json'
$report = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  powershell = $PSVersionTable.PSVersion.ToString()
  windows = [Environment]::OSVersion.VersionString
  cleanroomRoot = $root
  manifestExists = (Test-Path $manifest)
  manifest = $null
  edge = $null
  files = @()
}
if (Test-Path $manifest) {
  $report.manifest = Get-Content $manifest -Raw | ConvertFrom-Json
}
$edgeCandidates = @(
  "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) }
if ($edgeCandidates.Count -gt 0) {
  $edgePath = $edgeCandidates[0]
  $report.edge = [ordered]@{
    path = $edgePath
    version = (Get-Item $edgePath).VersionInfo.ProductVersion
  }
}
Get-ChildItem $root -File -Recurse | Where-Object { $_.FullName -notmatch '\\node_modules\\' } | ForEach-Object {
  $report.files += [ordered]@{
    path = $_.FullName.Substring($root.Length + 1)
    size = $_.Length
    sha256 = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
}
$out = Join-Path $root ("edge-cleanroom-env-{0}.json" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$report | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $out
Write-Host "AppTower Cleanroom environment report: $out"
Write-Host "Edge: $($report.edge.version)"
Write-Host "Next: reproduce the issue, then open Extension details -> Extension options and download the in-extension diagnostics JSON. Send both JSON files."
