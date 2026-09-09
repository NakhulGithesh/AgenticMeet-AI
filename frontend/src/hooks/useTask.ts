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
    const errorCountRef = useRef(0);

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
        errorCountRef.current = 0;

        const poll = async () => {
            try {
                const s = await getTaskStatus(taskId);
                errorCountRef.current = 0;
                setStatus(s);
                if (s.status === "completed" || s.status === "failed") {
                    stopPolling();
                }
            } catch (err) {
                errorCountRef.current += 1;
                // Only stop polling if there are persistent consecutive errors (10 times = 20s)
                if (errorCountRef.current >= 10) {
                    stopPolling();
                }
            }
        };

        poll(); // immediate first check
        intervalRef.current = setInterval(poll, 2000);
    }, [taskId, stopPolling]);

    useEffect(() => {
        // Crucial: Clear old task status immediately when switching tasks or clearing taskId
        setStatus(null);
        errorCountRef.current = 0;
        if (taskId) {
            startPolling();
        } else {
            stopPolling();
        }
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
