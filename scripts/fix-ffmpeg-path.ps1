# FFmpeg PATH Fixer
# Run as Administrator

Write-Host "FFmpeg PATH Fixer" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Finding FFmpeg..." -ForegroundColor Yellow

# Common FFmpeg locations
$commonPaths = @(
    "C:\ffmpeg\bin",
    "C:\Program Files\ffmpeg\bin",
    "C:\Program Files (x86)\ffmpeg\bin",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_*\ffmpeg-*\bin",
    "$env:ProgramData\chocolatey\lib\ffmpeg\tools\ffmpeg\bin"
)

$ffmpegPath = $null

# Try to find ffmpeg.exe
foreach ($path in $commonPaths) {
    if ($path -like "*`**") {
        $expanded = Get-ChildItem -Path ($path -replace '\*.*$', '') -ErrorAction SilentlyContinue |
                    Where-Object { $_.FullName -like $path.Replace('*', '*') } |
                    Get-ChildItem -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue |
                    Select-Object -First 1
        if ($expanded) {
            $ffmpegPath = Split-Path $expanded.FullName
            break
        }
    } else {
        if (Test-Path "$path\ffmpeg.exe") {
            $ffmpegPath = $path
            break
        }
    }
}

# Try searching entire C drive (slower)
if (-not $ffmpegPath) {
    Write-Host "Searching C:\ for ffmpeg.exe (this may take a minute)..." -ForegroundColor Yellow
    $found = Get-ChildItem -Path "C:\" -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        $ffmpegPath = Split-Path $found.FullName
    }
}

if ($ffmpegPath) {
    Write-Host "Found FFmpeg at: $ffmpegPath" -ForegroundColor Green
    Write-Host ""

    # Get current system PATH
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

    # Check if already in PATH
    if ($currentPath -split ';' | Where-Object { $_ -eq $ffmpegPath }) {
        Write-Host "FFmpeg is already in System PATH!" -ForegroundColor Green
        Write-Host "The issue might be that you need to restart your computer." -ForegroundColor Yellow
        Write-Host ""
        $restart = Read-Host "Do you want to restart now? (y/n)"
        if ($restart -eq 'y') {
            Restart-Computer
        }
    } else {
        Write-Host "Adding FFmpeg to System PATH..." -ForegroundColor Yellow
        $newPath = $currentPath + ";" + $ffmpegPath
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")

        Write-Host "SUCCESS! FFmpeg added to PATH!" -ForegroundColor Green
        Write-Host ""
        Write-Host "IMPORTANT: You MUST restart for changes to take effect!" -ForegroundColor Yellow
        Write-Host ""
        $restart = Read-Host "Restart computer now? (y/n)"
        if ($restart -eq 'y') {
            Restart-Computer
        } else {
            Write-Host ""
            Write-Host "Please restart manually, then run:" -ForegroundColor Yellow
            Write-Host "streamlit run _app.py" -ForegroundColor Cyan
        }
    }
} else {
    Write-Host "Could not find ffmpeg.exe on your system!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run: ffmpeg -version" -ForegroundColor Yellow
    Write-Host "Then tell me the output so I can locate it" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
