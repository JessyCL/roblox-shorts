<#
.SYNOPSIS
  Roblox Shorts engine setup for Windows. Checks what is already installed and installs only what is missing.

.DESCRIPTION
  Never uninstalls, upgrades or replaces tools you already have. Every item is reported as
  FOUND / INSTALLED / SKIPPED / FAILED (WARN / PASSED for checks). Safe to re-run any time.
  Installs, only when missing and after asking (or with -Yes):
    Node.js LTS (winget, per-user when possible), engine npm packages (engine\node_modules),
    ffmpeg + ffprobe with libass and librubberband (static build into tools\bin\, PATH untouched),
    uv (per-user), Python 3.12 (uv-managed, only if none is found), the audio venv engine\.venv,
    optional Kokoro offline TTS (-WithKokoro), and the ELEVENLABS_API_KEY user environment variable.
  Then runs smoke tests (a still render and the caption tests) and prints a summary.

.PARAMETER Yes
  Install missing items without asking (unattended). The API key prompt is skipped.

.PARAMETER WithKokoro
  Also install the optional offline Kokoro TTS packages (~1.5 GB) and download its models (~400 MB).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\setup.ps1
  powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Yes -WithKokoro
#>
[CmdletBinding()]
param([switch]$Yes, [switch]$WithKokoro)

# Native tools write progress to stderr; 'Stop' would turn that into errors under Windows PowerShell 5.1.
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$Root = $PSScriptRoot
Set-Location $Root
$Results = New-Object System.Collections.Generic.List[object]
# Same order as engine/lib/config.mjs: engine\.venv, else the original PC's research venv (so setup never shadows it).
$VenvPy = @('engine\.venv', 'research\audio\venvs\kokoro') | ForEach-Object { Join-Path $Root "$_\Scripts\python.exe" } |
  Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $VenvPy) { $VenvPy = Join-Path $Root 'engine\.venv\Scripts\python.exe' }

function Report($Item, $Status, $Detail = '') {
  $Results.Add([pscustomobject]@{ Item = $Item; Status = $Status; Detail = $Detail })
  $color = @{ FOUND = 'Green'; PASSED = 'Green'; INSTALLED = 'Cyan'; SKIPPED = 'Yellow'; WARN = 'Yellow'; FAILED = 'Red' }[$Status]
  Write-Host ('{0,-10} {1,-24} {2}' -f $Status, $Item, $Detail) -ForegroundColor $color
}
function Ask($Question) {
  if ($Yes) { return $true }
  $a = Read-Host "$Question [Y/n]"
  return ($a -eq '' -or $a -match '^\s*y(es)?\s*$')
}
function Has($Cmd) { return [bool](Get-Command $Cmd -ErrorAction SilentlyContinue) }
function Refresh-Path {
  # pick up PATH entries added by installers without opening a new terminal
  $env:Path = $env:Path + ';' + [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') + ";$env:USERPROFILE\.local\bin"
}
function Winget-Install($Id) {
  if (-not (Has winget)) { Write-Host "  winget is not available"; return $false }
  & winget install -e --id $Id --scope user --silent --accept-package-agreements --accept-source-agreements | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  no per-user installer for $Id; trying the default scope (Windows may ask for admin)"
    & winget install -e --id $Id --silent --accept-package-agreements --accept-source-agreements | Out-Host
  }
  $ok = ($LASTEXITCODE -eq 0)
  Refresh-Path
  return $ok
}
function Node-Major {
  if (-not (Has node)) { return 0 }
  if ((& node -v) -match '^v(\d+)') { return [int]$Matches[1] }
  return 0
}
function Set-Config($Key, $Value) {
  # in-place edit keeps the file's formatting; UTF-8 without BOM (Node and Python JSON parsers reject a BOM)
  $p = Join-Path $Root 'engine\config.json'
  $t = [IO.File]::ReadAllText($p) -replace ('("' + $Key + '"\s*:\s*)"[^"]*"'), ('$1"' + $Value + '"')
  [IO.File]::WriteAllText($p, $t, (New-Object Text.UTF8Encoding $false))
}
function Resolve-Tool($Name) {
  # same rules as engine/lib/config.mjs: config value, else tools\bin\<name>.exe, else PATH
  $v = (Get-Content (Join-Path $Root 'engine\config.json') -Raw | ConvertFrom-Json).$Name
  if (-not $v -and (Test-Path "$Root\tools\bin\$Name.exe")) { return "$Root\tools\bin\$Name.exe" }
  if (-not $v) { $v = $Name }
  if ($v -match '[\\/]') { if ([IO.Path]::IsPathRooted($v)) { return $v } else { return (Join-Path $Root $v) } }
  $c = Get-Command $v -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($c) { return $c.Source } else { return $null }
}
function Test-Ffmpeg($Exe) {
  # returns $null when usable, else the reason
  if (-not $Exe -or -not (Test-Path $Exe)) { return 'not found' }
  $f = (& $Exe -hide_banner -filters 2>$null) -join "`n"
  if ($LASTEXITCODE -ne 0) { return 'does not run' }
  $miss = @('subtitles', 'rubberband') | Where-Object { $f -notmatch "\s$_\s" }
  if ($miss) { return 'lacks the ' + ($miss -join ' + ') + ' filter (needs libass + librubberband)' }
  return $null
}
function Install-Reqs($Label, $File) {
  $dry = (& uv pip install --dry-run -r $File --python $VenvPy 2>&1 | ForEach-Object { "$_" }) -join "`n"
  if ($LASTEXITCODE -eq 0 -and $dry -match 'Would make no changes') { Report $Label FOUND "all of $File satisfied"; return $true }
  if (-not (Ask "Install $Label ($File) into engine\.venv?")) { Report $Label SKIPPED "uv pip install -r $File"; return $false }
  & uv pip install -r $File --python $VenvPy | Out-Host
  if ($LASTEXITCODE -eq 0) { Report $Label INSTALLED $File; return $true }
  Report $Label FAILED "uv pip install -r $File failed (see above)"; return $false
}

