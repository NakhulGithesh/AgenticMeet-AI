"""
PUT /api/speakers/{task_id} — Rename speakers globally in stored transcript, segments & summary.
"""
import re
from fastapi import APIRouter, HTTPException

from tasks import task_manager, TaskStatus
from models.schemas import SpeakerUpdateRequest

router = APIRouter()


def _clean_speaker_name(name: str) -> str:
    """Strip trailing timestamps or brackets like 'Speaker 1 (00:00)' -> 'Speaker 1'."""
    return re.sub(r"\s*[\(\[]?\d{1,2}:\d{2}(?::\d{2})?[\)\]]?", "", name).strip()


def _update_text(text: str, mappings: dict) -> str:
    """Replace speaker names in dialogue lines, timestamps, and notes."""
    if not text:
        return ""
    updated = text
    for old_name, new_name in mappings.items():
        if not old_name or not new_name or old_name == new_name:
            continue
        old_clean = _clean_speaker_name(old_name)
        new_clean = _clean_speaker_name(new_name)
        if not old_clean or not new_clean:
            continue

        # 1. Matches "Speaker 1 (00:00):" or "[Speaker 1] (00:00):" at line starts
        pattern1 = rf"(?m)(^|\n)(\s*\[?){re.escape(old_clean)}(\]?\s*(?:\([^)]*\))?\s*:)"
        updated = re.sub(pattern1, rf"\1\2{new_clean}\3", updated)

        # 2. Plain "Speaker 1:" anywhere
        pattern2 = rf"(?i)\b{re.escape(old_clean)}\s*:"
        updated = re.sub(pattern2, f"{new_clean}:", updated)

        # 3. Inside parentheses "(Speaker 1)" or brackets "[Speaker 1]"
        pattern3 = rf"(?i)\({re.escape(old_clean)}\)"
        updated = re.sub(pattern3, f"({new_clean})", updated)
        pattern4 = rf"(?i)\[{re.escape(old_clean)}\]"
        updated = re.sub(pattern4, f"[{new_clean}]", updated)

        # 4. Anywhere old name appears as a standalone entity in summary or notes
        pattern5 = rf"\b{re.escape(old_clean)}\b"
        updated = re.sub(pattern5, new_clean, updated)

    return updated


@router.put("/speakers/{task_id}")
async def update_speakers(task_id: str, body: SpeakerUpdateRequest):
    task = task_manager.get_task(task_id)
    if task is None:
        task = task_manager._create_sample_task(task_id)
        task_manager._tasks[task_id] = task

    formatted = task.result.get("formatted_transcript", "") or body.formatted_transcript or ""
    cleaned = task.result.get("cleaned_transcript", "")

    updated_formatted = _update_text(formatted, body.speaker_mappings)
    updated_cleaned = _update_text(cleaned, body.speaker_mappings)

    # 1. Update speaker_segments
    segments = task.result.get("speaker_segments", [])
    updated_segments = []
    for seg in segments:
        orig = seg.get("speaker", "")
        clean_orig = _clean_speaker_name(orig)
        mapped = (
            body.speaker_mappings.get(orig)
            or body.speaker_mappings.get(clean_orig)
            or orig
        )
        seg_copy = dict(seg)
        seg_copy["speaker"] = mapped
        seg_copy["text"] = _update_text(seg.get("text", ""), body.speaker_mappings)
        updated_segments.append(seg_copy)

    # 2. Update summary (action items, key decisions, next agenda)
    summary_data = task.result.get("summary")
    updated_summary = None
    if summary_data and isinstance(summary_data, dict):
        sum_text = _update_text(summary_data.get("summary", ""), body.speaker_mappings)
        actions = [_update_text(a, body.speaker_mappings) for a in summary_data.get("action_items", [])]
        decisions = [_update_text(d, body.speaker_mappings) for d in summary_data.get("key_decisions", [])]
        agenda = [_update_text(ag, body.speaker_mappings) for ag in summary_data.get("next_agenda", [])]
        updated_summary = {
            "summary": sum_text,
            "action_items": actions,
            "key_decisions": decisions,
            "next_agenda": agenda,
        }

    # 3. Update topics
    topics = task.result.get("topics", [])
    updated_topics = []
    for t in topics:
        t_copy = dict(t)
        t_copy["content"] = _update_text(t.get("content", ""), body.speaker_mappings)
        t_copy["summary"] = _update_text(t.get("summary", ""), body.speaker_mappings)
        updated_topics.append(t_copy)

    # Save into task
    task.result.update({
        "formatted_transcript": updated_formatted,
        "cleaned_transcript": updated_cleaned,
        "speaker_segments": updated_segments,
        "speaker_names": list(set([s["speaker"] for s in updated_segments])) or list(body.speaker_mappings.values()),
        "speaker_mappings": {**(task.result.get("speaker_mappings") or {}), **body.speaker_mappings},
        "summary": updated_summary or summary_data,
        "topics": updated_topics or topics,
    })

    return {
        "message": "Speaker names updated",
        "formatted_transcript": updated_formatted,
        "cleaned_transcript": updated_cleaned,
        "speaker_segments": updated_segments,
        "summary": updated_summary,
        "topics": updated_topics,
    }
