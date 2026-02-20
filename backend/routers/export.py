"""
GET /api/export/{task_id}?type=pdf|risk — Export meeting report as PDF.
"""
import io
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from tasks import task_manager, TaskStatus

router = APIRouter()


@router.get("/export/{task_id}")
async def export_report(task_id: str, type: str = Query("pdf", regex="^(pdf|risk)$")):
    task = task_manager.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Task not completed yet")

    from _export_manager import ExportManager

    export_manager = ExportManager()
    export_data = {
        "transcript": task.result.get("formatted_transcript", ""),
        "summary": task.result.get("summary"),
        "topics": task.result.get("topics"),
        "speakers": task.result.get("speaker_names"),
        "translations": task.result.get("translations"),
        "risks": task.result.get("risk_analysis"),
        "next_agenda": task.result.get("next_agenda"),
    }

    try:
        if type == "risk":
            pdf_bytes = export_manager.export_risk_report(export_data)
        else:
            pdf_bytes = export_manager.export_comprehensive_pdf(export_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    # Return as downloadable PDF
    return StreamingResponse(
        io.BytesIO(pdf_bytes) if isinstance(pdf_bytes, bytes) else pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=meeting_report_{type}.pdf"},
    )