Write-Host "Roblox Shorts setup in $Root" -ForegroundColor White
Write-Host "Checks first; installs only what is missing; never replaces your existing tools.`n"

# --- Node.js >= 20 --------------------------------------------------------------------------------------------
$nm = Node-Major
# the mix passes one absolute path per SFX to ffmpeg; Windows caps command lines at 32K characters
if ($Root.Length -gt 60) { Report 'Project path' WARN "$($Root.Length) chars long; mixes with many SFX can fail (WinError 206): move the folder to e.g. C:\RobloxShorts" }
else { Report 'Project path' FOUND $Root }
if ($nm -ge 20) { Report 'Node.js' FOUND (& node -v) }
elseif ($nm -gt 0) { Report 'Node.js' FAILED "$(& node -v) is older than v20. Upgrade it yourself (winget upgrade OpenJS.NodeJS.LTS, or nvm-windows); setup does not replace it." }
elseif (Ask 'Node.js >= 20 is missing. Install Node.js LTS with winget?') {
  $null = Winget-Install 'OpenJS.NodeJS.LTS'
  if ((Node-Major) -ge 20) { Report 'Node.js' INSTALLED (& node -v) } else { Report 'Node.js' FAILED 'install Node.js LTS from https://nodejs.org, open a new terminal, re-run' }
}
else { Report 'Node.js' SKIPPED 'required for everything' }
$nodeOk = (Node-Major) -ge 20

# --- engine npm packages --------------------------------------------------------------------------------------
$npmOk = $false
if (-not $nodeOk) { Report 'npm packages' SKIPPED 'needs Node.js' }
else {
  Push-Location "$Root\engine"
  if (Test-Path 'node_modules') { & npm ls --depth=0 *> $null; $npmOk = ($LASTEXITCODE -eq 0) }
  if ($npmOk) { Report 'npm packages' FOUND 'engine\node_modules matches package-lock.json' }
  elseif (Ask 'Install the engine npm packages (npm ci in engine\, project-local)?') {
    & npm ci --no-audit --no-fund | Out-Host
    if ($LASTEXITCODE -ne 0) { & npm install --no-audit --no-fund | Out-Host }
    $npmOk = ($LASTEXITCODE -eq 0)
    if ($npmOk) { Report 'npm packages' INSTALLED 'engine\node_modules' } else { Report 'npm packages' FAILED 'npm ci / npm install failed (see above)' }
  }
  else { Report 'npm packages' SKIPPED 'run: cd engine; npm ci' }
  Pop-Location
}

