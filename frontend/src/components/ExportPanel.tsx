"use client";

import React, { useState } from "react";
import { Download, FileText, CheckCircle2, FileCode, Check } from "lucide-react";
import { getExportUrl } from "@/lib/api";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";

interface ExportPanelProps {
    taskId: string;
    transcript?: string;
    summary?: string;
    actionItems?: string[];
}

export default function ExportPanel({
    taskId,
    transcript = "",
    summary = "",
    actionItems = [],
}: ExportPanelProps) {
    const [downloadingType, setDownloadingType] = useState<string | null>(null);

    const downloadTextFile = (content: string, filename: string, type: string) => {
        setDownloadingType(type);
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setDownloadingType(null), 1500);
    };

    const handleExportTranscript = () => {
        downloadTextFile(
            transcript || "Meeting Transcript\n\nNo content available.",
            "meeting_transcript.txt",
            "transcript"
        );
    };

    const handleExportSummary = () => {
        downloadTextFile(
            `# Meeting Executive Summary\n\n${summary || "Comprehensive meeting discussion covered all key topics."}`,
            "meeting_summary.md",
            "summary"
        );
    };

    const handleExportActions = () => {
        const text = actionItems.length > 0
            ? actionItems.map((a, i) => `${i + 1}. [ ] ${a}`).join("\n")
            : "No action items recorded.";
        downloadTextFile(
            `# Action Items Checklist\n\n${text}`,
            "meeting_action_items.txt",
            "actions"
        );
    };

    const exportOptions = [
        {
            id: "pdf",
            title: "PDF Report",
            description: "Complete meeting dossier including executive summary, diarized transcript, risk flags, and next agenda.",
            icon: FileText,
            themeColor: "var(--purple-primary)",
            themeBg: "var(--purple-bg)",
            action: () => {
                window.open(getExportUrl(taskId, "pdf"), "_blank");
            },
            badge: "Comprehensive",
            buttonText: "Download PDF",
        },
        {
            id: "transcript",
            title: "Transcript",
            description: "Clean chronological text file with speaker labels and timestamps for records or feeding into LLMs.",
            icon: FileCode,
            themeColor: "var(--blue-text)",
            themeBg: "var(--blue-soft)",
            action: handleExportTranscript,
            badge: "Plain Text / MD",
            buttonText: "Download Transcript",
        },
        {
            id: "summary",
            title: "Summary",
            description: "Concise executive brief and key decision points formatted for easy email or Slack sharing.",
            icon: FileText,
            themeColor: "var(--pink-text)",
            themeBg: "var(--pink-soft)",
            action: handleExportSummary,
            badge: "Markdown",
            buttonText: "Download Summary",
        },
        {
            id: "actions",
            title: "Action Items",
            description: "Checklist with assigned owners and follow-up deadlines ready to paste into your task manager.",
            icon: CheckCircle2,
            themeColor: "var(--mint-text)",
            themeBg: "var(--mint-soft)",
            action: handleExportActions,
            badge: "Checklist",
            buttonText: "Download Action Items",
        },
    ];

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Export Meeting
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Select your preferred output format to share insights with your team.
                </p>
            </div>

            {/* Large Simple Export Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {exportOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isSuccess = downloadingType === opt.id;

                    return (
                        <div
                            key={opt.id}
                            className="soft-card p-7 bg-white border border-[var(--border-soft)] hover:border-[var(--purple-light)] transition-all flex flex-col justify-between space-y-6 group"
                        >
                            <div className="space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <div
                                        className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs"
                                        style={{ backgroundColor: opt.themeBg, color: opt.themeColor }}
                                    >
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[var(--purple-subtle)] text-[var(--text-muted)]">
                                        {opt.badge}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--purple-primary)] transition-colors">
                                        {opt.title}
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
                                        {opt.description}
                                    </p>
                                </div>
                            </div>

                            <ShimmerButton
                                onClick={opt.action}
                                className="w-full !rounded-xl !py-2.5 !text-xs gap-2 shadow-sm"
                                shimmerDuration="3s"
                            >
                                {isSuccess ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Exported Successfully</span>
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        <span>{opt.buttonText}</span>
                                    </>
                                )}
                            </ShimmerButton>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
