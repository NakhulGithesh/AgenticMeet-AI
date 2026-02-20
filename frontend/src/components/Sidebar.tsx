"use client";

import React from "react";
import {
    LayoutDashboard,
    FileText,
    Users,
    AlertTriangle,
    BarChart3,
    Target,
    ClipboardList,
    Download,
    Upload,
    Settings,
    MoreHorizontal,
    Mic,
    Sparkles,
    Star,
} from "lucide-react";
import type { ActiveTab } from "@/types/meeting";

interface SidebarProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    hasResults: boolean;
}

const sections: {
    items: { id: ActiveTab; icon: React.ElementType; label: string; badge?: string; requiresResults?: boolean }[];
}[] = [
        {
            items: [
                { id: "dashboard", icon: LayoutDashboard, label: "Home" },
                { id: "transcript", icon: FileText, label: "Meetings", requiresResults: true },
                { id: "speakers", icon: Users, label: "Meeting Status", requiresResults: true },
                { id: "export", icon: Upload, label: "Uploads" },
            ],
        },
        {
            items: [
                { id: "risks", icon: AlertTriangle, label: "Risk Analysis", requiresResults: true },
                { id: "analytics", icon: BarChart3, label: "Analytics", requiresResults: true },
            ],
        },
        {
            items: [
                { id: "topics", icon: Sparkles, label: "Topics", badge: "NEW", requiresResults: true },
                { id: "summary", icon: ClipboardList, label: "AI Summary", requiresResults: true },
            ],
        },
    ];

const bottomItems = [
    { icon: Star, label: "Upgrade" },
    { icon: Settings, label: "Settings" },
    { icon: MoreHorizontal, label: "More" },
];

export default function Sidebar({
    activeTab,
    onTabChange,
    hasResults,
}: SidebarProps) {
    return (
        <aside className="sidebar fixed left-0 top-0 h-screen w-[200px] z-50 flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-2.5 px-5 py-5 mb-1">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-purple)] flex items-center justify-center shrink-0">
                    <Mic className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-[var(--accent-purple)]">
                    AgenticMeet
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto">
                {sections.map((section, sIdx) => (
                    <div key={sIdx}>
                        <div className="px-3 py-1">
                            {section.items.map((item) => {
                                const isActive = activeTab === item.id;
                                const isDisabled = item.requiresResults && !hasResults;
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => !isDisabled && onTabChange(item.id)}
                                        disabled={isDisabled}
                                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] transition-all duration-150 ${isActive
                                                ? "font-semibold text-[var(--accent-purple)] bg-[var(--accent-purple-bg)]"
                                                : isDisabled
                                                    ? "text-[#c8c8d0] cursor-not-allowed"
                                                    : "font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#f5f5fa]"
                                            }`}
                                    >
                                        <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                                        <span>{item.label}</span>
                                        {item.badge && (
                                            <span className="ml-auto text-[10px] font-bold text-white bg-[var(--accent-green)] px-2 py-0.5 rounded-md">
                                                {item.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {sIdx < sections.length - 1 && (
                            <div className="mx-5 my-2 border-t border-[var(--border-light)]" />
                        )}
                    </div>
                ))}
            </nav>

            {/* Bottom section */}
            <div className="border-t border-[var(--border-light)]">
                <div className="px-3 py-2">
                    {bottomItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.label}
                                className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[#f5f5fa] transition-colors"
                            >
                                <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}