# --- Chrome / Edge + headless WebGL GPU probe (engine/lib/chrome.mjs) -----------------------------------------
$gpuOk = $false
if (-not $npmOk) { Report 'Chrome/Edge' SKIPPED 'needs the npm packages'; Report 'GPU (WebGL)' SKIPPED 'needs the npm packages' }
else {
  $probe = "import('./engine/lib/chrome.mjs').then(async (m) => { console.log(m.CHROME); console.log(await m.gpuRenderer()) }).catch((e) => { console.log('ERROR ' + e.message.split('\n')[0]); process.exit(1) })"
  $out = @(& node -e $probe 2>$null | ForEach-Object { "$_" })
  $code = $LASTEXITCODE
  if (-not $out -or -not (Test-Path $out[0])) {
    Report 'Chrome/Edge' FAILED 'install Google Chrome (or set the CHROME_PATH user env var to chrome.exe / msedge.exe)'
    Report 'GPU (WebGL)' SKIPPED 'needs Chrome/Edge'
  }
  else {
    Report 'Chrome/Edge' FOUND $out[0]
    $r = $out[-1]
    if ($code -ne 0) { Report 'GPU (WebGL)' FAILED $r }
    elseif ($r -match 'SwiftShader|Basic Render|llvmpipe|no WebGL2') { Report 'GPU (WebGL)' WARN "$r = software rendering; the engine refuses it (update GPU drivers, avoid Remote Desktop)" }
    else { Report 'GPU (WebGL)' FOUND $r; $gpuOk = $true }
  }
}

