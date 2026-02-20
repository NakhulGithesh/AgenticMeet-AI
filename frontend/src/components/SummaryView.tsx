"use client";

import React, { useState } from "react";
import { ClipboardList, Loader2, CheckCircle2, Key, Calendar } from "lucide-react";
import GlassCard from "./GlassCard";
import { generateSummary } from "@/lib/api";
import type { SummaryData } from "@/types/meeting";

interface SummaryViewProps { taskId: string; }

export default function SummaryView({ taskId }: SummaryViewProps) {
    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        setLoading(true);
        try { setSummary(await generateSummary(taskId)); } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    if (!summary) {
        return (
            <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-[var(--accent-purple)] mx-auto mb-4 opacity-40" />
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">Generate Meeting Summary</h2>
                <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md mx-auto">
                    AI will analyze the transcript to extract a summary, action items, key decisions, and agenda.
                </p>
                <button onClick={handleGenerate} disabled={loading} className="btn-primary">
                    {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Generating...</span> : "✨ Generate Summary"}
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="lg:col-span-2 !p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                    <ClipboardList className="w-4 h-4 text-[var(--accent-purple)]" /> Executive Summary
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{summary.summary}</p>
            </GlassCard>

            <GlassCard className="!p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--accent-green)]" /> Action Items
                </h3>
                {summary.action_items.length > 0 ? (
                    <ul className="space-y-2">
                        {summary.action_items.map((item, i) => <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"><span className="text-[var(--accent-green)] shrink-0 mt-0.5">●</span>{item}</li>)}
                    </ul>
                ) : <p className="text-xs text-[var(--text-muted)]">No action items extracted.</p>}
            </GlassCard>

            <GlassCard className="!p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                    <Key className="w-4 h-4 text-[var(--accent-orange)]" /> Key Decisions
                </h3>
                {summary.key_decisions.length > 0 ? (
                    <ul className="space-y-2">
                        {summary.key_decisions.map((d, i) => <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]"><span className="text-[var(--accent-orange)] shrink-0 mt-0.5">●</span>{d}</li>)}
                    </ul>
                ) : <p className="text-xs text-[var(--text-muted)]">No key decisions extracted.</p>}
            </GlassCard>

            {summary.next_agenda.length > 0 && (
                <GlassCard className="lg:col-span-2 !p-5">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[var(--text-primary)]">
                        <Calendar className="w-4 h-4 text-[var(--accent-blue)]" /> Suggested Next Meeting Agenda
                    </h3>
                    <ol className="space-y-2">
                        {summary.next_agenda.map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                                <span className="text-xs font-bold text-[var(--accent-blue)] bg-[var(--accent-blue-bg)] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                                {item}
                            </li>
                        ))}
                    </ol>
                </GlassCard>
            )}
        </div>
    );
}
