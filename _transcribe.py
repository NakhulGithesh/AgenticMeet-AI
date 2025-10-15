import whisper
import os
import subprocess
import shutil
from typing import Dict, Any

def check_ffmpeg_installed():
    """Check if FFmpeg is installed and accessible"""
    # Try standard method first (with shell=True for Windows compatibility)
    try:
        result = subprocess.run(['ffmpeg', '-version'],
                              capture_output=True,
                              text=True,
                              timeout=5,
                              shell=True)
        if result.returncode == 0:
            print("[OK] FFmpeg found via system PATH")
            return True
    except (subprocess.TimeoutExpired, FileNotFoundError, Exception) as e:
        print(f"Standard FFmpeg check failed: {e}")

    # Try common Windows locations (including WinGet)
    localappdata = os.environ.get('LOCALAPPDATA', '')
    common_paths = [
        os.path.join(localappdata, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
        os.path.join(localappdata, 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg*', 'ffmpeg*', 'bin', 'ffmpeg.exe'),
        r'C:\ffmpeg\bin\ffmpeg.exe',
        r'C:\Program Files\ffmpeg\bin\ffmpeg.exe',
        r'C:\Program Files (x86)\ffmpeg\bin\ffmpeg.exe',
    ]

    print("Searching for FFmpeg in common locations...")
    for path_pattern in common_paths:
        # Handle wildcards
        if '*' in path_pattern:
            import glob
            matches = glob.glob(path_pattern)
            if matches:
                path = matches[0]
            else:
                continue
        else:
            path = path_pattern

        if os.path.exists(path):
            print(f"[OK] Found FFmpeg at: {path}")
            # Add to PATH for this session
            bin_dir = os.path.dirname(path)
            if bin_dir not in os.environ['PATH']:
                os.environ['PATH'] = bin_dir + os.pathsep + os.environ['PATH']
                print(f"[OK] Added {bin_dir} to PATH")
            return True

    print("[ERROR] FFmpeg not found in any common location")
    return False

def transcribe_audio_with_diarization(file_path: str) -> Dict[str, Any]:
    """
    Transcribe audio/video files with enhanced speaker detection capabilities
    """
    try:
        # Validate file exists
        if not os.path.exists(file_path):
            error_msg = f"File not found: {file_path}"
            print(f"Error: {error_msg}")
            return {
                'text': f"Error: {error_msg}",
                'segments': [],
                'language': "unknown",
                'words': []
            }

        # Check file size
        file_size = os.path.getsize(file_path)
        if file_size == 0:
            error_msg = "Uploaded file is empty"
            print(f"Error: {error_msg}")
            return {
                'text': f"Error: {error_msg}",
                'segments': [],
                'language': "unknown",
                'words': []
            }

        print(f"Processing file: {file_path} (Size: {file_size / 1024 / 1024:.2f} MB)")

        # Check FFmpeg installation
        if not check_ffmpeg_installed():
            error_msg = "FFmpeg is not installed or not found in system PATH. Please install FFmpeg to process audio/video files."
            print(f"Error: {error_msg}")
            return {
                'text': f"Error: {error_msg}",
                'segments': [],
                'language': "unknown",
                'words': []
            }

        print("Loading Whisper model...")
        # Load Whisper model (you can change to "tiny", "small", "medium", "large", or "large-v2")
        model = whisper.load_model("base")
        print("✅ Whisper model loaded successfully")

        print("Starting transcription...")
        # Transcribe with word-level timestamps for better speaker detection
        result = model.transcribe(
            file_path,
            fp16=False,
            word_timestamps=True,
            verbose=True
        )

        print("✅ Transcription completed successfully")

        # Enhanced result with speaker detection preparation
        enhanced_result = {
            'text': result["text"],
            'segments': result.get("segments", []),
            'language': result.get("language", "unknown"),
            'words': []
        }

        # Extract word-level timestamps if available
        if 'segments' in result:
            for segment in result['segments']:
                if 'words' in segment:
                    enhanced_result['words'].extend(segment['words'])

        print(f"Transcription result: {len(enhanced_result['text'])} characters, {len(enhanced_result['segments'])} segments")

        return enhanced_result

    except FileNotFoundError as e:
        error_msg = f"File system error: {str(e)}. This usually means FFmpeg is not installed or the file path is incorrect."
        print(f"Error: {error_msg}")
        return {
            'text': f"Error: {error_msg}",
            'segments': [],
            'language': "unknown",
            'words': []
        }

    except PermissionError as e:
        error_msg = f"Permission denied: {str(e)}. Please check file permissions."
        print(f"Error: {error_msg}")
        return {
            'text': f"Error: {error_msg}",
            'segments': [],
            'language': "unknown",
            'words': []
        }

    except Exception as e:
        error_msg = f"Transcription error: {str(e)}"
        print(f"Error: {error_msg}")
        import traceback
        traceback.print_exc()
        return {
            'text': f"Error: Could not transcribe the file. {str(e)}",
            'segments': [],
            'language': "unknown",
            'words': []
        }

def transcribe_audio(file_path: str) -> str:
    """
    Legacy function for backward compatibility
    """
    result = transcribe_audio_with_diarization(file_path)
    return result['text']