# --- ffmpeg / ffprobe with libass + librubberband -------------------------------------------------------------
$ff = Resolve-Tool 'ffmpeg'
$why = Test-Ffmpeg $ff
if (-not $why -and -not (Resolve-Tool 'ffprobe')) { $why = 'has no ffprobe next to it' }
if (-not $why) { Report 'ffmpeg/ffprobe' FOUND "$ff (libass + rubberband)" }
elseif (Ask "ffmpeg $why. Download a static GPL build (BtbN, ~200 MB) into tools\bin\ (project-local, PATH unchanged)?") {
  $dl = Join-Path $env:TEMP ('roblox-shorts-ffmpeg-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  New-Item -ItemType Directory -Force $dl | Out-Null
  & curl.exe -fL --retry 3 -o "$dl\ffmpeg.zip" 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'
  if ($LASTEXITCODE -eq 0) { & tar.exe -xf "$dl\ffmpeg.zip" -C $dl }
  $bin = Get-ChildItem $dl -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1
  if ($bin) {
    New-Item -ItemType Directory -Force "$Root\tools\bin" | Out-Null
    Copy-Item (Join-Path $bin.DirectoryName 'ffmpeg.exe'), (Join-Path $bin.DirectoryName 'ffprobe.exe') "$Root\tools\bin\" -Force
  }
  Remove-Item $dl -Recurse -Force -ErrorAction SilentlyContinue
  $why = Test-Ffmpeg "$Root\tools\bin\ffmpeg.exe"
  if (-not $why) {
    Set-Config 'ffmpeg' 'tools/bin/ffmpeg.exe'; Set-Config 'ffprobe' 'tools/bin/ffprobe.exe'
    Report 'ffmpeg/ffprobe' INSTALLED 'tools\bin\ (engine\config.json updated)'
  }
  else { Report 'ffmpeg/ffprobe' FAILED "download or extract failed: $why" }
}
else { Report 'ffmpeg/ffprobe' SKIPPED "ffmpeg $why" }
$ffOk = -not $why

# --- uv ---------------------------------------------------------------------------------------------------------
if (Has uv) { Report 'uv' FOUND (& uv --version) }
elseif (Ask 'uv (Python package manager, per-user, no admin) is missing. Install it?') {
  $null = Winget-Install 'astral-sh.uv'
  if (-not (Has uv)) { & powershell -NoProfile -ExecutionPolicy Bypass -Command 'irm https://astral.sh/uv/install.ps1 | iex' | Out-Host; Refresh-Path }
  if (Has uv) { Report 'uv' INSTALLED (& uv --version) } else { Report 'uv' FAILED 'see https://docs.astral.sh/uv/getting-started/installation/' }
}
else { Report 'uv' SKIPPED 'needed for the audio venv' }

# --- Python 3.12 + audio venv engine\.venv ---------------------------------------------------------------------
$venvOk = Test-Path $VenvPy
if ($venvOk) { Report 'Python venv' FOUND "$($VenvPy.Substring($Root.Length + 1)) ($(& $VenvPy --version))" }
elseif (-not (Has uv)) { Report 'Python venv' SKIPPED 'needs uv' }
else {
  $py = & uv python find 3.12 2>$null
  if ($LASTEXITCODE -eq 0 -and $py) { Report 'Python 3.12' FOUND $py }
  elseif (Ask 'No Python 3.12 found. Install a uv-managed Python 3.12 (per-user; other Pythons untouched)?') {
    & uv python install 3.12 | Out-Host
    $py = & uv python find 3.12 2>$null
    if ($LASTEXITCODE -eq 0 -and $py) { Report 'Python 3.12' INSTALLED $py } else { Report 'Python 3.12' FAILED 'uv python install 3.12 failed'; $py = $null }
  }
  else { Report 'Python 3.12' SKIPPED 'needed for the audio venv'; $py = $null }
  if ($py -and (Ask 'Create the project audio venv engine\.venv?')) {
    & uv venv --python $py "$Root\engine\.venv" | Out-Host
    $venvOk = Test-Path $VenvPy
    if ($venvOk) { Report 'Python venv' INSTALLED 'engine\.venv' } else { Report 'Python venv' FAILED 'uv venv failed (see above)' }
  }
  elseif ($py) { Report 'Python venv' SKIPPED 'uv venv engine\.venv' }
}

# --- Python packages (+ optional Kokoro) ------------------------------------------------------------------------
$pyOk = $false
if ($venvOk -and (Has uv)) {
  if (Install-Reqs 'Audio packages' 'engine\audio\requirements.txt') {
    & $VenvPy -I -c 'import numpy, scipy, soundfile' 2>$null
    $pyOk = ($LASTEXITCODE -eq 0)
    if (-not $pyOk) { Report 'Audio packages' FAILED 'import check failed in engine\.venv' }
  }
  if (-not $WithKokoro) { Report 'Kokoro TTS (optional)' SKIPPED 'offline voice: re-run with -WithKokoro' }
  elseif (Install-Reqs 'Kokoro TTS packages' 'engine\audio\requirements-kokoro.txt') {
    $hfDir = (Get-Content "$Root\engine\config.json" -Raw | ConvertFrom-Json).hf_kokoro
    $have = @("$Root\$hfDir", "$Root\research\audio\dl\hf-kokoro") | Where-Object { Test-Path "$_\hub\models--hexgrad--Kokoro-82M\snapshots\*\kokoro-v1_0.pth" }
    if ($have) { Report 'Kokoro models' FOUND (@($have)[0]) }
    elseif (Ask 'Download the Kokoro-82M and Whisper base.en models (~400 MB) into models\?') {
      & $VenvPy -I -X utf8 "$Root\engine\audio\fetch_models.py" | Out-Host
      if ($LASTEXITCODE -eq 0) { Report 'Kokoro models' INSTALLED $hfDir } else { Report 'Kokoro models' FAILED 'fetch_models.py failed (see above)' }
    }
    else { Report 'Kokoro models' SKIPPED 'they download on the first TTS run' }
  }
}
else { Report 'Audio packages' SKIPPED 'needs engine\.venv and uv' }

# --- ElevenLabs API key (user environment variable; never written to a file or printed) -----------------------
$key = [Environment]::GetEnvironmentVariable('ELEVENLABS_API_KEY', 'User')
if (-not $key) { $key = $env:ELEVENLABS_API_KEY }
if ($key) { Report 'ElevenLabs API key' FOUND 'ELEVENLABS_API_KEY is set' }
elseif ($Yes) { Report 'ElevenLabs API key' SKIPPED 'not set; re-run setup.ps1 without -Yes to enter it' }
else {
  $sec = Read-Host 'ElevenLabs API key for TTS/SFX (input hidden, Enter to skip)' -AsSecureString
  $plain = $null
  if ($sec -and $sec.Length -gt 0) {
    $b = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($b).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($b) }
  }
  if ($plain) {
    [Environment]::SetEnvironmentVariable('ELEVENLABS_API_KEY', $plain, 'User')
    $env:ELEVENLABS_API_KEY = $plain
    Report 'ElevenLabs API key' INSTALLED 'saved as a user env var (open a new terminal / restart Claude Code)'
  }
  else { Report 'ElevenLabs API key' SKIPPED 'needed for ElevenLabs voice + SFX; re-run setup.ps1 to add it' }
  $plain = $null
}

