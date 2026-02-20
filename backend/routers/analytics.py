"""
GET /api/analytics/{task_id} — Meeting analytics (speaker stats, keywords).
"""
from fastapi import APIRouter, HTTPException

from tasks import task_manager, TaskStatus
from models.schemas import AnalyticsResponse

router = APIRouter()


@router.get("/analytics/{task_id}", response_model=AnalyticsResponse)
async def get_analytics(task_id: str):
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task not completed yet")

    from _analytics import MeetingAnalyzer

    transcript_data = task.result.get("transcript_data", {})
    cleaned = task.result.get("cleaned_transcript", "")

    analyzer = MeetingAnalyzer(transcript_data, cleaned)
    analytics = analyzer.get_analytics()

    return AnalyticsResponse(
        total_speakers=analytics.get("total_speakers", 1),
        total_words=analytics.get("total_words", 0),
        duration=analytics.get("duration", 0),
        words_per_minute=analytics.get("words_per_minute", 0),
        speaker_stats=analytics.get("speaker_stats", []),
        keywords=analytics.get("keywords", []),
    )
