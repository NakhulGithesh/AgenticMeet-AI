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

    # Check cache first (only return if genuine translation)
    translations = task.result.get("translations", {})
    cached = translations.get(body.language)
    if cached and not cached.startswith(f"[{body.language} Translation unavailable"):
        if body.language != "Hindi" or any("\u0900" <= ch <= "\u097f" for ch in cached):
            return {"language": body.language, "translated_transcript": cached}

    try:
        from _translator import MultiLanguageTranslator
        translator = MultiLanguageTranslator()
        translated = translator.translate_with_speaker_preservation(transcript, body.language)

        # Cache only valid successful translations
        if translated and not translated.startswith(f"[{body.language} Translation unavailable"):
            if body.language != "Hindi" or any("\u0900" <= ch <= "\u097f" for ch in translated):
                translations[body.language] = translated
                task_manager.update_task(task_id, result={"translations": translations})
    except Exception as e:
        translated = f"[{body.language} Translation unavailable: {str(e)}]\n\n" + transcript

    return {"language": body.language, "translated_transcript": translated}
