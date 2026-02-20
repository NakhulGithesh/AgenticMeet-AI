"""
POST /api/upload — Accept audio/video file, start async transcription.
"""
import os
import tempfile
import asyncio
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, BackgroundTasks

from tasks import task_manager, TaskStatus
from models.schemas import TaskResponse

router = APIRouter()

ALLOWED_EXTENSIONS = {"mp3", "wav", "mp4", "m4a"}


def _process_meeting(task_id: str, file_path: str):
    """Synchronous heavy processing — runs in a thread via BackgroundTasks."""
    try:
        task_manager.update_task(task_id, status=TaskStatus.PROCESSING, progress=10, message="Loading Whisper model...")

        # ── Transcription ─────────────────────────────────────
        from _transcribe import transcribe_audio_with_diarization
        task_manager.update_task(task_id, progress=20, message="Transcribing audio...")
        transcript_data = transcribe_audio_with_diarization(file_path)

        if transcript_data["text"].startswith("Error:"):
            task_manager.update_task(task_id, status=TaskStatus.FAILED, error=transcript_data["text"])
            return

        task_manager.update_task(task_id, progress=40, message="Analyzing speakers...")

        # ── Speaker detection ─────────────────────────────────
        from _speaker_manager import SpeakerManager
        speaker_manager = SpeakerManager()
        speaker_segments = speaker_manager.process_speakers(transcript_data)

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

        task_manager.update_task(task_id, progress=95, message="Finalizing...")

        # ── Store results ─────────────────────────────────────
        result = {
            "transcript_data": transcript_data,
            "cleaned_transcript": cleaned_transcript,
            "formatted_transcript": formatted_transcript,
            "speaker_segments": speaker_segments,
            "risk_analysis": risk_analysis,
            "topics": [t if isinstance(t, dict) else t for t in topics],
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
    finally:
        # Clean up temp file
        try:
            if os.path.exists(file_path):
                os.unlink(file_path)
        except Exception:
            pass


@router.post("/upload", response_model=TaskResponse)
async def upload_file(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Upload an audio/video file and start async processing."""
    # Validate extension
    ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")

    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    # Create task & kick off background processing
    task = task_manager.create_task()
    background_tasks.add_task(_process_meeting, task.id, tmp_path)

    return TaskResponse(task_id=task.id)
