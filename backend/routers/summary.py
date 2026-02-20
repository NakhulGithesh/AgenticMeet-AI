"""
POST /api/summary/{task_id} — Generate summary + next-meeting agenda.
"""
from fastapi import APIRouter, HTTPException

from tasks import task_manager, TaskStatus
from models.schemas import SummaryResponse

router = APIRouter()


@router.post("/summary/{task_id}", response_model=SummaryResponse)
async def generate_summary(task_id: str):
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task not completed yet")

    from _summarize import summarize_text
    from _next_meet import AgendaGenerator

    transcript = task.result.get("formatted_transcript") or task.result.get("cleaned_transcript", "")
    risk_analysis = task.result.get("risk_analysis")

    # Summarize
    summary_data = summarize_text(transcript)

    # Generate next-meeting agenda
    agenda_gen = AgendaGenerator()
    next_agenda = agenda_gen.generate_agenda(transcript, summary_data, risk_analysis)

    # Cache in task results
    task_manager.update_task(task_id, result={"summary": summary_data, "next_agenda": next_agenda})

    return SummaryResponse(
        summary=summary_data.get("summary", ""),
        action_items=summary_data.get("action_items", []),
        key_decisions=summary_data.get("key_decisions", []),
        next_agenda=next_agenda or [],
    )
