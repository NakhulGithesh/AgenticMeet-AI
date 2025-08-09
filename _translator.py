from googletrans import Translator
import langdetect
from typing import Dict, List
import re

class MultiLanguageTranslator:
    """Handles multi-language detection and translation using Google Translate API"""
    
    def __init__(self):
        self.language_codes = {
            'English': 'en',
            'Spanish': 'es', 
            'Hindi': 'hi',
            'French': 'fr',
            'German': 'de'
        }
        
        self.reverse_language_codes = {v: k for k, v in self.language_codes.items()}
        
        # Initialize Google Translator (much more reliable than HuggingFace models)
        try:
            self.translator = Translator()
            print("Google Translator initialized successfully")
        except Exception as e:
            print(f"Warning: Could not initialize Google Translator: {e}")
            self.translator = None
    
    def detect_language(self, text: str) -> str:
        """Detect the language of the input text"""
        try:
            # Clean text for better detection
            clean_text = re.sub(r'[^\w\s]', ' ', text)
            clean_text = ' '.join(clean_text.split()[:100])  # Use first 100 words
            
            detected_lang = langdetect.detect(clean_text)
            
            # Map to our supported languages
            if detected_lang in self.reverse_language_codes:
                return self.reverse_language_codes[detected_lang]
            else:
                return 'English'  # Default to English if not supported
                
        except Exception as e:
            print(f"Language detection failed: {e}")
            return 'English'  # Default fallback
    
    def translate_text(self, text: str, target_language: str) -> str:
        """Translate text to target language using Google Translate"""
        
        if target_language == 'English':
            return text  # No translation needed
        
        if not self.translator:
            return "Translation service not available. Please check your internet connection."
        
        try:
            # Get target language code
            target_code = self.language_codes.get(target_language, 'en')
            
            # Split text into manageable chunks (Google Translate has character limits)
            chunks = self._split_text_for_translation(text, max_length=4000)
            translated_chunks = []
            
            for i, chunk in enumerate(chunks):
                try:
                    print(f"Translating chunk {i+1}/{len(chunks)} to {target_language}...")
                    
                    # Translate the chunk
                    result = self.translator.translate(chunk, dest=target_code)
                    translated_chunks.append(result.text)
                    
                except Exception as e:
                    print(f"Translation error for chunk {i+1}: {e}")
                    translated_chunks.append(chunk)  # Keep original if translation fails
            
            return '\n\n'.join(translated_chunks)
            
        except Exception as e:
            print(f"Translation failed: {e}")
            return f"Translation error: Unable to translate to {target_language}. Please check your internet connection."
    
    def _split_text_for_translation(self, text: str, max_length: int = 4000) -> List[str]:
        """Split text into smaller chunks for translation"""
        
        # If text is short enough, return as single chunk
        if len(text) <= max_length:
            return [text]
        
        # Split by paragraphs first (double newlines)
        paragraphs = text.split('\n\n')
        chunks = []
        current_chunk = ""
        
        for paragraph in paragraphs:
            # If single paragraph is too long, split by sentences
            if len(paragraph) > max_length:
                sentences = re.split(r'(?<=[.!?])\s+', paragraph)
                for sentence in sentences:
                    if len(current_chunk) + len(sentence) > max_length and current_chunk:
                        chunks.append(current_chunk.strip())
                        current_chunk = sentence
                    else:
                        current_chunk += "\n" + sentence if current_chunk else sentence
            else:
                # Check if adding this paragraph would exceed limit
                if len(current_chunk) + len(paragraph) > max_length and current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = paragraph
                else:
                    current_chunk += "\n\n" + paragraph if current_chunk else paragraph
        
        # Add the last chunk
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages"""
        return list(self.language_codes.keys())
    
    def batch_translate(self, texts: List[str], target_language: str) -> List[str]:
        """Translate multiple texts efficiently"""
        
        translated_texts = []
        target_code = self.language_codes.get(target_language, 'en')
        
        if not self.translator:
            return [f"Translation not available for: {text[:50]}..." for text in texts]
        
        for i, text in enumerate(texts):
            try:
                print(f"Batch translating {i+1}/{len(texts)}...")
                result = self.translator.translate(text, dest=target_code)
                translated_texts.append(result.text)
            except Exception as e:
                print(f"Batch translation error for text {i+1}: {e}")
                translated_texts.append(text)  # Keep original if translation fails
        
        return translated_texts
    
    def translate_with_speaker_preservation(self, transcript: str, target_language: str) -> str:
        """Translate transcript while preserving speaker labels"""
        
        if target_language == 'English':
            return transcript
        
        if not self.translator:
            return "Translation service not available."
        
        try:
            # Split transcript by speaker segments
            lines = transcript.split('\n')
            translated_lines = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check if line starts with speaker label
                speaker_match = None
                for pattern in [r'^(Speaker \d+):', r'^(Person \d+):', r'^([A-Z][a-z]+):']:
                    match = re.match(pattern, line)
                    if match:
                        speaker_match = match.group(1)
                        break
                
                if speaker_match:
                    # Extract speaker and text parts
                    speaker_part = speaker_match + ":"
                    text_part = line.replace(speaker_part, '').strip()
                    
                    if text_part:
                        # Translate only the text part
                        target_code = self.language_codes.get(target_language, 'en')
                        translated_text = self.translator.translate(text_part, dest=target_code).text
                        translated_lines.append(f"{speaker_part} {translated_text}")
                    else:
                        translated_lines.append(line)
                else:
                    # No speaker label, translate entire line
                    target_code = self.language_codes.get(target_language, 'en')
                    translated_text = self.translator.translate(line, dest=target_code).text
                    translated_lines.append(translated_text)
            
            return '\n\n'.join(translated_lines)
            
        except Exception as e:
            print(f"Speaker-preserving translation failed: {e}")
            return f"Translation error: {str(e)}"