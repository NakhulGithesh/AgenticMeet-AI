/**
 * TypeScript interfaces matching backend Pydantic schemas.
 */

export interface TaskResponse {
    task_id: string;
}

export interface TaskStatusResponse {
    id: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    message: string;
    result?: MeetingResult | null;
    error?: string | null;
}

export interface MeetingResult {
    formatted_transcript: string;
    cleaned_transcript: string;
    speaker_segments: SpeakerSegment[];
    risk_analysis: RiskAnalysis;
    topics: TopicSegment[];
}

export interface SpeakerSegment {
    speaker: string;
    text: string;
    start?: number;
    end?: number;
    word_count?: number;
}

export interface RiskAnalysis {
    deadlines: string[];
    budget_risks: string[];
    legal_concerns: string[];
    customer_issues: string[];
    urgency_score?: number;
    priority?: string;
    summary?: string;
}

export interface SpeakerStat {
    speaker: string;
    word_count: number;
    speaking_time: number;
}

export interface AnalyticsData {
    total_speakers: number;
    total_words: number;
    duration: number;
    words_per_minute: number;
    speaker_stats: SpeakerStat[];
    keywords: [string, number][];
}

export interface SummaryData {
    summary: string;
    action_items: string[];
    key_decisions: string[];
    next_agenda: string[];
}

export interface TopicSegment {
    timestamp: string;
    title: string;
    content: string;
    summary: string;
    duration: string;
}

export type ActiveTab =
    | "dashboard"
    | "transcript"
    | "speakers"
    | "risks"
    | "analytics"
    | "topics"
    | "summary"
    | "export";
