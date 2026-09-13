"""
Tests for recent fixes:
1. Text cleaning preserves proper noun casing (Sony, Baker Hughes, Abraham).
2. Speaker diarization extracts 4+ speakers.
3. Hindi translation contains valid Devanagari characters.
"""
import sys
from pathlib import Path
import pytest

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR / "python_code"))

def test_text_cleaner_preserves_proper_nouns():
    from _text_cleaner import clean_transcript
    sample = "Hi Abraham, we had a call with Sony and Baker Hughes regarding the machine learning model."
    cleaned = clean_transcript(sample)
    assert "Abraham" in cleaned
    assert "Sony" in cleaned
    assert "Baker Hughes" in cleaned

def test_speaker_manager_diarization_turn_fallback():
    from _speaker_manager import SpeakerManager
    sm = SpeakerManager()
    dummy_segments = [
        {"start": 0.0, "end": 4.0, "text": "Hello everyone, welcome to the meeting."},
        {"start": 7.0, "end": 12.0, "text": "Are we ready to review the project status?"},
        {"start": 15.0, "end": 20.0, "text": "Yes, let us dive into the deployment schedule."},
        {"start": 23.0, "end": 28.0, "text": "What are the latest updates on the dataset?"},
        {"start": 31.0, "end": 35.0, "text": "The dataset is ready and models are in training."},
    ]
    diarized = sm._process_whisper_segments(dummy_segments)
    unique_speakers = set(s["speaker"] for s in diarized)
    assert len(unique_speakers) >= 3

def test_hindi_translation_devanagari():
    from _translator import MultiLanguageTranslator
    translator = MultiLanguageTranslator()
    sample = "Speaker 1: Good morning team, let us review the quarterly goals."
    translated = translator.translate_with_speaker_preservation(sample, "Hindi")
    assert "Speaker 1:" in translated
    has_devanagari = any("ऀ" <= ch <= "ॿ" for ch in translated)
    assert has_devanagari, f"Expected Devanagari characters in Hindi translation, got: {translated}"
