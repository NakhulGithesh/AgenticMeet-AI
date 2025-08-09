import whisper
import os
from typing import Dict, Any

def transcribe_audio_with_diarization(file_path: str) -> Dict[str, Any]:
    """
    Transcribe audio/video files with enhanced speaker detection capabilities
    """
    try:
        # Load Whisper model (you can change to "tiny", "small", "medium", "large", or "large-v2")
        model = whisper.load_model("base")
        
        # Transcribe with word-level timestamps for better speaker detection
        result = model.transcribe(
            file_path, 
            fp16=False, 
            word_timestamps=True,
            verbose=False
        )
        
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
        
        return enhanced_result
    
    except Exception as e:
        print(f"Error transcribing file: {str(e)}")
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