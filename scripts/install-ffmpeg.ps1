# FFmpeg Auto-Installer for Windows
# Run this script as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "FFmpeg Automatic Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click on PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✓ Running as Administrator" -ForegroundColor Green
Write-Host ""

# Check if FFmpeg is already installed
Write-Host "Checking if FFmpeg is already installed..." -ForegroundColor Yellow
$ffmpegInstalled = $false
try {
    $ffmpegVersion = & ffmpeg -version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ FFmpeg is already installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host $ffmpegVersion[0]
        Write-Host ""
        Write-Host "You can now run: streamlit run _app.py" -ForegroundColor Green
        pause
        exit 0
    }
} catch {
    $ffmpegInstalled = $false
}

Write-Host "FFmpeg is not installed. Installing now..." -ForegroundColor Yellow
Write-Host ""

# Check if Chocolatey is installed
Write-Host "Checking for Chocolatey package manager..." -ForegroundColor Yellow
$chocoInstalled = $false
try {
    $chocoVersion = & choco --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Chocolatey is already installed" -ForegroundColor Green
        $chocoInstalled = $true
    }
} catch {
    $chocoInstalled = $false
}

if (-not $chocoInstalled) {
    Write-Host "Installing Chocolatey package manager..." -ForegroundColor Yellow
    Write-Host "This may take a minute..." -ForegroundColor Cyan
    Write-Host ""

    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ Chocolatey installed successfully!" -ForegroundColor Green
            Write-Host ""

            # Refresh environment variables
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        } else {
            throw "Chocolatey installation failed"
        }
    } catch {
        Write-Host "✗ Failed to install Chocolatey: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please try manual installation instead:" -ForegroundColor Yellow
        Write-Host "See: FFMPEG_INSTALLATION.md" -ForegroundColor Yellow
        pause
        exit 1
    }
}

# Install FFmpeg
Write-Host "Installing FFmpeg..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan
Write-Host ""

try {
    & choco install ffmpeg -y

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✓ FFmpeg installed successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""

        # Refresh environment variables
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        # Verify installation
        Write-Host "Verifying installation..." -ForegroundColor Yellow
        $ffmpegVersion = & ffmpeg -version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✓ FFmpeg is working correctly!" -ForegroundColor Green
            Write-Host ""
            Write-Host $ffmpegVersion[0] -ForegroundColor Cyan
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host "NEXT STEPS:" -ForegroundColor Cyan
            Write-Host "========================================" -ForegroundColor Cyan
            Write-Host "1. CLOSE this PowerShell window" -ForegroundColor Yellow
            Write-Host "2. OPEN a new PowerShell window" -ForegroundColor Yellow
            Write-Host "3. Run: streamlit run _app.py" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Your AgenticMeet AI app is ready to use!" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "⚠ FFmpeg installed but not yet in PATH" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Please:" -ForegroundColor Yellow
            Write-Host "1. CLOSE this PowerShell window" -ForegroundColor Yellow
            Write-Host "2. OPEN a new PowerShell window" -ForegroundColor Yellow
            Write-Host "3. Run: ffmpeg -version" -ForegroundColor Yellow
            Write-Host ""
        }
    } else {
        throw "FFmpeg installation failed"
    }
} catch {
    Write-Host "✗ Failed to install FFmpeg: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please try manual installation instead:" -ForegroundColor Yellow
    Write-Host "See: FFMPEG_INSTALLATION.md" -ForegroundColor Yellow
    pause
    exit 1
}

pause
