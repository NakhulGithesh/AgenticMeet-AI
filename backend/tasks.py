"""
In-memory async task manager for long-running jobs (transcription, summarization).
"""
from __future__ import annotations

import uuid
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

    def get_task(self, task_id: str) -> Optional[TaskState]:
        return self._tasks.get(task_id)

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
            return
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


# Global instance shared across routers
task_manager = TaskManager()
