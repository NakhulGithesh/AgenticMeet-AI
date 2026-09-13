"""
MultiLanguageTranslator — High-performance speaker-preserving translation engine.
Uses chunked multi-line batching and multi-tier translation fallbacks.
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

    def _translate_query(self, text: str, target_code: str) -> str:
        """Translate a string with resilient multi-tier fallback."""
        if not text or not text.strip():
            return text

        # 1. Try Google web endpoints (dict-chrome-ex, webapp)
        for client in ["dict-chrome-ex", "webapp"]:
            try:
                url = f"https://translate.googleapis.com/translate_a/single?client={client}&sl=auto&tl={target_code}&dt=t&q={urllib.parse.quote(text)}"
                req = urllib.request.Request(
                    url,
                    headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
                )
                with urllib.request.urlopen(req, timeout=8) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    res = "".join([item[0] for item in data[0] if item and item[0]])
                    if res and res.strip():
                        return res
            except Exception:
                continue

        # 2. Try googletrans
        try:
            from googletrans import Translator
            t = Translator()
            res = t.translate(text, dest=target_code)
            if res and res.text and res.text.strip():
                return res.text
        except Exception:
            pass

        # 3. Try MyMemory API
        try:
            url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text[:500])}&langpair=en|{target_code}"
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                res = data.get("responseData", {}).get("translatedText")
                if res and res.strip():
                    return res
        except Exception:
            pass

        return text

    def _translate_single(self, text: str, target_code: str) -> str:
        """Translate a single string."""
        return self._translate_query(text, target_code)

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
        with ThreadPoolExecutor(max_workers=5) as executor:
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

        # Batch translate in chunks of 12 lines using delimiter
        chunk_size = 12
        translated_dialogues = []
        delim = " ||| "

        for i in range(0, len(parsed), chunk_size):
            chunk = [p[1] for p in parsed[i:i + chunk_size]]
            joined = delim.join(chunk)
            translated_joined = self._translate_query(joined, target_code)

            parts = [p.strip() for p in translated_joined.split("|||")]
            if len(parts) == len(chunk):
                translated_dialogues.extend(parts)
            else:
                # Delimiter split mismatch: translate individually with light concurrency
                with ThreadPoolExecutor(max_workers=4) as executor:
                    fallback_parts = list(
                        executor.map(lambda txt: self._translate_single(txt, target_code), chunk)
                    )
                translated_dialogues.extend(fallback_parts)

        out = []
        for i, (prefix, orig_dialogue) in enumerate(parsed):
            tr = translated_dialogues[i] if i < len(translated_dialogues) else orig_dialogue
            out.append(f"{prefix}{tr}")

        return '\n\n'.join(out)