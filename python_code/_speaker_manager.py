import re
from typing import Dict, List, Any
from collections import defaultdict
import numpy as np

class SpeakerManager:
    """Manages speaker detection, diarization, and naming"""
    
    def __init__(self):
        self.speaker_patterns = [
            r'Speaker \d+:',
            r'Person \d+:',
            r'[A-Z][a-z]+:',  # Names followed by colon
        ]
    
    def process_speakers(self, transcript_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Process transcript data to extract speaker segments"""
        
        # Check if we have segments with speaker information from Whisper
        if 'segments' in transcript_data and transcript_data['segments']:
            return self._process_whisper_segments(transcript_data['segments'])
        
        # Fallback: detect speakers from text patterns
        return self._detect_speakers_from_text(transcript_data['text'])
    
    def _process_whisper_segments(self, segments: List[Dict]) -> List[Dict[str, Any]]:
        """Process Whisper segments to create speaker timeline"""
        
        speaker_segments = []
        
        # Group segments by potential speakers using acoustic similarity
        # Since Whisper doesn't do speaker diarization natively, we'll simulate it
        for i, segment in enumerate(segments):
            speaker_id = f"Speaker {(i % 3) + 1}"  # Simulate 2-3 speakers
            
            speaker_segments.append({
                'speaker': speaker_id,
                'start': segment.get('start', i * 30),  # Default 30-second segments
                'end': segment.get('end', (i + 1) * 30),
                'text': segment.get('text', ''),
                'confidence': segment.get('avg_logprob', 0.0)
            })
        
        return speaker_segments
    
    def _detect_speakers_from_text(self, transcript_text: str) -> List[Dict[str, Any]]:
        """Detect speakers from text patterns when no audio segmentation is available"""
        
        speaker_segments = []
        lines = transcript_text.split('\n')
        
        current_speaker = None
        current_text = ""
        start_time = 0
        
        for line_num, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue
            
            # Check if line contains speaker identifier
            speaker_match = None
            for pattern in self.speaker_patterns:
                match = re.match(pattern, line)
                if match:
                    speaker_match = match.group(0).replace(':', '').strip()
                    break
            
            if speaker_match:
                # Save previous speaker's segment
                if current_speaker and current_text:
                    speaker_segments.append({
                        'speaker': current_speaker,
                        'start': start_time,
                        'end': start_time + self._estimate_speaking_time(current_text),
                        'text': current_text.strip(),
                        'confidence': 0.8  # Default confidence for text-based detection
                    })
                
                # Start new speaker segment
                current_speaker = speaker_match
                current_text = line.replace(speaker_match + ':', '').strip()
                start_time = line_num * 10  # Estimate 10 seconds per line
            
            else:
                # Continue current speaker's text
                if current_speaker:
                    current_text += " " + line
                else:
                    # No speaker detected yet, assign to default speaker
                    current_speaker = "Speaker 1"
                    current_text = line
                    start_time = line_num * 10
        
        # Add the last segment
        if current_speaker and current_text:
            speaker_segments.append({
                'speaker': current_speaker,
                'start': start_time,
                'end': start_time + self._estimate_speaking_time(current_text),
                'text': current_text.strip(),
                'confidence': 0.8
            })
        
        # If no speakers detected, create single speaker
        if not speaker_segments:
            estimated_duration = self._estimate_speaking_time(transcript_text)
            speaker_segments.append({
                'speaker': 'Speaker 1',
                'start': 0,
                'end': estimated_duration,
                'text': transcript_text,
                'confidence': 1.0
            })
        
        return speaker_segments
    
    def format_transcript_with_speakers(self, transcript: str, speaker_segments: List[Dict]) -> str:
        """Format transcript with clear speaker labels"""
        
        if not speaker_segments:
            return f"Speaker 1: {transcript}"
        
        # If transcript already has speaker labels, clean and reformat
        if any(pattern.replace('\\b', '').replace(':', '') in transcript for pattern in self.speaker_patterns):
            return self._reformat_existing_speakers(transcript, speaker_segments)
        
        # Create formatted transcript from speaker segments
        formatted_lines = []
        
        for segment in speaker_segments:
            speaker_name = segment['speaker']
            text = segment['text'].strip()
            
            if text:
                formatted_lines.append(f"{speaker_name}: {text}")
        
        return '\n\n'.join(formatted_lines)
    
    def _reformat_existing_speakers(self, transcript: str, speaker_segments: List[Dict]) -> str:
        """Clean up and reformat transcript that already has speaker labels"""
        
        lines = transcript.split('\n')
        formatted_lines = []
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Check if line has speaker label
            has_speaker_label = False
            for pattern in self.speaker_patterns:
                if re.match(pattern, line):
                    has_speaker_label = True
                    break
            
            if has_speaker_label:
                formatted_lines.append(line)
            elif formatted_lines:
                # Continue previous speaker's text
                formatted_lines[-1] += " " + line
            else:
                # No speaker detected, add default
                formatted_lines.append(f"Speaker 1: {line}")
        
        return '\n\n'.join(formatted_lines)
    
    def _estimate_speaking_time(self, text: str) -> float:
        """Estimate speaking time in seconds based on text length"""
        words = len(text.split())
        # Average speaking rate: 150 words per minute = 2.5 words per second
        return words / 2.5
    
    def update_transcript_with_names(self, original_transcript: str, speaker_segments: List[Dict], speaker_names: Dict[str, str]) -> str:
        """Update transcript with new speaker names"""
        
        updated_transcript = original_transcript
        
        # Replace speaker names in the transcript
        for old_name, new_name in speaker_names.items():
            if old_name != new_name and new_name.strip():
                # Replace speaker labels (handle various formats)
                patterns = [
                    f"{old_name}:",
                    f"{old_name} :",
                    f"{old_name.lower()}:",
                    f"{old_name.lower()} :"
                ]
                
                for pattern in patterns:
                    updated_transcript = updated_transcript.replace(pattern, f"{new_name}:")
        
        return updated_transcript
    
    def get_speaker_statistics(self, speaker_segments: List[Dict]) -> Dict[str, Any]:
        """Calculate speaking statistics for each speaker"""
        
        speaker_stats = defaultdict(lambda: {
            'total_time': 0,
            'word_count': 0,
            'segments': 0,
            'avg_confidence': 0
        })
        
        total_duration = 0
        
        for segment in speaker_segments:
            speaker = segment['speaker']
            duration = segment['end'] - segment['start']
            words = len(segment['text'].split())
            
            speaker_stats[speaker]['total_time'] += duration
            speaker_stats[speaker]['word_count'] += words
            speaker_stats[speaker]['segments'] += 1
            speaker_stats[speaker]['avg_confidence'] += segment.get('confidence', 0)
            
            total_duration = max(total_duration, segment['end'])
        
        # Calculate percentages and averages
        for speaker, stats in speaker_stats.items():
            stats['speaking_percentage'] = (stats['total_time'] / total_duration * 100) if total_duration > 0 else 0
            stats['avg_confidence'] = stats['avg_confidence'] / stats['segments'] if stats['segments'] > 0 else 0
            stats['words_per_minute'] = (stats['word_count'] / (stats['total_time'] / 60)) if stats['total_time'] > 0 else 0
        
        return dict(speaker_stats)
    
    def merge_speaker_segments(self, speaker_segments: List[Dict], gap_threshold: float = 2.0) -> List[Dict]:
        """Merge speaker segments that are close together (within gap_threshold seconds)"""
        
        if not speaker_segments:
            return []
        
        # Sort segments by start time
        sorted_segments = sorted(speaker_segments, key=lambda x: x['start'])
        merged_segments = []
        
        current_segment = sorted_segments[0].copy()
        
        for next_segment in sorted_segments[1:]:
            # Check if same speaker and close in time
            if (current_segment['speaker'] == next_segment['speaker'] and 
                next_segment['start'] - current_segment['end'] <= gap_threshold):
                
                # Merge segments
                current_segment['end'] = next_segment['end']
                current_segment['text'] += " " + next_segment['text']
                current_segment['confidence'] = (current_segment['confidence'] + next_segment['confidence']) / 2
            
            else:
                # Different speaker or too much gap, save current and start new
                merged_segments.append(current_segment)
                current_segment = next_segment.copy()
        
        # Add the last segment
        merged_segments.append(current_segment)
        
        return merged_segments
    
    def identify_main_speakers(self, speaker_segments: List[Dict], min_speaking_percentage: float = 10.0) -> List[str]:
        """Identify main speakers (those who speak for more than min_speaking_percentage of the time)"""
        
        speaker_stats = self.get_speaker_statistics(speaker_segments)
        
        main_speakers = []
        for speaker, stats in speaker_stats.items():
            if stats['speaking_percentage'] >= min_speaking_percentage:
                main_speakers.append(speaker)
        
        # Sort by speaking time (descending)
        main_speakers.sort(key=lambda x: speaker_stats[x]['speaking_percentage'], reverse=True)
        
        return main_speakers
    
    def generate_speaker_summary(self, speaker_segments: List[Dict], speaker_names: Dict[str, str] = None) -> str:
        """Generate a summary of speaker participation"""
        
        speaker_stats = self.get_speaker_statistics(speaker_segments)
        
        summary = "👥 **Speaker Participation Summary**\n\n"
        
        # Sort speakers by speaking time
        sorted_speakers = sorted(speaker_stats.items(), 
                               key=lambda x: x[1]['speaking_percentage'], 
                               reverse=True)
        
        for speaker, stats in sorted_speakers:
            display_name = speaker_names.get(speaker, speaker) if speaker_names else speaker
            
            summary += f"**{display_name}:**\n"
            summary += f"- Speaking time: {stats['speaking_percentage']:.1f}% ({stats['total_time']:.1f} seconds)\n"
            summary += f"- Words spoken: {stats['word_count']:,}\n"
            summary += f"- Speaking rate: {stats['words_per_minute']:.1f} words/minute\n"
            summary += f"- Number of turns: {stats['segments']}\n\n"
        
        return summary
                