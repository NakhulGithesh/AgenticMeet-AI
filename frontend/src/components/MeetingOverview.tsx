"use client";

import React, { useState } from "react";
import {
    CheckCircle2,
    Calendar,
    Sparkles,
    Key,
    ArrowUpRight,
    User,
    Check
} from "lucide-react";
import GlassCard from "./GlassCard";
import type { MeetingResult } from "@/types/meeting";

interface MeetingOverviewProps {
    result: MeetingResult;
    onViewTab?: (tab: any) => void;
}

export default function MeetingOverview({ result, onViewTab }: MeetingOverviewProps) {
    const summary = result.summary;
    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

    const toggleCheck = (index: number) => {
        setCheckedItems((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    // Extract decisions, actions, agenda
    const decisions = summary?.key_decisions || [];

    const actionItems = (summary?.action_items || []).map((item, idx) => {
        let taskText = item;
        let person = "";
        let deadline = "Upcoming";

        const personMatch = item.match(/\(([^)]+)\)\s*$/);
        if (personMatch) {
            person = personMatch[1].trim();
            taskText = item.replace(/\s*\([^)]+\)\s*$/, "").trim();
        } else if (result.speaker_segments && result.speaker_segments.length > 0) {
            person = result.speaker_segments[idx % result.speaker_segments.length].speaker;
        } else {
            person = "Team Member";
        }

        const deadlineMatch = item.match(/by\s+([A-Za-z0-9:\s]+?)(?:\(|$)/i);
        if (deadlineMatch) {
            deadline = deadlineMatch[1].trim();
        }

        return {
            task: taskText,
            person,
            deadline,
        };
    });

    const agendaItems = summary?.next_agenda || [];

    const executiveSummary = summary?.summary ||
        (result.cleaned_transcript ? result.cleaned_transcript.slice(0, 300) + "..." : "Meeting overview and summary are generating or processing. Check back once transcription completes.");

    return (
        <div className="space-y-6 w-full">
            {/* 1. Large Summary Card */}
            <div className="soft-card p-7 sm:p-8 bg-white border border-[var(--border-soft)] relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5 text-[var(--purple-primary)]">
                        <div className="w-8 h-8 rounded-xl bg-[var(--purple-bg)] flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-[var(--purple-primary)]" />
                        </div>
                        <h2 className="text-base font-bold text-[var(--text-primary)]">
                            Meeting Summary
                        </h2>
                    </div>
                    <span className="text-xs font-semibold text-[var(--purple-primary)] bg-[var(--purple-bg)] px-3 py-1 rounded-full">
                        AI Generated
                    </span>
                </div>

                <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed font-normal">
                    {executiveSummary}
                </p>
            </div>

            {/* 2. Key Decisions & Action Items (2-column layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Key Decisions */}
                <div className="soft-card p-6 sm:p-7 bg-white border border-[var(--border-soft)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[var(--purple-bg)] text-[var(--purple-primary)] flex items-center justify-center">
                                    <Key className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Key decisions
                                </h3>
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)]">
                                {decisions.length} recorded
                            </span>
                        </div>

                        <div className="space-y-3">
                            {decisions.length > 0 ? (
                                decisions.map((decision, i) => (
                                    <div
                                        key={i}
                                        className="p-3.5 rounded-xl bg-[var(--purple-subtle)]/70 border border-[var(--border-soft)]/60 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed flex items-start gap-3"
                                    >
                                        <span className="w-5 h-5 rounded-full bg-[var(--purple-bg)] text-[var(--purple-primary)] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span>{decision}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] italic py-2">No key decisions identified yet.</p>
                            )}
                        </div>
                    </div>

                    {onViewTab && (
                        <button
                            onClick={() => onViewTab("summary")}
                            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--purple-primary)] hover:underline pt-2"
                        >
                            <span>View full summary document</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Action Items */}
                <div className="soft-card p-6 sm:p-7 bg-white border border-[var(--border-soft)] flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-[var(--mint-soft)] text-[var(--mint-text)] flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Action items
                                </h3>
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)]">
                                {actionItems.length} tasks
                            </span>
                        </div>

                        <div className="space-y-2.5">
                            {actionItems.length > 0 ? (
                                actionItems.map((item, i) => {
                                    const isDone = !!checkedItems[i];
                                    return (
                                        <div
                                            key={i}
                                            onClick={() => toggleCheck(i)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                                                isDone
                                                    ? "bg-gray-50 border-gray-200 opacity-60"
                                                    : "bg-white border-[var(--border-soft)] hover:border-[var(--mint-light)] shadow-xs"
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                                                    isDone
                                                        ? "bg-[var(--mint-primary)] text-white"
                                                        : "border-2 border-[var(--border-soft)] bg-white"
                                                }`}
                                            >
                                                {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p
                                                    className={`text-xs sm:text-sm leading-snug ${
                                                        isDone
                                                            ? "line-through text-[var(--text-muted)]"
                                                            : "text-[var(--text-secondary)] font-medium"
                                                    }`}
                                                >
                                                    {item.task}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
                                                    <span className="inline-flex items-center gap-1 font-semibold text-[var(--purple-primary)] bg-[var(--purple-bg)] px-2 py-0.5 rounded-md">
                                                        <User className="w-3 h-3" />
                                                        {item.person}
                                                    </span>
                                                    {item.deadline && (
                                                        <span className="text-[var(--text-muted)]">
                                                            Due: {item.deadline}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] italic py-2">No action items detected yet.</p>
                            )}
                        </div>
                    </div>

                    {onViewTab && (
                        <button
                            onClick={() => onViewTab("transcript")}
                            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--mint-text)] hover:underline pt-2"
                        >
                            <span>Read task context in transcript</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* 3. Next Meeting Agenda Card */}
            <div className="soft-card p-6 sm:p-7 bg-white border border-[var(--border-soft)]">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[var(--border-subtle)]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[var(--blue-soft)] text-[var(--blue-text)] flex items-center justify-center">
                            <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            Next meeting
                        </h3>
                    </div>
                    <span className="text-xs font-semibold text-[var(--blue-text)] bg-[var(--blue-soft)] px-3 py-1 rounded-full">
                        Suggested Agenda
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {agendaItems.length > 0 ? (
                        agendaItems.map((item, i) => (
                            <div
                                key={i}
                                className="p-3.5 rounded-xl bg-[var(--purple-subtle)]/50 border border-[var(--border-soft)] flex items-start gap-3"
                            >
                                <span className="text-xs font-bold text-[var(--blue-primary)] bg-white w-6 h-6 rounded-lg border border-[var(--border-soft)] flex items-center justify-center shrink-0 mt-0.5">
                                    0{i + 1}
                                </span>
                                <span className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                                    {item}
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-[var(--text-muted)] italic py-2 col-span-2">No upcoming agenda items.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
