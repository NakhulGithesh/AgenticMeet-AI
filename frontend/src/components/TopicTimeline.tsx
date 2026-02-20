"use client";

import React, { useState } from "react";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import GlassCard from "./GlassCard";
import type { TopicSegment } from "@/types/meeting";

interface TopicTimelineProps {
    topics: TopicSegment[];
}

const COLORS = ["#6c5ce7", "#0984e3", "#00b894", "#f39c12", "#e74c3c"];

export default function TopicTimeline({ topics }: TopicTimelineProps) {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

    return (
        <div>
            <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5 text-[var(--accent-purple)]" />
                <h2 className="text-base font-bold text-[var(--text-primary)]">Meeting Timeline</h2>
                <span className="text-xs text-[var(--text-muted)] ml-2">
                    {topics.length} topic{topics.length !== 1 ? "s" : ""} detected
                </span>
            </div>

            <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#6c5ce7] via-[#0984e3] to-[#00b894] opacity-20" />

                <div className="space-y-3">
                    {topics.map((topic, i) => {
                        const color = COLORS[i % COLORS.length];
                        const isExpanded = expandedIdx === i;

                        return (
                            <div key={i} className="flex gap-4">
                                <div className="relative z-10 shrink-0">
                                    <div
                                        className="w-[12px] h-[12px] rounded-full mt-[18px]"
                                        style={{ backgroundColor: color, boxShadow: `0 0 0 4px ${color}20` }}
                                    />
                                </div>

                                <GlassCard hover className="flex-1 !p-4 cursor-pointer">
                                    <div onClick={() => setExpandedIdx(isExpanded ? null : i)}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg" style={{ color, backgroundColor: color + "12" }}>
                                                    {topic.timestamp}
                                                </span>
                                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">{topic.title}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-[var(--text-muted)]">{topic.duration}</span>
                                                {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
                                            </div>
                                        </div>
                                        <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2">{topic.summary}</p>
                                    </div>

                                    {isExpanded && (
                                        <div className="mt-3 pt-3 border-t border-[var(--border-light)]">
                                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{topic.content}</p>
                                        </div>
                                    )}
                                </GlassCard>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
