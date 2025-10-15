import re
from datetime import datetime, timedelta
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
import numpy as np
from nltk.tokenize import sent_tokenize
import nltk

def ensure_nltk_data():
    """Ensure all required NLTK data is downloaded"""
    try:
        # Try both old and new punkt versions
        try:
            nltk.data.find('tokenizers/punkt_tab')
        except LookupError:
            try:
                nltk.download('punkt_tab')
            except:
                nltk.download('punkt')
    except Exception as e:
        print(f"Warning: Could not download NLTK data: {e}")

# Ensure NLTK data is available
ensure_nltk_data()

class TopicSegmenter:
    def __init__(self):
        self.topic_keywords = {
            'introduction': ['introduction', 'welcome', 'agenda', 'start', 'begin', 'opening'],
            'budget': ['budget', 'cost', 'money', 'financial', 'revenue', 'expense', 'funding'],
            'marketing': ['marketing', 'campaign', 'promotion', 'advertising', 'brand', 'customer'],
            'sales': ['sales', 'revenue', 'target', 'goal', 'performance', 'numbers'],
            'technical': ['technical', 'development', 'software', 'system', 'technology', 'code'],
            'strategy': ['strategy', 'plan', 'future', 'vision', 'goal', 'objective'],
            'review': ['review', 'feedback', 'assessment', 'evaluation', 'analysis'],
            'action_items': ['action', 'task', 'todo', 'next steps', 'follow up', 'deadline'],
            'conclusion': ['conclusion', 'summary', 'end', 'closing', 'wrap up', 'final']
        }
    
    def segment_topics(self, transcript_data, cleaned_transcript):
        """Segment transcript into topics with timestamps"""
        
        # Split transcript into sentences
        sentences = sent_tokenize(cleaned_transcript)
        
        if len(sentences) < 5:
            # Too short to segment meaningfully
            return [{
                'timestamp': '00:00',
                'title': 'Full Meeting',
                'content': cleaned_transcript,
                'summary': 'Complete meeting discussion',
                'duration': 'Full duration'
            }]
        
        # Create segments (group sentences)
        segment_size = max(3, len(sentences) // 5)  # At least 3 sentences per segment
        segments = []
        
        for i in range(0, len(sentences), segment_size):
            segment_text = ' '.join(sentences[i:i+segment_size])
            segments.append(segment_text)
        
        # Classify each segment
        topics = []
        total_duration = len(cleaned_transcript.split()) / 150  # Estimated duration in minutes
        segment_duration = total_duration / len(segments)
        
        for i, segment in enumerate(segments):
            # Calculate timestamp
            start_time = i * segment_duration
            timestamp = self._format_timestamp(start_time)
            
            # Determine topic
            topic_title = self._classify_segment(segment)
            
            # Generate summary
            summary = self._generate_segment_summary(segment)
            
            topics.append({
                'timestamp': timestamp,
                'title': topic_title,
                'content': segment,
                'summary': summary,
                'duration': f"{segment_duration:.1f} min"
            })
        
        return topics
    
    def _classify_segment(self, segment_text):
        """Classify a text segment into a topic category"""
        
        segment_lower = segment_text.lower()
        topic_scores = {}
        
        # Score each topic based on keyword presence
        for topic, keywords in self.topic_keywords.items():
            score = 0
            for keyword in keywords:
                # Count keyword occurrences (with word boundaries)
                score += len(re.findall(r'\b' + re.escape(keyword) + r'\b', segment_lower))
            topic_scores[topic] = score
        
        # Find the topic with highest score
        if max(topic_scores.values()) > 0:
            best_topic = max(topic_scores.items(), key=lambda x: x[1])[0]
            return self._format_topic_title(best_topic)
        
        # Fallback: use position-based classification
        return self._positional_classification(segment_text)
    
    def _format_topic_title(self, topic_key):
        """Convert topic key to readable title"""
        title_mapping = {
            'introduction': 'Introduction & Agenda',
            'budget': 'Budget Discussion',
            'marketing': 'Marketing Strategy',
            'sales': 'Sales Review',
            'technical': 'Technical Discussion',
            'strategy': 'Strategic Planning',
            'review': 'Performance Review',
            'action_items': 'Action Items',
            'conclusion': 'Meeting Wrap-up'
        }
        return title_mapping.get(topic_key, topic_key.replace('_', ' ').title())
    
    def _positional_classification(self, segment_text):
        """Fallback classification based on common meeting structure"""
        
        # Use simple heuristics based on content
        segment_lower = segment_text.lower()
        
        if any(word in segment_lower for word in ['welcome', 'start', 'begin', 'agenda']):
            return 'Introduction & Agenda'
        elif any(word in segment_lower for word in ['thank', 'end', 'close', 'wrap', 'summary']):
            return 'Meeting Wrap-up'
        elif any(word in segment_lower for word in ['action', 'next', 'follow', 'task']):
            return 'Action Items'
        elif any(word in segment_lower for word in ['question', 'discuss', 'concern']):
            return 'Discussion & Q&A'
        else:
            return 'General Discussion'
    
    def _generate_segment_summary(self, segment_text):
        """Generate a brief summary of the segment"""
        
        sentences = sent_tokenize(segment_text)
        if len(sentences) <= 2:
            return segment_text[:100] + "..." if len(segment_text) > 100 else segment_text
        
        # Extract key sentences (first and most informative)
        key_sentences = [sentences[0]]
        
        # Find sentence with most keywords
        max_keywords = 0
        best_sentence = ""
        
        for sentence in sentences[1:]:
            keyword_count = 0
            for topic_keywords in self.topic_keywords.values():
                for keyword in topic_keywords:
                    if keyword in sentence.lower():
                        keyword_count += 1
            
            if keyword_count > max_keywords:
                max_keywords = keyword_count
                best_sentence = sentence
        
        if best_sentence and best_sentence not in key_sentences:
            key_sentences.append(best_sentence)
        
        summary = ' '.join(key_sentences)
        return summary[:200] + "..." if len(summary) > 200 else summary
    
    def _format_timestamp(self, minutes):
        """Convert minutes to MM:SS format"""
        mins = int(minutes)
        secs = int((minutes - mins) * 60)
        return f"{mins:02d}:{secs:02d}"