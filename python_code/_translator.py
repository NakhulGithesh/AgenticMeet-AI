"""
MultiLanguageTranslator — High-performance speaker-preserving translation engine.
Uses direct concurrent Google Translate requests with ThreadPoolExecutor for sub-second responses.
"""
import urllib.request
import urllib.parse
import json
import re
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor


class MultiLanguageTranslator:
    """Handles multi-language detection and rapid translation with speaker preservation."""

    def __init__(self):
        self.language_codes = {
            'English': 'en',
            'Spanish': 'es',
            'Hindi': 'hi',
            'French': 'fr',
            'German': 'de',
        }
        self.reverse_language_codes = {v: k for k, v in self.language_codes.items()}

    def _translate_single(self, text: str, target_code: str) -> str:
        """Translate a single string using Google's direct web service endpoint."""
        if not text or not text.strip():
            return text
        try:
            url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_code}&dt=t&q={urllib.parse.quote(text)}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
            with urllib.request.urlopen(req, timeout=8) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return "".join([item[0] for item in data[0] if item and item[0]])
        except Exception:
            # Fallback to googletrans if available
            try:
                from googletrans import Translator
                t = Translator()
                return t.translate(text, dest=target_code).text
            except Exception:
                return text

    def detect_language(self, text: str) -> str:
        """Detect the language of the input text."""
        try:
            import langdetect
            clean_text = re.sub(r'[^\w\s]', ' ', text)
            clean_text = ' '.join(clean_text.split()[:100])
            detected_lang = langdetect.detect(clean_text)
            return self.reverse_language_codes.get(detected_lang, 'English')
        except Exception:
            return 'English'

    def translate_text(self, text: str, target_language: str) -> str:
        """Translate arbitrary text to target language rapidly."""
        if target_language == 'English' or not text.strip():
            return text
        target_code = self.language_codes.get(target_language, 'en')
        return self._translate_single(text, target_code)

    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages."""
        return list(self.language_codes.keys())

    def batch_translate(self, texts: List[str], target_language: str) -> List[str]:
        """Translate multiple texts concurrently."""
        target_code = self.language_codes.get(target_language, 'en')
        with ThreadPoolExecutor(max_workers=10) as executor:
            return list(executor.map(lambda t: self._translate_single(t, target_code), texts))

    def translate_with_speaker_preservation(self, transcript: str, target_language: str) -> str:
        """Translate transcript while preserving speaker names, roles, and timestamps."""
        if target_language == 'English' or not transcript or not transcript.strip():
            return transcript

        target_code = self.language_codes.get(target_language, 'en')
        lines = [l.strip() for l in transcript.split('\n') if l.strip()]
        if not lines:
            return transcript

        # Regex matching "Speaker Name (optional timestamp): dialogue"
        spk_pattern = re.compile(r'^([A-Za-z0-9_\s\(\):]+?:\s*)(.*)$')
        parsed = []
        for line in lines:
            m = spk_pattern.match(line)
            if m:
                parsed.append((m.group(1), m.group(2)))
            else:
                parsed.append(('', line))

        with ThreadPoolExecutor(max_workers=12) as executor:
            translated_dialogues = list(
                executor.map(lambda it: self._translate_single(it[1], target_code), parsed)
            )

        out = []
        for i, (prefix, orig_dialogue) in enumerate(parsed):
            tr = translated_dialogues[i] if i < len(translated_dialogues) else orig_dialogue
            out.append(f"{prefix}{tr}")

        return '\n\n'.join(out)