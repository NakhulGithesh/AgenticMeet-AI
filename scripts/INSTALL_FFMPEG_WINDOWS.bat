@echo off
echo ========================================
echo FFmpeg Installation Helper for Windows
echo ========================================
echo.
echo This script will guide you through installing FFmpeg.
echo.
echo Option 1: Install Chocolatey first (Recommended)
echo Option 2: Manual installation (you'll need to download manually)
echo.
echo.

:MENU
echo Select an option:
echo 1. Install Chocolatey and FFmpeg (automatic)
echo 2. Show manual installation instructions
echo 3. Check if FFmpeg is already installed
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto INSTALL_CHOCO
if "%choice%"=="2" goto MANUAL
if "%choice%"=="3" goto CHECK
if "%choice%"=="4" goto END

echo Invalid choice. Please try again.
goto MENU

:INSTALL_CHOCO
echo.
echo Installing Chocolatey...
echo This requires Administrator privileges.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Chocolatey installation failed.
    echo Please make sure you are running this as Administrator.
    pause
    goto MENU
)

echo.
echo Chocolatey installed successfully!
echo Now installing FFmpeg...
echo.

choco install ffmpeg -y

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: FFmpeg installation failed.
    pause
    goto MENU
)

echo.
echo ========================================
echo FFmpeg installed successfully!
echo ========================================
echo.
echo IMPORTANT: You MUST restart your terminal/PowerShell
echo and Streamlit app for the changes to take effect.
echo.
pause
goto END

:MANUAL
echo.
echo ========================================
echo Manual Installation Instructions
echo ========================================
echo.
echo 1. Download FFmpeg:
echo    - Go to: https://www.gyan.dev/ffmpeg/builds/
echo    - Download: ffmpeg-release-full.7z
echo.
echo 2. Extract the archive:
echo    - Extract to: C:\ffmpeg
echo    - You should have: C:\ffmpeg\bin\ffmpeg.exe
echo.
echo 3. Add to PATH:
echo    a. Press Win + X, select "System"
echo    b. Click "Advanced system settings"
echo    c. Click "Environment Variables"
echo    d. Under "System variables", find and select "Path"
echo    e. Click "Edit"
echo    f. Click "New"
echo    g. Add: C:\ffmpeg\bin
echo    h. Click "OK" on all windows
echo.
echo 4. Restart your terminal and run:
echo    ffmpeg -version
echo.
pause
goto MENU

:CHECK
echo.
echo Checking for FFmpeg...
echo.
ffmpeg -version 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! FFmpeg is installed and working!
    echo ========================================
    echo.
    echo You can now run: streamlit run _app.py
    echo.
) else (
    echo.
    echo ========================================
    echo FFmpeg is NOT installed or not in PATH
    echo ========================================
    echo.
    echo Please choose option 1 or 2 to install it.
    echo.
)
pause
goto MENU

:END
echo.
echo Exiting...
exit
