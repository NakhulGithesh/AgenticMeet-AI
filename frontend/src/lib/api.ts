/**
 * API client — wraps all backend calls.
 */
import axios from "axios";
import type {
    TaskResponse,
    TaskStatusResponse,
    AnalyticsData,
    SummaryData,
} from "@/types/meeting";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
    timeout: 120_000,
});

/* ── Upload ─────────────────────────────────────────────────── */
export async function uploadFile(file: File): Promise<TaskResponse> {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<TaskResponse>("/upload", form);
    return data;
}

/* ── Status / Polling ───────────────────────────────────────── */
export async function getTaskStatus(
    taskId: string
): Promise<TaskStatusResponse> {
    const { data } = await api.get<TaskStatusResponse>(`/status/${taskId}`);
    return data;
}

/* ── Analytics ──────────────────────────────────────────────── */
export async function getAnalytics(taskId: string): Promise<AnalyticsData> {
    const { data } = await api.get<AnalyticsData>(`/analytics/${taskId}`);
    return data;
}

/* ── Summary ────────────────────────────────────────────────── */
export async function generateSummary(taskId: string): Promise<SummaryData> {
    const { data } = await api.post<SummaryData>(`/summary/${taskId}`);
    return data;
}

/* ── Translation ────────────────────────────────────────────── */
export async function translateTranscript(
    taskId: string,
    language: string
): Promise<{ language: string; translated_transcript: string }> {
    const { data } = await api.post(`/translate/${taskId}`, { language });
    return data;
}

/* ── Speaker Rename ─────────────────────────────────────────── */
export async function updateSpeakers(
    taskId: string,
    speakerMappings: Record<string, string>
): Promise<{ message: string; formatted_transcript: string }> {
    const { data } = await api.put(`/speakers/${taskId}`, {
        speaker_mappings: speakerMappings,
    });
    return data;
}

/* ── Export ──────────────────────────────────────────────────── */
export function getExportUrl(taskId: string, type: "pdf" | "risk"): string {
    const base =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    return `${base}/export/${taskId}?type=${type}`;
}
