"use client";

import React, { useState, useMemo } from "react";
import { Search, Clock, DollarSign, Scale, UserX } from "lucide-react";
import GlassCard from "./GlassCard";
import type { RiskAnalysis } from "@/types/meeting";

interface TranscriptViewProps {
    transcript: string;
    riskAnalysis?: RiskAnalysis;
}

export default function TranscriptView({ transcript, riskAnalysis }: TranscriptViewProps) {
    const [searchTerm, setSearchTerm] = useState("");

    const riskItems = useMemo(() => {
        if (!riskAnalysis) return new Map<string, { type: string }>();
        const map = new Map<string, { type: string }>();
        riskAnalysis.deadlines?.forEach((d) => map.set(d.toLowerCase(), { type: "deadline" }));
        riskAnalysis.budget_risks?.forEach((b) => map.set(b.toLowerCase(), { type: "budget" }));
        riskAnalysis.legal_concerns?.forEach((l) => map.set(l.toLowerCase(), { type: "legal" }));
        riskAnalysis.customer_issues?.forEach((c) => map.set(c.toLowerCase(), { type: "customer" }));
        return map;
    }, [riskAnalysis]);

    const renderedLines = useMemo(() => {
        const lines = transcript.split("\n").filter((l) => l.trim());
        return lines.map((line, idx) => {
            let riskType = "";
            for (const [riskText, info] of riskItems) {
                if (line.toLowerCase().includes(riskText)) {
                    riskType = info.type;
                    break;
                }
            }
            return { text: line, idx, riskType };
        });
    }, [transcript, riskItems]);

    const filteredLines = useMemo(() => {
        if (!searchTerm.trim()) return renderedLines;
        return renderedLines.filter((l) =>
            l.text.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [renderedLines, searchTerm]);

    const riskBorderColor: Record<string, string> = {
        deadline: "var(--accent-red)",
        budget: "var(--accent-orange)",
        legal: "var(--accent-blue)",
        customer: "#c0392b",
    };

    const riskPillClass: Record<string, string> = {
        deadline: "risk-pill risk-pill-deadline",
        budget: "risk-pill risk-pill-budget",
        legal: "risk-pill risk-pill-legal",
        customer: "risk-pill risk-pill-customer",
    };

    const riskLabel: Record<string, string> = {
        deadline: "Deadline",
        budget: "Budget Risk",
        legal: "Legal",
        customer: "Customer Issue",
    };

    return (
        <div>
            {/* Risk summary bar */}
            {riskAnalysis && (
                <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                        { label: "Deadlines", count: riskAnalysis.deadlines?.length || 0, color: "var(--accent-red)", bg: "var(--accent-red-bg)", icon: <Clock className="w-4 h-4" /> },
                        { label: "Budget Risks", count: riskAnalysis.budget_risks?.length || 0, color: "var(--accent-orange)", bg: "var(--accent-orange-bg)", icon: <DollarSign className="w-4 h-4" /> },
                        { label: "Legal", count: riskAnalysis.legal_concerns?.length || 0, color: "var(--accent-blue)", bg: "var(--accent-blue-bg)", icon: <Scale className="w-4 h-4" /> },
                        { label: "Customer", count: riskAnalysis.customer_issues?.length || 0, color: "#c0392b", bg: "var(--accent-red-bg)", icon: <UserX className="w-4 h-4" /> },
                    ].map((item) => (
                        <div key={item.label} className="card p-4 text-center">
                            <div className="flex items-center justify-center gap-2 mb-1" style={{ color: item.color }}>
                                {item.icon}
                                <span className="text-2xl font-bold">{item.count}</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search transcript..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
                />
            </div>

            {/* Transcript */}
            <GlassCard className="max-h-[600px] overflow-y-auto !p-4">
                <div className="space-y-0.5 text-sm leading-relaxed">
                    {filteredLines.map((line) => {
                        const isSpeakerLine = /^(Speaker \d+|[A-Z][a-z]+):/i.test(line.text);
                        return (
                            <div
                                key={line.idx}
                                className={`py-1.5 px-3 rounded-lg ${line.riskType ? "border-l-[3px]" : ""
                                    } ${isSpeakerLine ? "mt-3 first:mt-0" : ""}`}
                                style={line.riskType ? { borderLeftColor: riskBorderColor[line.riskType], backgroundColor: "#fafafa" } : {}}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className={isSpeakerLine ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}>
                                        {isSpeakerLine ? (
                                            <>
                                                <strong className="text-[var(--accent-purple)]">{line.text.split(":")[0]}:</strong>
                                                {line.text.substring(line.text.indexOf(":") + 1)}
                                            </>
                                        ) : (
                                            line.text
                                        )}
                                    </span>
                                    {line.riskType && (
                                        <span className={riskPillClass[line.riskType]}>
                                            {riskLabel[line.riskType]}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </GlassCard>
        </div>
    );
}
