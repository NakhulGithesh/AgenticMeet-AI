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
        
        # Robust speaker detection supporting all-caps, mixed-case, numbers, and timestamps
        # e.g., "Speaker 1:", "SONY:", "Nakul (00:12):", "Speaker 2 [1:23]:"
        pattern = re.compile(r'(?:^|\n)\s*([A-Za-z0-9_\s]{2,30}?)\s*(?:\([^)]*\)|\[[^\]]*\])?\s*:', re.MULTILINE)
        
        matches = list(pattern.finditer(self.cleaned_transcript))
        if not matches:
            total_words = len(word_tokenize(self.cleaned_transcript))
            return [{
                'speaker': 'Speaker 1',
                'word_count': total_words,
                'speaking_time': 100.0
            }]

        speaker_data = {}
        for i, match in enumerate(matches):
            speaker_name = match.group(1).strip()
            # Content is from end of this match to start of next match (or end of transcript)
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(self.cleaned_transcript)
            content = self.cleaned_transcript[start_pos:end_pos].strip()
            words = word_tokenize(content)
            
            if speaker_name not in speaker_data:
                speaker_data[speaker_name] = {'words': 0}
            speaker_data[speaker_name]['words'] += max(1, len(words))

        total_words = sum(data['words'] for data in speaker_data.values())
        result = []
        for speaker, data in speaker_data.items():
            percentage = (data['words'] / total_words * 100) if total_words > 0 else 0
            result.append({
                'speaker': speaker,
                'word_count': data['words'],
                'speaking_time': round(percentage, 1)
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