/**
 * useTask — custom hook for polling task status.
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getTaskStatus } from "@/lib/api";
import type { TaskStatusResponse, MeetingResult } from "@/types/meeting";

export function useTask(taskId: string | null) {
    const [status, setStatus] = useState<TaskStatusResponse | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const stopPolling = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsPolling(false);
    }, []);

    const startPolling = useCallback(() => {
        if (!taskId) return;
        setIsPolling(true);

        const poll = async () => {
            try {
                const s = await getTaskStatus(taskId);
                setStatus(s);
                if (s.status === "completed" || s.status === "failed") {
                    stopPolling();
                }
            } catch {
                stopPolling();
            }
        };

        poll(); // immediate first check
        intervalRef.current = setInterval(poll, 2000);
    }, [taskId, stopPolling]);

    useEffect(() => {
        if (taskId) startPolling();
        return stopPolling;
    }, [taskId, startPolling, stopPolling]);

    return {
        status,
        isPolling,
        isCompleted: status?.status === "completed",
        isFailed: status?.status === "failed",
        progress: status?.progress ?? 0,
        message: status?.message ?? "",
        result: status?.result as MeetingResult | undefined,
        error: status?.error,
    };
}
