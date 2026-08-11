# Installs git-commitiq on native Windows. Copies files into
# %USERPROFILE%\.commitiq, creates a git-commitiq.cmd shim (so cmd/
# PowerShell can resolve `git commitiq` via PATHEXT), and - since it's
# not on PATH yet the first time - asks before adding it to your User
# PATH. Never edits anything without asking first.
#
#   powershell -ExecutionPolicy Bypass -File \path\to\commitiq\install.ps1
#
# Note: git-commitiq itself is a bash script. Git for Windows always
# bundles bash and this shim calls it directly, so you need Git for
# Windows installed (which you already have, since you're using git).

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallRoot = Join-Path $env:USERPROFILE ".commitiq"
$BinDir = Join-Path $InstallRoot "bin"
$LibDir = Join-Path $InstallRoot "lib"
$UiDir = Join-Path $InstallRoot "ui"

New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
New-Item -ItemType Directory -Force -Path $LibDir | Out-Null
New-Item -ItemType Directory -Force -Path $UiDir | Out-Null

Copy-Item -Path (Join-Path $ScriptDir "bin\git-commitiq") -Destination (Join-Path $BinDir "git-commitiq") -Force
Copy-Item -Path (Join-Path $ScriptDir "bin\git-commitiq.cmd") -Destination (Join-Path $BinDir "git-commitiq.cmd") -Force
Copy-Item -Path (Join-Path $ScriptDir "lib\commitiq_llm.sh") -Destination (Join-Path $LibDir "commitiq_llm.sh") -Force
Copy-Item -Path (Join-Path $ScriptDir "lib\commitiq_config.sh") -Destination (Join-Path $LibDir "commitiq_config.sh") -Force
if (Test-Path (Join-Path $ScriptDir "ui")) {
    Copy-Item -Path (Join-Path $ScriptDir "ui\*") -Destination $UiDir -Recurse -Force
}

Write-Host "[commitiq] installed git-commitiq to $BinDir"

$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
$PathEntries = @()
if ($UserPath) { $PathEntries = $UserPath -split ";" }

if ($PathEntries -contains $BinDir) {
    Write-Host "[commitiq] $BinDir is already on PATH - you're all set."
} else {
    Write-Host ""
    Write-Host "[commitiq] $BinDir is not on your User PATH yet."
    $reply = Read-Host "[commitiq] Add it now? [y/N]"
    if ($reply -match '^(y|yes)$') {
        $newPath = if ($UserPath) { "$UserPath;$BinDir" } else { $BinDir }
        [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
        Write-Host "[commitiq] added to your User PATH - open a new terminal for it to take effect"
    } else {
        Write-Host "[commitiq] skipped. Add this folder to PATH yourself when ready: $BinDir"
    }
}

Write-Host ""
Write-Host "[commitiq] next: run 'git commitiq setup' to configure a provider and API key"
