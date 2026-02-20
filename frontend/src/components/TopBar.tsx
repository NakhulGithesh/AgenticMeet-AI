"use client";

import React from "react";
import { Search, Bell, Mic } from "lucide-react";

interface TopBarProps {
    title: string;
}

export default function TopBar({ title }: TopBarProps) {
    return (
        <header className="topbar sticky top-0 z-40 h-14 flex items-center justify-between px-6">
            {/* Left — page title */}
            <h1 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h1>

            {/* Center — search */}
            <div className="flex-1 max-w-md mx-8">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                        type="text"
                        placeholder="Search by title or keyword"
                        className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-purple)] transition-colors"
                    />
                </div>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-3">
                <button className="btn-primary flex items-center gap-2 !py-2 !px-4 !text-xs !rounded-lg">
                    <Mic className="w-3.5 h-3.5" />
                    Capture
                </button>
                <button className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                    <Bell className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>
                <div className="w-8 h-8 rounded-full bg-[var(--accent-purple)] flex items-center justify-center text-white text-xs font-bold">
                    N
                </div>
            </div>
        </header>
    );
}
