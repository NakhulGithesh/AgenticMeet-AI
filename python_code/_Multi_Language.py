from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
import torch
from typing import Dict, List
import re
import langdetect

class MultiLanguageTranslator:
    """Handles multi-language detection and translation"""
    
    def __init__(self):
        self.language_codes = {
            'English': 'en',
            'Spanish': 'es', 
            'Hindi': 'hi',
            'French': 'fr',
            'German': 'de'
        }
        
        self.reverse_language_codes = {v: k for k, v in self.language_codes.items()}
        
        # Initialize translation models (lightweight approach)
        self.translators = {}
        self._load_translation_models()
    
    def _load_translation_models(self):
        """Load translation models for supported languages"""
        
        try:
            # Use Helsinki-NLP models for translation (lightweight and effective)
            self.model_mappings = {
                'en_to_es': 'Helsinki-NLP/opus-mt-en-es',
                'en_to_fr': 'Helsinki-NLP/opus-mt-en-fr',
                'en_to_de': 'Helsinki-NLP/opus-mt-en-de',
                'en_to_hi': 'Helsinki-NLP/opus-mt-en-hi',
                'es_to_en': 'Helsinki-NLP/opus-mt-es-en',
                'fr_to_en': 'Helsinki-NLP/opus-mt-fr-en',
                'de_to_en': 'Helsinki-NLP/opus-mt-de-en',
                'hi_to_en': 'Helsinki-NLP/opus-mt-hi-en'
            }
            
            print("Translation models will be loaded on-demand to save memory...")
            
        except Exception as e:
            print(f"Warning: Could not initialize translation models: {e}")
            self.model_mappings = {}
    
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
        """Translate text to target language"""
        
        if target_language == 'English':
            return text  # No translation needed
        
        try:
            # Detect source language
            source_language = self.detect_language(text)
            source_code = self.language_codes.get(source_language, 'en')
            target_code = self.language_codes.get(target_language, 'en')
            
            # Create model key
            model_key = f"{source_code}_to_{target_code}"
            
            if model_key not in self.model_mappings:
                return f"Translation from {source_language} to {target_language} not supported yet."
            
            # Load translator on demand
            if model_key not in self.translators:
                print(f"Loading translation model for {source_language} → {target_language}...")
                try:
                    self.translators[model_key] = pipeline(
                        "translation", 
                        model=self.model_mappings[model_key],
                        return_tensors="pt"
                    )
                except Exception as e:
                    return f"Error loading translation model: {e}"
            
            # Split text into chunks for better translation
            chunks = self._split_text_for_translation(text)
            translated_chunks = []
            
            for chunk in chunks:
                try:
                    result = self.translators[model_key](chunk, max_length=512, num_beams=4)
                    translated_text = result[0]['translation_text']
                    translated_chunks.append(translated_text)
                except Exception as e:
                    print(f"Translation error for chunk: {e}")
                    translated_chunks.append(chunk)  # Keep original if translation fails
            
            return ' '.join(translated_chunks)
            
        except Exception as e:
            print(f"Translation failed: {e}")
            return f"Translation error: {str(e)}"
    
    def _split_text_for_translation(self, text: str, max_length: int = 400) -> List[str]:
        """Split text into smaller chunks for better translation"""
        
        # Split by sentences first
        sentences = re.split(r'[.!?]+', text)
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # If adding this sentence would exceed max_length, start new chunk
            if len(current_chunk) + len(sentence) > max_length and current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = sentence
            else:
                current_chunk += " " + sentence if current_chunk else sentence
        
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
        for text in texts:
            translated = self.translate_text(text, target_language)
            translated_texts.append(translated)
        
        return translated_texts