"""
PUT /api/speakers/{task_id} — Rename speakers globally in stored transcript.
"""
import re
from fastapi import APIRouter, HTTPException

from tasks import task_manager, TaskStatus
from models.schemas import SpeakerUpdateRequest

router = APIRouter()


def _update_transcript(transcript: str, mappings: dict) -> str:
    """Replace speaker labels in transcript text."""
    updated = transcript
    for old_name, new_name in mappings.items():
        if old_name != new_name and new_name.strip():
            for pattern in [f"{old_name}:", f"{old_name} :", old_name.lower() + ":", old_name.lower() + " :"]:
                updated = updated.replace(pattern, f"{new_name}:")
    return updated


@router.put("/speakers/{task_id}")
async def update_speakers(task_id: str, body: SpeakerUpdateRequest):
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task not completed yet")

    formatted = task.result.get("formatted_transcript", "")
    updated_transcript = _update_transcript(formatted, body.speaker_mappings)

    # Update stored data
    task_manager.update_task(
        task_id,
        result={
            "formatted_transcript": updated_transcript,
            "speaker_names": body.speaker_mappings,
        },
    )

    return {
        "message": "Speaker names updated",
        "formatted_transcript": updated_transcript,
    }
