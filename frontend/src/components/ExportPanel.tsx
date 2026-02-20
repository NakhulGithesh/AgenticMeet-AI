"use client";

import React from "react";
import { Download, FileText, AlertTriangle } from "lucide-react";
import GlassCard from "./GlassCard";
import { getExportUrl } from "@/lib/api";

interface ExportPanelProps { taskId: string; }

export default function ExportPanel({ taskId }: ExportPanelProps) {
    const exports = [
        { title: "Complete Meeting Report", description: "PDF with transcript, summary, analytics, topics, and risk analysis.", icon: <FileText className="w-6 h-6" />, color: "var(--accent-purple)", type: "pdf" as const },
        { title: "Risk Analysis Report", description: "Focused PDF report on flagged risks, urgency scores, and recommendations.", icon: <AlertTriangle className="w-6 h-6" />, color: "var(--accent-red)", type: "risk" as const },
    ];

    return (
        <div>
            <div className="flex items-center gap-2 mb-5">
                <Download className="w-5 h-5 text-[var(--accent-purple)]" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">Export Reports</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exports.map((exp) => (
                    <GlassCard key={exp.type} hover className="!p-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: exp.color + "12", color: exp.color }}>
                            {exp.icon}
                        </div>
                        <h3 className="font-semibold mb-1 text-[var(--text-primary)]">{exp.title}</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-5">{exp.description}</p>
                        <a href={getExportUrl(taskId, exp.type)} target="_blank" rel="noopener noreferrer"
                            className="btn-primary inline-flex items-center gap-2 !text-xs" style={{ background: exp.color }}>
                            <Download className="w-4 h-4" /> Download PDF
                        </a>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}
