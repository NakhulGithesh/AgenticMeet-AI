import re
from collections import Counter
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
import string

# Download required NLTK data (run once)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class MeetingAnalyzer:
    def __init__(self, transcript_data, cleaned_transcript):
        self.transcript_data = transcript_data
        self.cleaned_transcript = cleaned_transcript
        self.stop_words = set(stopwords.words('english'))
        
    def get_analytics(self):
        """Generate comprehensive meeting analytics"""
        
        # Basic statistics
        words = word_tokenize(self.cleaned_transcript.lower())
        word_count = len(words)
        
        # Duration (mock for now, would need actual audio duration)
        estimated_duration = word_count / 150  # Average speaking rate: 150 words/minute
        
        # Speaker analysis
        speaker_stats = self._analyze_speakers()
        
        # Keywords extraction
        keywords = self._extract_keywords(words)
        
        # Meeting metrics
        analytics = {
            'total_speakers': len(speaker_stats) if speaker_stats else 1,
            'total_words': word_count,
            'duration': estimated_duration,
            'words_per_minute': word_count / estimated_duration if estimated_duration > 0 else 0,
            'speaker_stats': speaker_stats,
            'keywords': keywords
        }
        
        return analytics
    
    def _analyze_speakers(self):
        """Analyze speaker statistics from transcript"""
        # Mock speaker detection - in real implementation, you'd use the segments from Whisper
        # For now, we'll simulate speaker detection based on common patterns
        
        speakers = []
        
        # Try to detect speakers from text patterns
        speaker_patterns = [
            r'Speaker \d+:',
            r'Person \d+:',
            r'[A-Z][a-z]+:',  # Names followed by colon
        ]
        
        # If no speaker patterns found, create a single speaker
        speaker_found = False
        for pattern in speaker_patterns:
            if re.search(pattern, self.cleaned_transcript):
                speaker_found = True
                break
        
        if not speaker_found:
            # Single speaker scenario
            total_words = len(word_tokenize(self.cleaned_transcript))
            return [{
                'speaker': 'Speaker 1',
                'word_count': total_words,
                'speaking_time': 100.0  # 100% speaking time
            }]
        
        # Multiple speakers detected
        segments = re.split(r'(Speaker \d+:|Person \d+:|[A-Z][a-z]+:)', self.cleaned_transcript)
        
        speaker_data = {}
        current_speaker = 'Speaker 1'
        
        for i, segment in enumerate(segments):
            if ':' in segment:
                current_speaker = segment.replace(':', '').strip()
            elif segment.strip():
                words = word_tokenize(segment)
                if current_speaker not in speaker_data:
                    speaker_data[current_speaker] = {'words': 0}
                speaker_data[current_speaker]['words'] += len(words)
        
        # Calculate percentages
        total_words = sum(data['words'] for data in speaker_data.values())
        
        result = []
        for speaker, data in speaker_data.items():
            percentage = (data['words'] / total_words * 100) if total_words > 0 else 0
            result.append({
                'speaker': speaker,
                'word_count': data['words'],
                'speaking_time': percentage
            })
        
        return sorted(result, key=lambda x: x['word_count'], reverse=True)
    
    def _extract_keywords(self, words):
        """Extract meaningful keywords from the transcript"""
        
        # Filter out stop words, punctuation, and short words
        filtered_words = []
        for word in words:
            if (word.lower() not in self.stop_words and 
                word not in string.punctuation and 
                len(word) > 2 and 
                word.isalpha()):
                filtered_words.append(word.lower())
        
        # Get word frequency
        word_freq = Counter(filtered_words)
        
        # Remove very common business words that aren't meaningful
        business_stopwords = {
            'meeting', 'discussion', 'talk', 'said', 'say', 'going', 'think', 
            'know', 'really', 'just', 'like', 'way', 'get', 'got', 'make',
            'take', 'come', 'go', 'see', 'look', 'time', 'people', 'work',
            'good', 'great', 'right', 'okay', 'yes', 'yeah', 'well'
        }
        
        # Filter out business stopwords
        filtered_freq = {word: count for word, count in word_freq.items() 
                        if word not in business_stopwords and count > 1}
        
        # Return top keywords
        return Counter(filtered_freq).most_common(50)