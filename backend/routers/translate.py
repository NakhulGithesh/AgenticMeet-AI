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

    transcript = (
        body.transcript
        or task.result.get("formatted_transcript")
        or task.result.get("cleaned_transcript", "")
    )

    if not transcript:
        raise HTTPException(status_code=400, detail="No transcript available for translation")

    if body.language == "English":
        return {"language": "English", "translated_transcript": transcript}

    # Check cache first
    translations = task.result.get("translations", {})
    if body.language in translations:
        return {"language": body.language, "translated_transcript": translations[body.language]}

    try:
        from _translator import MultiLanguageTranslator
        translator = MultiLanguageTranslator()
        translated = translator.translate_with_speaker_preservation(transcript, body.language)
    except Exception as e:
        translated = f"[{body.language} Translation unavailable: {str(e)}]\n\n" + transcript

    # Cache translation
    translations[body.language] = translated
    task_manager.update_task(task_id, result={"translations": translations})

    return {"language": body.language, "translated_transcript": translated}
