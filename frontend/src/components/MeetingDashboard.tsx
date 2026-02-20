"use client";

import React from "react";
import GlassCard from "./GlassCard";
import TranscriptView from "./TranscriptView";
import SpeakerPanel from "./SpeakerPanel";
import RiskDashboard from "./RiskDashboard";
import AnalyticsCharts from "./AnalyticsCharts";
import TopicTimeline from "./TopicTimeline";
import SummaryView from "./SummaryView";
import ExportPanel from "./ExportPanel";
import { updateSpeakers } from "@/lib/api";
import type { MeetingResult, ActiveTab } from "@/types/meeting";

interface MeetingDashboardProps {
    taskId: string;
    result: MeetingResult;
    activeTab: ActiveTab;
    onResultUpdate: (updated: Partial<MeetingResult>) => void;
}

export default function MeetingDashboard({ taskId, result, activeTab, onResultUpdate }: MeetingDashboardProps) {
    const handleSpeakerRename = async (mappings: Record<string, string>) => {
        try {
            const res = await updateSpeakers(taskId, mappings);
            onResultUpdate({ formatted_transcript: res.formatted_transcript });
        } catch (err) { console.error("Failed to update speakers:", err); }
    };

    const transcript = result.formatted_transcript || result.cleaned_transcript;

    switch (activeTab) {
        case "dashboard":
            return (
                <div>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] mb-5">Meeting Overview</h1>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <GlassCard className="lg:col-span-2 !p-5">
                            <h3 className="text-sm font-semibold mb-3 text-[var(--text-primary)]">📝 Transcript Preview</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-6">{transcript.substring(0, 600)}...</p>
                        </GlassCard>
                        <div className="space-y-4">
                            <GlassCard className="!p-5">
                                <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">👥 Speakers</h3>
                                <p className="text-2xl font-bold text-[var(--accent-purple)]">{result.speaker_segments ? [...new Set(result.speaker_segments.map((s) => s.speaker))].length : 0}</p>
                            </GlassCard>
                            <GlassCard className="!p-5">
                                <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">🎯 Topics</h3>
                                <p className="text-2xl font-bold text-[var(--accent-blue)]">{result.topics?.length || 0}</p>
                            </GlassCard>
                            <GlassCard className="!p-5">
                                <h3 className="text-sm font-semibold mb-2 text-[var(--text-primary)]">⚠️ Risks</h3>
                                <p className="text-2xl font-bold text-[var(--accent-red)]">
                                    {(result.risk_analysis?.deadlines?.length || 0) + (result.risk_analysis?.budget_risks?.length || 0) + (result.risk_analysis?.legal_concerns?.length || 0) + (result.risk_analysis?.customer_issues?.length || 0)}
                                </p>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            );
        case "transcript":
            return <TranscriptView transcript={transcript} riskAnalysis={result.risk_analysis} />;
        case "speakers":
            return <SpeakerPanel speakerSegments={result.speaker_segments || []} onRename={handleSpeakerRename} />;
        case "risks":
            return <RiskDashboard riskAnalysis={result.risk_analysis} />;
        case "analytics":
            return <AnalyticsCharts taskId={taskId} />;
        case "topics":
            return <TopicTimeline topics={result.topics || []} />;
        case "summary":
            return <SummaryView taskId={taskId} />;
        case "export":
            return <ExportPanel taskId={taskId} />;
        default:
            return null;
    }
}
