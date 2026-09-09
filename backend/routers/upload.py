"""
POST /api/upload — Accept audio/video file, start async transcription.
"""
import os
import tempfile
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, UploadFile, File, BackgroundTasks

import shutil
import subprocess

from tasks import task_manager, TaskStatus
from models.schemas import TaskResponse

router = APIRouter()

ALLOWED_EXTENSIONS = {
    "mp3", "wav", "mp4", "m4a", "mov", "webm", "mkv", "avi", "aac", "flac", "ogg"
}

VIDEO_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"}


def _ensure_web_compatible_video(task_id: str) -> Optional[Path]:
    """
    Ensure a web-compatible MP4 file (+faststart) exists for browser video playback.
    If only .mov or .mkv exists, quickly remux it using stream copy (-c copy) in <1 second.
    """
    mp4_path = UPLOAD_DIR / f"{task_id}.mp4"
    if mp4_path.exists() and mp4_path.stat().st_size > 0:
        return mp4_path

    # Search for video source
    for ext in [".mov", ".mkv", ".webm", ".avi", ".m4v"]:
        cand = UPLOAD_DIR / f"{task_id}{ext}"
        if cand.exists() and cand.stat().st_size > 0:
            try:
                cmd = [
                    "ffmpeg", "-y",
                    "-i", str(cand),
                    "-c", "copy",
                    "-movflags", "+faststart",
                    str(mp4_path)
                ]
                res = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
                if res.returncode == 0 and mp4_path.exists() and mp4_path.stat().st_size > 0:
                    print(f"[OK] Remuxed {cand.name} to web-compatible MP4: {mp4_path.name}")
                    return mp4_path
                else:
                    return cand
            except Exception as e:
                print(f"[Video remux error]: {e}")
                return cand

    return None


def _extract_audio_for_processing(input_path: Path, task_id: str) -> Path:
    """
    Extract optimized MP3 audio from any video (e.g. .mov, .mp4, .mkv) or non-MP3 file.
    This allows Whisper to run much faster, avoids huge RAM usage, and provides a
    universally compatible MP3 stream for browser playback in Chrome, Safari, and Firefox.
    """
    ext = input_path.suffix.lower()
    target_mp3 = input_path.parent / f"{task_id}.mp3"

    if ext == ".mp3" and input_path.exists():
        return input_path

    if target_mp3.exists() and target_mp3.stat().st_size > 0:
        return target_mp3

    try:
        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_path),
            "-vn",
            "-acodec", "libmp3lame",
            "-ab", "192k",
            "-ar", "44100",
            str(target_mp3)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if res.returncode == 0 and target_mp3.exists() and target_mp3.stat().st_size > 0:
            print(f"[OK] Extracted audio to MP3: {target_mp3} (Size: {target_mp3.stat().st_size / (1024*1024):.2f} MB)")
            return target_mp3
        else:
            print(f"[FFmpeg extract warning] Return code {res.returncode}, stderr: {res.stderr[:300]}")
    except Exception as e:
        print(f"[FFmpeg extract error]: {e}")

    return input_path


