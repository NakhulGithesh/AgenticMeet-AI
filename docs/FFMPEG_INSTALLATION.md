# FFmpeg Installation Guide

FFmpeg is required for AgenticMeet AI to process audio and video files. Follow the instructions below for your operating system.

## Windows Installation

### Method 1: Using Chocolatey (Recommended)
1. Open PowerShell as Administrator
2. Install Chocolatey if not already installed:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```
3. Install FFmpeg:
   ```powershell
   choco install ffmpeg
   ```

### Method 2: Manual Installation
1. Download FFmpeg from [ffmpeg.org/download.html](https://ffmpeg.org/download.html)
2. Choose "Windows builds from gyan.dev" or similar
3. Download the "release" build (e.g., `ffmpeg-release-full.7z`)
4. Extract the archive to `C:\ffmpeg`
5. Add FFmpeg to PATH:
   - Open "Environment Variables" (Search in Start Menu)
   - Under "System variables", find and select "Path"
   - Click "Edit" → "New"
   - Add: `C:\ffmpeg\bin`
   - Click "OK" on all windows
6. **Restart your terminal/command prompt**

### Verification
```bash
ffmpeg -version
```
You should see FFmpeg version information.

## Mac Installation

### Using Homebrew (Recommended)
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg
brew install ffmpeg
```

### Verification
```bash
ffmpeg -version
```

## Linux Installation

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

### Fedora/RHEL/CentOS
```bash
sudo dnf install ffmpeg
```

### Arch Linux
```bash
sudo pacman -S ffmpeg
```

### Verification
```bash
ffmpeg -version
```

## Troubleshooting

### "ffmpeg: command not found" or "The system cannot find the file specified"

1. **Verify Installation**:
   - Open a NEW terminal/command prompt (important!)
   - Run: `ffmpeg -version`
   - If it works, FFmpeg is installed correctly

2. **Check PATH**:
   - Windows: Run `echo %PATH%` and verify FFmpeg bin directory is listed
   - Mac/Linux: Run `echo $PATH` and verify FFmpeg is listed

3. **Restart Required**:
   - After adding FFmpeg to PATH, you MUST restart:
     - Your terminal/command prompt
     - VS Code or IDE
     - The entire system (if previous steps don't work)

4. **Windows Specific**:
   - Make sure you added `C:\ffmpeg\bin` (not just `C:\ffmpeg`)
   - Use System Environment Variables, not User variables
   - Reboot your computer after changing PATH

### Still Not Working?

1. Check if FFmpeg executable exists:
   - Windows: Open File Explorer, navigate to `C:\ffmpeg\bin\`, check for `ffmpeg.exe`
   - Mac/Linux: Run `which ffmpeg`

2. Try absolute path test:
   ```bash
   # Windows
   C:\ffmpeg\bin\ffmpeg.exe -version

   # Mac/Linux
   /usr/local/bin/ffmpeg -version
   ```

3. Reinstall FFmpeg using the alternative method above

## After Installing FFmpeg

1. **Restart everything**:
   - Close all terminal windows
   - Restart VS Code / your IDE
   - Restart the Streamlit app: `streamlit run _app.py`

2. **Upload a test file** to AgenticMeet AI

3. If you still see errors, check the terminal output for specific error messages

## Need Help?

If you're still experiencing issues:
1. Check the GitHub Issues page
2. Include your:
   - Operating System and version
   - FFmpeg version (`ffmpeg -version` output)
   - Complete error message from AgenticMeet AI
