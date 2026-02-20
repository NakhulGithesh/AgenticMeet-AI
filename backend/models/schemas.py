"""
Pydantic models for API requests and responses.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Task ──────────────────────────────────────────────────────────────

class TaskResponse(BaseModel):
    task_id: str


class TaskStatusResponse(BaseModel):
    id: str
    status: str
    progress: int
    message: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


# ── Meeting data ──────────────────────────────────────────────────────

class SpeakerSegment(BaseModel):
    speaker: str
    text: str
    start: Optional[float] = None
    end: Optional[float] = None
    word_count: Optional[int] = None


class RiskItem(BaseModel):
    category: str  # deadlines | budget_risks | legal_concerns | customer_issues
    text: str


class RiskAnalysisResponse(BaseModel):
    deadlines: List[str] = []
    budget_risks: List[str] = []
    legal_concerns: List[str] = []
    customer_issues: List[str] = []
    urgency_score: Optional[int] = None
    priority: Optional[str] = None
    summary: Optional[str] = None


class SpeakerStat(BaseModel):
    speaker: str
    word_count: int
    speaking_time: float


class AnalyticsResponse(BaseModel):
    total_speakers: int
    total_words: int
    duration: float
    words_per_minute: float
    speaker_stats: List[SpeakerStat] = []
    keywords: List[List[Any]] = []


class SummaryResponse(BaseModel):
    summary: str
    action_items: List[str] = []
    key_decisions: List[str] = []
    next_agenda: List[str] = []


class TopicSegment(BaseModel):
    timestamp: str
    title: str
    content: str
    summary: str
    duration: str


class MeetingDataResponse(BaseModel):
    """Full meeting data returned when task completes."""
    transcript: str
    formatted_transcript: str
    speaker_segments: List[Dict[str, Any]] = []
    risk_analysis: Optional[RiskAnalysisResponse] = None
    topics: List[TopicSegment] = []


# ── Requests ──────────────────────────────────────────────────────────

class TranslationRequest(BaseModel):
    language: str  # "Spanish" | "Hindi" | "French" | "German"


class SpeakerUpdateRequest(BaseModel):
    speaker_mappings: Dict[str, str]  # { "Speaker 1": "Alice", ... }