def _process_meeting(task_id: str, file_path: str):
    """Synchronous heavy processing — runs in a thread via BackgroundTasks."""
    try:
        input_p = Path(file_path)
        is_video = input_p.suffix.lower() in VIDEO_EXTENSIONS
        if is_video:
            _ensure_web_compatible_video(task_id)

        task_manager.update_task(
            task_id,
            status=TaskStatus.PROCESSING,
            progress=5,
            message="Extracting audio stream from recording...",
        )
        processing_audio_path = _extract_audio_for_processing(input_p, task_id)

        task_manager.update_task(task_id, progress=15, message="Loading Whisper model...")

        # ── Transcription ─────────────────────────────────────
        from _transcribe import transcribe_audio_with_diarization
        task_manager.update_task(task_id, progress=25, message="Transcribing audio with Whisper...")
        transcript_data = transcribe_audio_with_diarization(str(processing_audio_path))

        if transcript_data["text"].startswith("Error:"):
            task_manager.update_task(task_id, status=TaskStatus.FAILED, error=transcript_data["text"])
            return

        task_manager.update_task(task_id, progress=40, message="Analyzing speakers...")

        # ── Speaker detection ─────────────────────────────────
        from _speaker_manager import SpeakerManager
        speaker_manager = SpeakerManager()
        speaker_segments = speaker_manager.process_speakers(
            transcript_data, audio_path=str(processing_audio_path)
        )

        task_manager.update_task(task_id, progress=55, message="Cleaning transcript...")

        # ── Text cleaning ─────────────────────────────────────
        from _text_cleaner import clean_transcript
        cleaned_transcript = clean_transcript(transcript_data["text"])

        # ── Format with speaker labels ────────────────────────
        formatted_transcript = speaker_manager.format_transcript_with_speakers(
            cleaned_transcript, speaker_segments
        )

        task_manager.update_task(task_id, progress=70, message="Detecting risks...")

        # ── Risk analysis ─────────────────────────────────────
        from _flagging import RiskDetector
        risk_detector = RiskDetector()
        risk_analysis = risk_detector.analyze_transcript(formatted_transcript or cleaned_transcript)

        task_manager.update_task(task_id, progress=85, message="Segmenting topics...")

        # ── Topic segmentation ────────────────────────────────
        from _topic_segmentation import TopicSegmenter
        segmenter = TopicSegmenter()
        topics = segmenter.segment_topics(transcript_data, formatted_transcript or cleaned_transcript)

        task_manager.update_task(task_id, progress=90, message="Generating AI summary and agenda...")

        # ── Summarization & Next Meeting Agenda ───────────────
        from _summarize import summarize_text
        from _next_meet import AgendaGenerator
        summary_data = summarize_text(formatted_transcript or cleaned_transcript)
        agenda_gen = AgendaGenerator()
        next_agenda = agenda_gen.generate_agenda(
            formatted_transcript or cleaned_transcript, summary_data, risk_analysis
        )

        task_manager.update_task(task_id, progress=98, message="Finalizing...")

        # ── Store results ─────────────────────────────────────
        result = {
            "transcript_data": transcript_data,
            "cleaned_transcript": cleaned_transcript,
            "formatted_transcript": formatted_transcript,
            "speaker_segments": speaker_segments,
            "risk_analysis": risk_analysis,
            "topics": [t if isinstance(t, dict) else t for t in topics],
            "summary": summary_data,
            "next_agenda": next_agenda or [],
            "audio_url": f"/api/audio/{task_id}",
            "video_url": f"/api/video/{task_id}" if is_video else None,
            "media_url": f"/api/video/{task_id}" if is_video else f"/api/audio/{task_id}",
            "is_video": is_video,
        }

        task_manager.update_task(
            task_id,
            status=TaskStatus.COMPLETED,
            progress=100,
            message="Processing complete!",
            result=result,
        )

    except Exception as exc:
        import traceback
        traceback.print_exc()
        task_manager.update_task(task_id, status=TaskStatus.FAILED, error=str(exc))


UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload", response_model=TaskResponse)
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload an audio/video file and start async processing."""
    # Validate extension
    ext = file.filename.split(".")[-1].lower() if file.filename else "mp3"
    if ext not in ALLOWED_EXTENSIONS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

    task = task_manager.create_task()
    saved_path = UPLOAD_DIR / f"{task.id}.{ext}"
    
    # Stream chunks from spool directly to disk to safely handle large recordings (up to 2GB+)
    with open(saved_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    background_tasks.add_task(_process_meeting, task.id, str(saved_path))
    return TaskResponse(task_id=task.id)


@router.api_route("/audio/{task_id}", methods=["GET", "HEAD"])
async def get_audio(task_id: str):
    """Serve the audio stream for playback in the meeting player."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException

    # 1. Prefer extracted MP3 audio if available (lightweight, universally supported in all browsers)
    mp3_path = UPLOAD_DIR / f"{task_id}.mp3"
    if mp3_path.exists() and mp3_path.stat().st_size > 0:
        return FileResponse(mp3_path, media_type="audio/mpeg")

    # 2. Check for original uploaded file
    matches = list(UPLOAD_DIR.glob(f"{task_id}.*"))
    # Filter out partial or temporary files
    valid_matches = [m for m in matches if m.is_file() and m.stat().st_size > 0]
    if valid_matches:
        media_types = {
            ".mp3": "audio/mpeg",
            ".wav": "audio/wav",
            ".m4a": "audio/mp4",
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".webm": "video/webm",
            ".mkv": "video/x-matroska",
            ".avi": "video/x-msvideo",
            ".ogg": "audio/ogg",
            ".aac": "audio/aac",
            ".flac": "audio/flac",
        }
        target_file = valid_matches[0]
        ext = target_file.suffix.lower()
        return FileResponse(target_file, media_type=media_types.get(ext, "application/octet-stream"))
    raise HTTPException(status_code=404, detail="Audio file not found")


@router.api_route("/video/{task_id}", methods=["GET", "HEAD"])
async def get_video(task_id: str):
    """Serve web-compatible MP4 video stream with byte-range support for smooth playback."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException

    video_path = _ensure_web_compatible_video(task_id)
    if video_path and video_path.exists() and video_path.stat().st_size > 0:
        media_types = {
            ".mp4": "video/mp4",
            ".mov": "video/quicktime",
            ".webm": "video/webm",
            ".mkv": "video/x-matroska",
            ".avi": "video/x-msvideo",
        }
        ext = video_path.suffix.lower()
        return FileResponse(video_path, media_type=media_types.get(ext, "video/mp4"))

    raise HTTPException(status_code=404, detail="Video file not found for this task")


@router.api_route("/media/{task_id}", methods=["GET", "HEAD"])
async def get_media(task_id: str):
    """Serve primary media (video if available, otherwise audio) for meeting playback."""
    video_path = _ensure_web_compatible_video(task_id)
    if video_path and video_path.exists() and video_path.stat().st_size > 0:
        return await get_video(task_id)
    return await get_audio(task_id)


@router.api_route("/audio/{task_id}/clip", methods=["GET", "HEAD"])
async def get_audio_clip(task_id: str, start: float = 0.0, end: float = 5.0):
    """Serve a fast, cached MP3 slice from the meeting recording for speaker voice identification."""
    from fastapi.responses import FileResponse
    from fastapi import HTTPException

    start = max(0.0, float(start))
    end = max(start + 0.5, float(end))
    duration = min(15.0, end - start)  # Cap clip at 15s

    # 1. Prefer extracted MP3 audio if available
    audio_source = UPLOAD_DIR / f"{task_id}.mp3"
    if not audio_source.exists():
        matches = list(UPLOAD_DIR.glob(f"{task_id}.*"))
        valid_matches = [
            m for m in matches 
            if m.is_file() and m.suffix.lower() in [".mp3", ".wav", ".m4a", ".mp4", ".mov", ".webm", ".mkv", ".avi"]
        ]
        if valid_matches:
            audio_source = valid_matches[0]
        else:
            raise HTTPException(status_code=404, detail="Audio file not found")

    clip_filename = f"{task_id}_clip_{int(start*100)}_{int((start+duration)*100)}.mp3"
    clip_path = UPLOAD_DIR / clip_filename
    if not clip_path.exists() or clip_path.stat().st_size == 0:
        try:
            cmd = [
                "ffmpeg", "-y",
                "-ss", f"{start:.3f}",
                "-t", f"{duration:.3f}",
                "-i", str(audio_source),
                "-vn",
                "-acodec", "libmp3lame",
                "-ab", "128k",
                "-ar", "44100",
                str(clip_path)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
            if res.returncode != 0 or not clip_path.exists() or clip_path.stat().st_size == 0:
                raise HTTPException(status_code=500, detail="Failed to slice audio clip")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Audio clip generation error: {e}")

    return FileResponse(clip_path, media_type="audio/mpeg")


