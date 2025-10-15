# Simple FFmpeg Installer for Windows
# Run as Administrator

Write-Host "FFmpeg Installer for AgenticMeet AI" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Step 1: Checking for FFmpeg..." -ForegroundColor Yellow
$ffmpegExists = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($ffmpegExists) {
    Write-Host "FFmpeg is already installed!" -ForegroundColor Green
    ffmpeg -version | Select-Object -First 1
    Write-Host ""
    Write-Host "You can now run: streamlit run _app.py" -ForegroundColor Green
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host "Step 2: Checking for Chocolatey..." -ForegroundColor Yellow
$chocoExists = Get-Command choco -ErrorAction SilentlyContinue
if (-not $chocoExists) {
    Write-Host "Installing Chocolatey (package manager)..." -ForegroundColor Yellow
    Write-Host "Please wait, this may take 1-2 minutes..." -ForegroundColor Cyan

    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072

    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    # Refresh environment
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    Write-Host "Chocolatey installed!" -ForegroundColor Green
} else {
    Write-Host "Chocolatey already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Installing FFmpeg..." -ForegroundColor Yellow
Write-Host "Please wait, this may take 2-3 minutes..." -ForegroundColor Cyan
Write-Host ""

choco install ffmpeg -y

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. CLOSE this PowerShell window" -ForegroundColor Yellow
Write-Host "2. OPEN a NEW PowerShell" -ForegroundColor Yellow
Write-Host "3. Run: cd $PWD" -ForegroundColor Yellow
Write-Host "4. Run: streamlit run _app.py" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then upload your audio/video file!" -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to exit"