# --- fonts + asset library ------------------------------------------------------------------------------------
$fonts = @(Get-ChildItem "$Root\assets\fonts" -Filter '*.ttf' -ErrorAction SilentlyContinue)
if ($fonts.Count -and (Test-Path "$Root\assets\fonts\Poppins-Bold.ttf")) { Report 'Fonts' FOUND "$($fonts.Count) in assets\fonts (captions: Poppins Bold)" }
else { Report 'Fonts' FAILED 'assets\fonts\Poppins-Bold.ttf missing: copy assets\ from the package' }
$lib = "$Root\assets\library"
$music = @(Get-ChildItem "$lib\music" -Filter '*.mp3' -ErrorAction SilentlyContinue).Count
$sfx = @(Get-ChildItem "$lib\sfx" -Recurse -File -Include '*.wav', '*.ogg', '*.mp3' -ErrorAction SilentlyContinue).Count
$glb = @(Get-ChildItem $lib -Recurse -Filter '*.glb' -ErrorAction SilentlyContinue).Count
if ((Test-Path "$lib\manifest.jsonl") -and $music -and $sfx) { Report 'Asset library' FOUND "$music music, $sfx sfx, $glb models" }
else { Report 'Asset library' FAILED "assets\library incomplete ($music music, $sfx sfx, manifest: $(Test-Path "$lib\manifest.jsonl"))" }

# --- helpers used by the workflow (check only) -----------------------------------------------------------------
if (Has git) { Report 'Git Bash' FOUND 'bash tools/auditions.sh (music auditions)' } else { Report 'Git Bash' SKIPPED 'optional: winget install Git.Git (music audition clips, Claude Code)' }
if (Has claude) { Report 'Claude Code' FOUND 'drives the roblox-shorts skill' } else { Report 'Claude Code' SKIPPED 'optional: https://claude.com/claude-code (the skill workflow)' }

# --- smoke tests -------------------------------------------------------------------------------------------------
if ($nodeOk) {
  & node --test "$Root\engine\captions\ass.test.mjs" *> $null
  if ($LASTEXITCODE -eq 0) { Report 'Smoke: caption tests' PASSED 'node --test engine/captions/ass.test.mjs' } else { Report 'Smoke: caption tests' FAILED 'run node --test engine/captions/ass.test.mjs' }
}
if ($npmOk -and $gpuOk -and $ffOk) {
  & node engine/cli/still.mjs productions/_smoke --t 1 --preview | Out-Host
  if ($LASTEXITCODE -eq 0) { Report 'Smoke: still render' PASSED 'productions\_smoke\stills\t1_00.png' } else { Report 'Smoke: still render' FAILED 'see the output above' }
}
else { Report 'Smoke: still render' SKIPPED 'needs npm packages, a hardware GPU and ffmpeg' }

# --- summary -----------------------------------------------------------------------------------------------------
Write-Host "`nSummary" -ForegroundColor White
$Results | Format-Table -AutoSize -Wrap | Out-Host
$failed = @($Results | Where-Object { $_.Status -eq 'FAILED' })
if ($failed.Count) { Write-Host "$($failed.Count) item(s) FAILED - fix them and re-run setup.ps1 (it skips what is already done)." -ForegroundColor Red }
else { Write-Host 'Ready.' -ForegroundColor Green }
Write-Host @'

Next steps
  1. Open a NEW terminal in this folder (so new env vars / PATH apply) and start Claude Code:  claude
  2. Ask: "Make a Roblox short: Everyone has a ___" - the roblox-shorts skill walks through
     script -> voice -> storyboard stills -> preview -> music auditions -> final MP4.
  3. Manual commands and troubleshooting: README.md
'@
exit ([int]($failed.Count -gt 0))
