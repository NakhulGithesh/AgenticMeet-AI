import re
import os
from typing import Dict, List, Any, Optional
from collections import defaultdict
import numpy as np

class SpeakerManager:
    """Manages speaker detection, acoustic diarization, sample voice clip extraction, and naming"""
    
    def __init__(self):
        self.speaker_patterns = [
            r'Speaker \d+:',
            r'Person \d+:',
            r'[A-Z][a-z]+:',  # Names followed by colon
        ]
        self._whisper_model = None

    def _get_whisper_model(self):
        if self._whisper_model is None:
            try:
                import whisper
                self._whisper_model = whisper.load_model("base")
            except Exception as e:
                print(f"[SpeakerManager] Could not load Whisper model: {e}")
                self._whisper_model = None
        return self._whisper_model
    
    def process_speakers(self, transcript_data: Dict[str, Any], audio_path: Optional[str] = None) -> List[Dict[str, Any]]:
        """Process transcript data and optional audio to extract accurate speaker segments"""
        segments = transcript_data.get('segments', [])
        
        # 1. If audio file exists and we have segments, perform acoustic diarization
        if audio_path and os.path.exists(audio_path) and segments:
            try:
                diarized = self._diarize_with_audio(segments, audio_path)
                if diarized:
                    return diarized
            except Exception as e:
                print(f"[SpeakerManager] Acoustic diarization failed, falling back: {e}")
                import traceback
                traceback.print_exc()

        # 2. If we have segments without audio, use conversational turn-taking heuristics
        if segments:
            return self._process_whisper_segments(segments)
        
        # 3. Fallback: detect speakers from text patterns
        return self._detect_speakers_from_text(transcript_data.get('text', ''))
    
    def _diarize_with_audio(self, segments: List[Dict], audio_path: str) -> List[Dict[str, Any]]:
        """Extract acoustic embeddings using Whisper encoder on active frames and cluster speakers"""
        import whisper
        import torch
        from sklearn.cluster import KMeans
        from sklearn.metrics import silhouette_score

        model = self._get_whisper_model()
        if model is None:
            return self._process_whisper_segments(segments)

        print(f"[SpeakerManager] Loading audio for acoustic diarization: {audio_path}")
        audio = whisper.load_audio(audio_path)
        sr = 16000
        total_audio_len = len(audio)

        feats = []
        durations = []
        valid_indices = []

        for i, s in enumerate(segments):
            start_sample = max(0, int(s.get('start', 0) * sr))
            end_sample = min(total_audio_len, int(s.get('end', 0) * sr))
            dur = max(0.0, s.get('end', 0) - s.get('start', 0))
            durations.append(dur)

            if start_sample >= end_sample:
                chunk = np.zeros(1600, dtype=np.float32)
            else:
                chunk = audio[start_sample:end_sample]

            if len(chunk) < 1600:
                chunk = np.pad(chunk, (0, 1600 - len(chunk)))

            padded = whisper.pad_or_trim(chunk)
            mel = whisper.log_mel_spectrogram(padded)
            vframes_enc = min(1500, max(1, int(len(chunk) / sr * 50)))

            with torch.no_grad():
                enc = model.encoder(mel.unsqueeze(0)).squeeze(0)
                active_enc = enc[:vframes_enc]
                m = active_enc.mean(dim=0).cpu().numpy()
                s_std = active_enc.std(dim=0).cpu().numpy()

            vec = np.concatenate([m, s_std])
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            feats.append(vec)
            valid_indices.append(i)

        X = np.array(feats)
        n_segments = len(segments)

        # Adaptively select number of clusters k based on meeting size and duration
        # For multi-person discussions (10+ min), range is typically 4 to 6 speakers
        meeting_duration_sec = sum(durations)
        if meeting_duration_sec > 600:
            k_candidates = [4, 5, 6]
        elif meeting_duration_sec > 180:
            k_candidates = [3, 4, 5]
        else:
            k_candidates = [2, 3]

        best_k = k_candidates[0]
        best_score = -1.0

        for k in k_candidates:
            if k >= n_segments:
                continue
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labs = km.fit_predict(X)
            try:
                score = silhouette_score(X, labs, metric='cosine')
                if score > best_score:
                    best_score = score
                    best_k = k
            except Exception:
                pass

        print(f"[SpeakerManager] Detected {best_k} distinct speakers (score: {best_score:.3f})")
        km = KMeans(n_clusters=best_k, random_state=42, n_init=10)
        raw_labels = km.fit_predict(X)

        # Temporal smoothing: brief interjections (< 1.5s) separated by < 1.2s inherit context
        smoothed_labels = list(raw_labels)
        for i in range(1, n_segments):
            if durations[i] < 1.5 and (segments[i].get('start', 0) - segments[i-1].get('end', 0)) < 1.2:
                smoothed_labels[i] = smoothed_labels[i-1]

        # Name speakers in natural order of appearance (Speaker 1, Speaker 2, ...)
        first_seen = {}
        for l in smoothed_labels:
            if l not in first_seen:
                first_seen[l] = len(first_seen) + 1

        speaker_segments = []
        for i, s in enumerate(segments):
            cl_id = smoothed_labels[i]
            speaker_id = f"Speaker {first_seen[cl_id]}"
            speaker_segments.append({
                'speaker': speaker_id,
                'start': float(s.get('start', 0.0)),
                'end': float(s.get('end', 0.0)),
                'text': s.get('text', '').strip(),
                'confidence': float(s.get('avg_logprob', 0.85))
            })

        return speaker_segments
    
    def _process_whisper_segments(self, segments: List[Dict]) -> List[Dict[str, Any]]:
        """Fallback when audio file is not available: group by pause thresholds and conversational turns"""
        speaker_segments = []
        current_speaker_idx = 1
        num_simulated_speakers = 4
        last_end = 0.0

        for i, segment in enumerate(segments):
            start = segment.get('start', i * 10.0)
            end = segment.get('end', (i + 1) * 10.0)
            text = segment.get('text', '').strip()

            # Switch speaker on questions or pauses greater than 2.0s
            pause = start - last_end
            if pause > 2.0 or (text.endswith('?') and len(text) > 15):
                current_speaker_idx = (current_speaker_idx % num_simulated_speakers) + 1

            speaker_segments.append({
                'speaker': f"Speaker {current_speaker_idx}",
                'start': start,
                'end': end,
                'text': text,
                'confidence': segment.get('avg_logprob', 0.8)
            })
            last_end = end
        
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
            
            speaker_match = None
            for pattern in self.speaker_patterns:
                match = re.match(pattern, line)
                if match:
                    speaker_match = match.group(0).replace(':', '').strip()
                    break
            
            if speaker_match:
                if current_speaker and current_text:
                    speaker_segments.append({
                        'speaker': current_speaker,
                        'start': start_time,
                        'end': start_time + self._estimate_speaking_time(current_text),
                        'text': current_text.strip(),
                        'confidence': 0.85
                    })
                
                current_speaker = speaker_match
                current_text = line.replace(speaker_match + ':', '').strip()
                start_time = line_num * 10
            else:
                if current_speaker:
                    current_text += " " + line
                else:
                    current_speaker = "Speaker 1"
                    current_text = line
                    start_time = line_num * 10
        
        if current_speaker and current_text:
            speaker_segments.append({
                'speaker': current_speaker,
                'start': start_time,
                'end': start_time + self._estimate_speaking_time(current_text),
                'text': current_text.strip(),
                'confidence': 0.85
            })
        
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
        """
        Format transcript with clear speaker labels, merging consecutive utterances from the
        same speaker into cohesive conversational paragraphs.
        """
        if not speaker_segments:
            return f"Speaker 1: {transcript}"
        
        # Merge consecutive utterances from the same speaker
        merged_turns = []
        current_turn = None

        for seg in speaker_segments:
            speaker = seg.get('speaker', 'Speaker 1')
            text = seg.get('text', '').strip()
            if not text:
                continue

            if current_turn and current_turn['speaker'] == speaker:
                current_turn['text'] += " " + text
                current_turn['end'] = seg.get('end', current_turn['end'])
            else:
                if current_turn:
                    merged_turns.append(current_turn)
                current_turn = {
                    'speaker': speaker,
                    'start': seg.get('start', 0.0),
                    'end': seg.get('end', 0.0),
                    'text': text
                }

        if current_turn:
            merged_turns.append(current_turn)

        formatted_lines = []
        for turn in merged_turns:
            formatted_lines.append(f"{turn['speaker']}: {turn['text']}")
        
        return '\n\n'.join(formatted_lines)
    
    def _estimate_speaking_time(self, text: str) -> float:
        """Estimate speaking time in seconds based on text length"""
        words = len(text.split())
        return max(1.0, words / 2.5)
    
    def update_transcript_with_names(self, original_transcript: str, speaker_segments: List[Dict], speaker_names: Dict[str, str]) -> str:
        """Update transcript with new speaker names"""
        updated_transcript = original_transcript
        
        for old_name, new_name in speaker_names.items():
            if old_name != new_name and new_name.strip():
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
            'total_time': 0.0,
            'word_count': 0,
            'segments': 0,
            'avg_confidence': 0.0,
            'best_sample': None
        })
        
        total_duration = 0.0
        
        for segment in speaker_segments:
            speaker = segment['speaker']
            duration = max(0.0, segment['end'] - segment['start'])
            words = len(segment['text'].split())
            
            speaker_stats[speaker]['total_time'] += duration
            speaker_stats[speaker]['word_count'] += words
            speaker_stats[speaker]['segments'] += 1
            speaker_stats[speaker]['avg_confidence'] += segment.get('confidence', 0.85)
            
            # Identify the best audio sample clip for this speaker (2.0s to 6.0s of clean speech)
            if 2.0 <= duration <= 6.5 and len(segment['text']) > 15:
                curr_sample = speaker_stats[speaker]['best_sample']
                if curr_sample is None or abs(duration - 3.5) < abs(curr_sample['duration'] - 3.5):
                    speaker_stats[speaker]['best_sample'] = {
                        'start': segment['start'],
                        'end': segment['end'],
                        'duration': duration,
                        'text': segment['text']
                    }

            total_duration = max(total_duration, segment['end'])
        
        for speaker, stats in speaker_stats.items():
            stats['speaking_percentage'] = (stats['total_time'] / total_duration * 100) if total_duration > 0 else 0
            stats['avg_confidence'] = stats['avg_confidence'] / stats['segments'] if stats['segments'] > 0 else 0
            stats['words_per_minute'] = (stats['word_count'] / (stats['total_time'] / 60)) if stats['total_time'] > 0 else 0
        
        return dict(speaker_stats)
    
    def merge_speaker_segments(self, speaker_segments: List[Dict], gap_threshold: float = 2.0) -> List[Dict]:
        """Merge speaker segments that are close together"""
        if not speaker_segments:
            return []
        
        sorted_segments = sorted(speaker_segments, key=lambda x: x['start'])
        merged_segments = []
        current_segment = sorted_segments[0].copy()
        
        for next_segment in sorted_segments[1:]:
            if (current_segment['speaker'] == next_segment['speaker'] and 
                next_segment['start'] - current_segment['end'] <= gap_threshold):
                current_segment['end'] = next_segment['end']
                current_segment['text'] += " " + next_segment['text']
                current_segment['confidence'] = (current_segment['confidence'] + next_segment['confidence']) / 2
            else:
                merged_segments.append(current_segment)
                current_segment = next_segment.copy()
        
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
                