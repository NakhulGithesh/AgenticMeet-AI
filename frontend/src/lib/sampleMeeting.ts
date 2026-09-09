import type { MeetingResult } from "@/types/meeting";

export interface StoredMeeting {
    id: string;
    title: string;
    date: string;
    duration: string;
    status: "Completed" | "Processing";
    result: MeetingResult;
}

export const SAMPLE_MEETINGS: Record<string, StoredMeeting> = {};
