"""
In-memory async task manager for long-running jobs (transcription, summarization).
"""
from __future__ import annotations

import json
import uuid
from pathlib import Path
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, Optional


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class TaskState:
    id: str
    status: TaskStatus = TaskStatus.PENDING
    progress: int = 0          # 0-100
    message: str = ""
    result: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None


class TaskManager:
    """Singleton-ish in-memory task store."""

    def __init__(self):
        self._tasks: Dict[str, TaskState] = {}

    def create_task(self) -> TaskState:
        task_id = uuid.uuid4().hex[:12]
        task = TaskState(id=task_id)
        self._tasks[task_id] = task
        return task

    def _save_task_to_disk(self, task: TaskState):
        try:
            uploads_dir = Path(__file__).resolve().parent / "uploads"
            uploads_dir.mkdir(exist_ok=True)
            target = uploads_dir / f"{task.id}_task.json"
            data = {
                "id": task.id,
                "status": task.status.value if isinstance(task.status, TaskStatus) else str(task.status),
                "progress": task.progress,
                "message": task.message,
                "result": task.result,
                "error": task.error,
            }
            with open(target, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"[TaskManager] Error saving task {task.id} to disk: {e}")

    def _load_task_from_disk(self, task_id: str) -> Optional[TaskState]:
        try:
            uploads_dir = Path(__file__).resolve().parent / "uploads"
            target = uploads_dir / f"{task_id}_task.json"
            if target.exists():
                with open(target, "r", encoding="utf-8") as f:
                    data = json.load(f)
                status_str = data.get("status", "completed")
                try:
                    status = TaskStatus(status_str)
                except ValueError:
                    status = TaskStatus.COMPLETED
                task = TaskState(
                    id=data["id"],
                    status=status,
                    progress=data.get("progress", 100),
                    message=data.get("message", "Completed"),
                    result=data.get("result", {}),
                    error=data.get("error"),
                )
                return task
        except Exception as e:
            print(f"[TaskManager] Error loading task {task_id} from disk: {e}")
        return None

    def get_task(self, task_id: str) -> Optional[TaskState]:
        task = self._tasks.get(task_id)
        if task is not None:
            return task
        # Try loading persisted task from disk
        disk_task = self._load_task_from_disk(task_id)
        if disk_task is not None:
            self._tasks[task_id] = disk_task
            return disk_task
        return None

    def update_task(
        self,
        task_id: str,
        *,
        status: Optional[TaskStatus] = None,
        progress: Optional[int] = None,
        message: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        task = self._tasks.get(task_id)
        if task is None:
            task = self._load_task_from_disk(task_id)
            if task is not None:
                self._tasks[task_id] = task
            else:
                task = TaskState(id=task_id)
                self._tasks[task_id] = task
        if status is not None:
            task.status = status
        if progress is not None:
            task.progress = progress
        if message is not None:
            task.message = message
        if result is not None:
            task.result.update(result)
        if error is not None:
            task.error = error

        if task.status == TaskStatus.COMPLETED or task.progress == 100 or error is not None:
            self._save_task_to_disk(task)


# Global instance shared across routers
task_manager = TaskManager()
