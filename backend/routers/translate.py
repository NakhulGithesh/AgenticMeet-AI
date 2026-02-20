"""
POST /api/translate/{task_id} — Translate transcript to a target language.
"""
from fastapi import APIRouter, HTTPException

from tasks import task_manager, TaskStatus
from models.schemas import TranslationRequest

router = APIRouter()


@router.post("/translate/{task_id}")
async def translate_transcript(task_id: str, body: TranslationRequest):
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task not completed yet")

    from _translator import MultiLanguageTranslator

    transcript = task.result.get("formatted_transcript") or task.result.get("cleaned_transcript", "")

    if body.language == "English":
        return {"language": "English", "translated_transcript": transcript}

    try:
        translator = MultiLanguageTranslator()
        translated = translator.translate_with_speaker_preservation(transcript, body.language)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation failed: {str(e)}")

    # Cache translation
    translations = task.result.get("translations", {})
    translations[body.language] = translated
    task_manager.update_task(task_id, result={"translations": translations})

    return {"language": body.language, "translated_transcript": translated}
