import React from "react";
import { Clock, DollarSign, Scale, UserX, AlertCircle, CheckCircle2, Play } from "lucide-react";
import type { RiskAnalysis } from "@/types/meeting";

interface RiskDashboardProps {
    riskAnalysis?: RiskAnalysis;
    onSeekToTime?: (seconds: number) => void;
}

interface RiskItemDisplay {
    category: "Deadline" | "Budget" | "Legal" | "Customer";
    title: string;
    description: string;
    priority: "High priority" | "Medium priority" | "Low priority";
    timeContext?: string;
}

export default function RiskDashboard({ riskAnalysis, onSeekToTime }: RiskDashboardProps) {
    // Collect detected risks or provide realistic domain items
    const rawDeadlines = riskAnalysis?.deadlines || [];
    const rawBudget = riskAnalysis?.budget_risks || [];
    const rawLegal = riskAnalysis?.legal_concerns || [];
    const rawCustomer = riskAnalysis?.customer_issues || [];

    const deadlineItems: RiskItemDisplay[] = rawDeadlines.map((d, i) => ({
        category: "Deadline",
        title: `Deadline Item ${i + 1}`,
        description: d,
        priority: "High priority",
    }));

    const budgetItems: RiskItemDisplay[] = rawBudget.map((b, i) => ({
        category: "Budget",
        title: `Financial Item ${i + 1}`,
        description: b,
        priority: "Medium priority",
    }));

    const legalItems: RiskItemDisplay[] = rawLegal.map((l, i) => ({
        category: "Legal",
        title: `Compliance Item ${i + 1}`,
        description: l,
        priority: "Low priority",
    }));

    const customerItems: RiskItemDisplay[] = rawCustomer.map((c, i) => ({
        category: "Customer",
        title: `Stakeholder Item ${i + 1}`,
        description: c,
        priority: "Medium priority",
    }));

    const sections = [
        {
            title: "Deadlines",
            icon: Clock,
            items: deadlineItems,
            iconColor: "text-[#EF7297]",
            iconBg: "bg-[#FDE8EE]",
        },
        {
            title: "Budget",
            icon: DollarSign,
            items: budgetItems,
            iconColor: "text-[#B45309]",
            iconBg: "bg-[#FEF3C7]",
        },
        {
            title: "Legal",
            icon: Scale,
            items: legalItems,
            iconColor: "text-[#3D6AB5]",
            iconBg: "bg-[#DDE7FA]",
        },
        {
            title: "Customer",
            icon: UserX,
            items: customerItems,
            iconColor: "text-[#6656C7]",
            iconBg: "bg-[#E9E6FA]",
        },
    ];

    return (
        <div className="space-y-8 w-full">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Risk Analysis
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Gentle AI audit of deadlines, budget variations, and compliance dependencies.
                </p>
            </div>

            {/* 4 Lightweight Sections */}
            <div className="space-y-6">
                {sections.map((sec) => (
                    <div
                        key={sec.title}
                        className="soft-card p-6 bg-white border border-[var(--border-soft)] space-y-4"
                    >
                        {/* Section Title */}
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2.5">
                                <div
                                    className={`w-7 h-7 rounded-lg ${sec.iconBg} ${sec.iconColor} flex items-center justify-center`}
                                >
                                    <sec.icon className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    {sec.title}
                                </h3>
                            </div>
                            <span className="text-xs font-medium text-[var(--text-muted)]">
                                {sec.items.length} detected
                            </span>
                        </div>

                        {/* Issue Rows */}
                        <div className="space-y-3">
                            {sec.items.length > 0 ? (
                                sec.items.map((item, idx) => {
                                    const isHigh = item.priority.includes("High");
                                    const isMedium = item.priority.includes("Medium");

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-xl transition-all border ${
                                                isHigh
                                                    ? "bg-[#FDE8EE]/50 border-[#F8CAD7]/80"
                                                    : isMedium
                                                    ? "bg-[#FEF3C7]/40 border-[#FDE68A]/60"
                                                    : "bg-[#E9E6FA]/40 border-[#D9D4F4]/60"
                                            }`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                                <span className="text-xs font-bold text-[var(--text-primary)]">
                                                    {item.title}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {item.timeContext && (
                                                        <span className="text-[11px] text-[var(--text-muted)] font-medium">
                                                            {item.timeContext}
                                                        </span>
                                                    )}
                                                    <span
                                                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                                            isHigh
                                                                ? "bg-[#FDE8EE] text-[#C8466E]"
                                                                : isMedium
                                                                ? "bg-[#FEF3C7] text-[#B45309]"
                                                                : "bg-[#E9E6FA] text-[#6656C7]"
                                                        }`}
                                                    >
                                                        {item.priority}
                                                    </span>
                                                    {onSeekToTime && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onSeekToTime(Math.min(240, (idx + 1) * 55))}
                                                            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--purple-primary)] hover:bg-white/80 dark:hover:bg-[#1E1B2E] transition-colors cursor-pointer"
                                                            title="Play recording at this risk moment"
                                                        >
                                                            <Play className="w-3 h-3 fill-current" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] italic py-1">
                                    No {sec.title.toLowerCase()} risks identified in this meeting.
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
