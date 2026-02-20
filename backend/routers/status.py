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
        result_payload = {
            "formatted_transcript": task.result.get("formatted_transcript", ""),
            "cleaned_transcript": task.result.get("cleaned_transcript", ""),
            "speaker_segments": task.result.get("speaker_segments", []),
            "risk_analysis": task.result.get("risk_analysis", {}),
            "topics": task.result.get("topics", []),
        }

    return TaskStatusResponse(
        id=task.id,
        status=task.status.value,
        progress=task.progress,
        message=task.message,
        result=result_payload,
        error=task.error,
    )
