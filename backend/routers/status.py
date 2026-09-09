"""
GET /api/status/{task_id} — Poll for task progress / results.
"""
from fastapi import APIRouter, HTTPException

from tasks import task_manager
from models.schemas import TaskStatusResponse

router = APIRouter()


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_status(task_id: str):
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    # Build result payload (only include serialisable meeting data)
    result_payload = None
    if task.result:
        from pathlib import Path
        uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
        has_video = bool(
            task.result.get("is_video") or
            (uploads_dir / f"{task_id}.mp4").exists() or
            (uploads_dir / f"{task_id}.mov").exists()
        )
        audio_url = task.result.get("audio_url") or f"/api/audio/{task_id}"
        video_url = task.result.get("video_url") or (f"/api/video/{task_id}" if has_video else None)
        media_url = task.result.get("media_url") or (video_url if has_video else audio_url)

        result_payload = {
            "formatted_transcript": task.result.get("formatted_transcript", ""),
            "cleaned_transcript": task.result.get("cleaned_transcript", ""),
            "speaker_segments": task.result.get("speaker_segments", []),
            "risk_analysis": task.result.get("risk_analysis", {}),
            "topics": task.result.get("topics", []),
            "summary": task.result.get("summary", {}),
            "next_agenda": task.result.get("next_agenda", []),
            "speaker_mappings": task.result.get("speaker_mappings", {}),
            "speaker_photos": task.result.get("speaker_photos", {}),
            "audio_url": audio_url,
            "video_url": video_url,
            "media_url": media_url,
            "is_video": has_video,
        }

    return TaskStatusResponse(
        id=task.id,
        status=task.status.value,
        progress=task.progress,
        message=task.message,
        result=result_payload,
        error=task.error,
    )
