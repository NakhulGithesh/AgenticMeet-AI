"use client";

import React, { useState, useEffect } from "react";
import {
    FileText,
    CheckCircle2,
    Key,
    HelpCircle,
    Calendar,
    RefreshCw,
    Copy,
    Check,
    Loader2,
    Play,
} from "lucide-react";
import { generateSummary } from "@/lib/api";
import type { SummaryData } from "@/types/meeting";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";

interface SummaryViewProps {
    taskId: string;
    initialSummary?: SummaryData | null;
    onSeekToTime?: (seconds: number) => void;
}

export default function SummaryView({ taskId, initialSummary, onSeekToTime }: SummaryViewProps) {
    const [summary, setSummary] = useState<SummaryData | null>(
        initialSummary && initialSummary.summary ? initialSummary : null
    );
    const [loading, setLoading] = useState(false);
    const [summaryProgress, setSummaryProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        setSummaryProgress(15);
        const timer = setInterval(() => {
            setSummaryProgress((prev) => {
                if (prev >= 90) return prev;
                return prev + Math.floor(Math.random() * 10) + 6;
            });
        }, 250);

        try {
            const res = await generateSummary(taskId);
            setSummaryProgress(100);
            setSummary(res);
        } catch (err) {
            console.error("Failed to generate summary:", err);
            setSummaryProgress(100);
        } finally {
            clearInterval(timer);
            setTimeout(() => {
                setLoading(false);
            }, 300);
        }
    };

    useEffect(() => {
        if (initialSummary && initialSummary.summary) {
            setSummary(initialSummary);
        }
    }, [initialSummary]);

    useEffect(() => {
        if (!summary && taskId && !taskId.startsWith("meeting-")) {
            handleGenerate();
        }
    }, [taskId]);

    // Fallback data if needed
    const execSummary = summary?.summary || "Meeting summary has not been generated yet. Click 'Regenerate Brief' to produce an executive brief, key decisions, and action items.";

    const decisions = summary?.key_decisions || [];

    const actionItems = summary?.action_items || [];

    const openQuestions: string[] = [];

    const nextAgenda = summary?.next_agenda || [];

    const handleCopyAll = () => {
        const docText = `MEETING SUMMARY
Executive Summary:
${execSummary}

Key Decisions:
${decisions.map((d, i) => `${i + 1}. ${d}`).join("\n")}

Action Items:
${actionItems.map((a, i) => `[ ] ${a}`).join("\n")}

Open Questions:
${openQuestions.map((q, i) => `? ${q}`).join("\n")}

Next Meeting Agenda:
${nextAgenda.map((item, i) => `${i + 1}. ${item}`).join("\n")}
`;
        navigator.clipboard.writeText(docText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading && !summary) {
        return (
            <div className="soft-card p-12 bg-white border border-[var(--border-soft)] text-center max-w-lg mx-auto space-y-5 shadow-[0_8px_30px_rgba(102,86,199,0.06)]">
                <AnimatedCircularProgressBar
                    max={100}
                    min={0}
                    value={summaryProgress}
                    gaugePrimaryColor="var(--purple-primary, #6656C7)"
                    gaugeSecondaryColor="var(--purple-bg, #E9E6FA)"
                    className="size-36 mx-auto text-2xl font-bold text-[var(--purple-primary)]"
                />
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                        Generating Meeting Summary...
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">
                        Synthesizing executive brief, decisions, action items, and next meeting agenda.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 w-full">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        Meeting Summary
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        Structured AI notebook document generated from meeting dialogue.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCopyAll}
                        className="btn-secondary !text-xs !py-2 !px-3.5"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-[var(--mint-text)]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "Copied All" : "Copy Document"}</span>
                    </button>

                    <ShimmerButton
                        onClick={handleGenerate}
                        disabled={loading}
                        className="!text-xs !py-2 !px-3.5 shadow-sm gap-2"
                        shimmerDuration="2.5s"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                        <span>{loading ? "Generating..." : "Regenerate"}</span>
                    </ShimmerButton>
                </div>
            </div>

            {/* Document Surface */}
            <div className="soft-card p-8 sm:p-12 bg-white border border-[var(--border-soft)] space-y-10 shadow-[0_4px_30px_-4px_rgba(102,86,199,0.06)]">
                {/* 1. Executive Summary */}
                <section className="space-y-3">
                    <h3 className="text-sm font-bold text-[var(--purple-primary)] uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Executive Summary</span>
                    </h3>
                    <p className="text-sm sm:text-[15px] text-[var(--text-secondary)] leading-relaxed font-normal">
                        {execSummary}
                    </p>
                </section>

                <div className="border-b border-[var(--border-subtle)]" />

                {/* 2. Key Decisions */}
                <section className="space-y-3.5">
                    <h3 className="text-sm font-bold text-[var(--purple-primary)] uppercase tracking-wider flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        <span>Key Decisions</span>
                    </h3>
                    <div className="space-y-2.5">
                        {decisions.length > 0 ? (
                            decisions.map((decision, i) => (
                                <div
                                    key={i}
                                    className="flex items-start justify-between gap-3 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed group p-2 rounded-xl hover:bg-[var(--purple-subtle)]/50 transition-colors"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="w-5 h-5 rounded-full bg-[var(--purple-bg)] text-[var(--purple-primary)] text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {i + 1}
                                        </span>
                                        <span className="font-normal">{decision}</span>
                                    </div>
                                    {onSeekToTime && (
                                        <button
                                            type="button"
                                            onClick={() => onSeekToTime(Math.min(240, (i + 1) * 45))}
                                            className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--purple-primary)] hover:bg-white dark:hover:bg-[#252238] transition-colors cursor-pointer"
                                            title="Play recording at this decision"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-[var(--text-muted)] italic py-1">No decisions recorded yet.</p>
                        )}
                    </div>
                </section>

                <div className="border-b border-[var(--border-subtle)]" />

                {/* 3. Action Items (Mint accents as specified) */}
                <section className="space-y-3.5">
                    <h3 className="text-sm font-bold text-[var(--mint-text)] uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[var(--mint-primary)]" />
                        <span>Action Items</span>
                    </h3>
                    <div className="space-y-2.5">
                        {actionItems.length > 0 ? (
                            actionItems.map((action, i) => (
                                <div
                                    key={i}
                                    className="p-3.5 rounded-xl bg-[var(--mint-soft)]/50 border border-[var(--mint-soft)] flex items-start justify-between gap-3"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className="w-2 h-2 rounded-full bg-[var(--mint-primary)] shrink-0 mt-1.5" />
                                        <span className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] leading-snug">
                                            {action}
                                        </span>
                                    </div>
                                    {onSeekToTime && (
                                        <button
                                            type="button"
                                            onClick={() => onSeekToTime(Math.min(260, (i + 1) * 60))}
                                            className="shrink-0 p-1.5 rounded-lg text-[var(--mint-text)] hover:bg-white/80 dark:hover:bg-[#1E1B2E] transition-colors cursor-pointer"
                                            title="Play recording at this action item"
                                        >
                                            <Play className="w-3.5 h-3.5 fill-current" />
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-[var(--text-muted)] italic py-1">No action items recorded yet.</p>
                        )}
                    </div>
                </section>

                <div className="border-b border-[var(--border-subtle)]" />

                {/* 4. Open Questions */}
                <section className="space-y-3.5">
                    <h3 className="text-sm font-bold text-[var(--purple-primary)] uppercase tracking-wider flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-[var(--purple-primary)]" />
                        <span>Open Questions</span>
                    </h3>
                    <div className="space-y-2.5">
                        {openQuestions.length > 0 ? (
                            openQuestions.map((question, i) => (
                                <div
                                    key={i}
                                    className="p-3.5 rounded-xl bg-[var(--purple-subtle)]/60 border border-[var(--border-soft)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed"
                                >
                                    <span className="font-bold text-[var(--purple-primary)] mr-2">Q:</span>
                                    <span>{question}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-[var(--text-muted)] italic py-1">No open questions noted.</p>
                        )}
                    </div>
                </section>

                <div className="border-b border-[var(--border-subtle)]" />

                {/* 5. Next Meeting Agenda */}
                <section className="space-y-3.5">
                    <h3 className="text-sm font-bold text-[var(--purple-primary)] uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[var(--purple-primary)]" />
                        <span>Next Meeting Agenda</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {nextAgenda.length > 0 ? (
                            nextAgenda.map((agenda, i) => (
                                <div
                                    key={i}
                                    className="p-3 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-soft)] flex items-center gap-3"
                                >
                                    <span className="w-6 h-6 rounded-lg bg-[var(--purple-bg)] text-[var(--purple-primary)] text-xs font-bold flex items-center justify-center shrink-0">
                                        0{i + 1}
                                    </span>
                                    <span className="text-xs font-medium text-[var(--text-secondary)] truncate">
                                        {agenda}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-[var(--text-muted)] italic py-1 col-span-2">No upcoming agenda items.</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
