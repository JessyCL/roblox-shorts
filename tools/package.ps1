<#
.SYNOPSIS
  Build dist\roblox-shorts-<yyyyMMdd>.zip: everything another PC needs (then run setup.ps1 there), nothing heavy.

.DESCRIPTION
  Includes engine\ (no node_modules / .venv / __pycache__), the roblox-shorts skill, the analysis docs (top-level
  .md/.json + videos\*\report.md + data.json), assets\ (minus _staging), productions\_smoke, proto_ticket and
  everyone-has-one-hand sources (no renders / out / stills / auditions / cache), tools\auditions.sh,
  extract_report.mjs, package.ps1, setup.ps1 and README.md. Excludes reference\, research\, tools\.venv,
  tools\_downloads, tools\bin, models\ and dist\ (by only listing what goes in).
  Verifies the zip by extracting it to a temp folder and checking key files.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\package.ps1
#>
param([string]$Out)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$SkipDirs = 'node_modules', '.venv', '__pycache__', '_staging', 'renders', 'out', 'stills', 'auditions', 'cache'
$SkipFiles = '*.log', '*.pyc'
function Tree($Dir) {
  # every file under $Dir, minus generated / heavy folders
  foreach ($i in Get-ChildItem -LiteralPath $Dir -Force) {
    if ($i.PSIsContainer) { if ($SkipDirs -notcontains $i.Name) { Tree $i.FullName } }
    elseif (-not ($SkipFiles | Where-Object { $i.Name -like $_ })) { $i.FullName }
  }
}
function Files($Pattern) { Get-ChildItem -Path (Join-Path $Root $Pattern) -File -ErrorAction SilentlyContinue | ForEach-Object { $_.FullName } }

$hand = "$Root\productions\everyone-has-one-hand"
$explicit = @('script.json', 'production.js', 'sets.js', 'shot_plan.json', 'sfx_plan.json', 'sfx_list.json', 'cues.json',
  'timing.json', 'captions.ass', 'captions.json', 'audio\narration.wav') | ForEach-Object { "$hand\$_" }
$explicit += 'setup.ps1', 'README.md', 'tools\auditions.sh', 'tools\extract_report.mjs', 'tools\package.ps1' | ForEach-Object { "$Root\$_" }
$missing = @($explicit | Where-Object { -not (Test-Path -LiteralPath $_) })
if ($missing.Count) { Write-Warning ("not found, skipped: " + ($missing -join ', ')) }

$files = @(
  Tree "$Root\engine"
  Tree "$Root\.claude\skills\roblox-shorts"
  Files 'analysis\*.md'; Files 'analysis\*.json'; Files 'analysis\videos\*\report.md'; Files 'analysis\videos\*\data.json'
  Tree "$Root\assets"
  Tree "$Root\productions\_smoke"
  Tree "$Root\productions\proto_ticket" | Where-Object { $_ -notmatch '\\audio\\' -or $_ -like '*\audio\narration.wav' }
  Tree "$hand\sfx"  # bespoke ElevenLabs SFX that script.json cues as sfx/<name>: the mix needs them
  $explicit | Where-Object { Test-Path -LiteralPath $_ }
) | Sort-Object -Unique

$zipPath = if ($Out) { $Out } else { Join-Path $Root ("dist\roblox-shorts-{0}.zip" -f (Get-Date -Format yyyyMMdd)) }
New-Item -ItemType Directory -Force (Split-Path $zipPath) | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Write-Host "Packing $($files.Count) files -> $zipPath"
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')
try {
  foreach ($f in $files) {
    $name = $f.Substring($Root.Length + 1).Replace('\', '/')  # forward slashes: portable zip entry names
    $level = if ($f -match '\.(mp3|ogg|png|jpe?g|webp|glb|mp4|zip)$') { 'NoCompression' } else { 'Optimal' }  # already compressed
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f, $name, $level)
  }
}
finally { $zip.Dispose() }

# --- verify: extract to a temp folder and check key files ------------------------------------------------------
$tmp = Join-Path $env:TEMP ('roblox-shorts-verify-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $tmp)
$key = 'setup.ps1', 'README.md', 'engine\package.json', 'engine\package-lock.json', 'engine\config.json', 'engine\lib\config.mjs',
  'engine\lib\chrome.mjs', 'engine\cli\make.mjs', 'engine\cli\still.mjs', 'engine\runtime\index.html', 'engine\captions\ass.test.mjs',
  'engine\audio\requirements.txt', 'engine\audio\requirements-kokoro.txt', 'engine\audio\fetch_models.py', 'engine\audio\mix.py',
  '.claude\skills\roblox-shorts\SKILL.md', 'analysis\STORY_AUDIO_FORMULA.md', 'analysis\story_audio.json', 'analysis\SCREEN_GRAMMAR.md',
  'analysis\STYLE_BIBLE.md', 'assets\fonts\Poppins-Bold.ttf', 'assets\library\manifest.jsonl', 'productions\_smoke\production.js',
  'productions\proto_ticket\script.json', 'productions\proto_ticket\production.js', 'productions\proto_ticket\timing.json',
  'productions\proto_ticket\audio\narration.wav', 'productions\everyone-has-one-hand\script.json',
  'productions\everyone-has-one-hand\timing.json', 'productions\everyone-has-one-hand\audio\narration.wav', 'tools\auditions.sh'
$problems = @($key | Where-Object { -not (Test-Path (Join-Path $tmp $_)) } | ForEach-Object { "missing $_" })
$problems += @(Get-ChildItem $tmp -Recurse -Directory | Where-Object { $SkipDirs -contains $_.Name -and $_.FullName -notlike '*\voices\auditions' } | ForEach-Object { "leaked folder $($_.Name)" })
$problems += @('reference', 'research', 'dist', 'models', 'tools\bin', 'tools\.venv', 'tools\_downloads', 'analysis\preprocess') |
  Where-Object { Test-Path (Join-Path $tmp $_) } | ForEach-Object { "leaked $_" }
if ((Get-Content "$tmp\engine\config.json" -Raw) -match '[A-Za-z]:[\\/]') { $problems += 'engine\config.json has an absolute path' }

# --- report ------------------------------------------------------------------------------------------------------
Remove-Item $tmp -Recurse -Force
$z = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try { $all = @($z.Entries | Select-Object FullName, Length) } finally { $z.Dispose() }
$all | Group-Object { $_.FullName.Split('/')[0] } | Sort-Object Name | ForEach-Object {
  '  {0,-14} {1,6} files {2,9:N1} MB' -f $_.Name, $_.Count, (($_.Group | Measure-Object Length -Sum).Sum / 1MB)
} | Write-Host
$mb = (Get-Item $zipPath).Length / 1MB
Write-Host ('{0}: {1} files, {2:N1} MB zipped, {3:N1} MB unpacked' -f $zipPath, $all.Count, $mb, (($all | Measure-Object Length -Sum).Sum / 1MB))
if ($problems.Count) { $problems | ForEach-Object { Write-Host "FAILED $_" -ForegroundColor Red }; exit 1 }
Write-Host 'Verified: key files present, no excluded folders, config.json portable.' -ForegroundColor Green
Write-Host 'On the other PC: unzip, then run  powershell -ExecutionPolicy Bypass -File .\setup.ps1'
