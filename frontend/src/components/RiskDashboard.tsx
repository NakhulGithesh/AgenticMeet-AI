"use client";

import React from "react";
import { AlertTriangle, Clock, DollarSign, Scale, UserX, ArrowRight } from "lucide-react";
import GlassCard from "./GlassCard";
import type { RiskAnalysis } from "@/types/meeting";

interface RiskDashboardProps {
    riskAnalysis: RiskAnalysis;
}

export default function RiskDashboard({ riskAnalysis }: RiskDashboardProps) {
    const riskLevels = [
        { label: "High Priority", count: (riskAnalysis.deadlines?.length || 0) + (riskAnalysis.customer_issues?.length || 0), color: "var(--accent-red)", bg: "var(--accent-red-bg)" },
        { label: "Medium Priority", count: riskAnalysis.budget_risks?.length || 0, color: "var(--accent-orange)", bg: "var(--accent-orange-bg)" },
        { label: "Low Priority", count: riskAnalysis.legal_concerns?.length || 0, color: "var(--accent-blue)", bg: "var(--accent-blue-bg)" },
    ];
    const totalRisks = riskLevels.reduce((a, b) => a + b.count, 0);

    const categories = [
        { title: "Deadlines", items: riskAnalysis.deadlines || [], icon: <Clock className="w-4 h-4" />, color: "var(--accent-red)", severity: "URGENT", recommendation: "Immediate action required — review and assign owners" },
        { title: "Customer Issues", items: riskAnalysis.customer_issues || [], icon: <UserX className="w-4 h-4" />, color: "#c0392b", severity: "HIGH", recommendation: "Follow up needed — escalate to customer success team" },
        { title: "Budget Risks", items: riskAnalysis.budget_risks || [], icon: <DollarSign className="w-4 h-4" />, color: "var(--accent-orange)", severity: "MEDIUM", recommendation: "Review financials and adjust forecasts" },
        { title: "Legal Concerns", items: riskAnalysis.legal_concerns || [], icon: <Scale className="w-4 h-4" />, color: "var(--accent-blue)", severity: "LOW", recommendation: "Document for legal team review" },
    ];

    return (
        <div>
            <h2 className="text-base font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                <AlertTriangle className="w-5 h-5 text-[var(--accent-red)]" />
                Risk Priority Matrix
            </h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
                {riskLevels.map((level) => (
                    <GlassCard key={level.label} className="!p-5 text-center">
                        <div className="text-4xl font-bold mb-1" style={{ color: level.color }}>{level.count}</div>
                        <p className="text-xs text-[var(--text-muted)]">{level.label}</p>
                        <div className="mt-3 h-2 rounded-full bg-[#f0f0f5] overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: totalRisks > 0 ? `${(level.count / totalRisks) * 100}%` : "0%", backgroundColor: level.color }} />
                        </div>
                    </GlassCard>
                ))}
            </div>

            <div className="space-y-4">
                {categories.map((cat) => cat.items.length > 0 ? (
                    <GlassCard key={cat.title} className="!p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span style={{ color: cat.color }}>{cat.icon}</span>
                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">{cat.title}</h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: cat.color, backgroundColor: cat.color + "15", border: `1px solid ${cat.color}30` }}>{cat.severity}</span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">{cat.items.length} item{cat.items.length !== 1 ? "s" : ""}</span>
                        </div>
                        <ul className="space-y-2 mb-4">
                            {cat.items.map((item, j) => (
                                <li key={j} className="text-sm text-[var(--text-secondary)] pl-4 border-l-2 py-1" style={{ borderColor: cat.color + "40" }}>{item}</li>
                            ))}
                        </ul>
                        <div className="flex items-center gap-2 p-3 rounded-lg text-xs" style={{ backgroundColor: cat.color + "08" }}>
                            <ArrowRight className="w-3 h-3 shrink-0" style={{ color: cat.color }} />
                            <span style={{ color: cat.color }}>{cat.recommendation}</span>
                        </div>
                    </GlassCard>
                ) : null)}

                {totalRisks === 0 && (
                    <GlassCard className="!p-8 text-center">
                        <p className="text-[var(--accent-green)] text-lg font-semibold mb-1">✅ No Risks Detected</p>
                        <p className="text-sm text-[var(--text-muted)]">The meeting transcript looks clean!</p>
                    </GlassCard>
                )}
            </div>
        </div>
    );
}
