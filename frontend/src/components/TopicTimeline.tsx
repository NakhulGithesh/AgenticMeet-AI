"use client";

import React, { useState } from "react";
import { Sparkles, MessageSquare, ChevronRight, Clock, Play } from "lucide-react";
import type { TopicSegment } from "@/types/meeting";
import { parseTimestampToSeconds } from "@/lib/speakerColors";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";

interface TopicTimelineProps {
    topics: TopicSegment[];
    onSeekToTime?: (seconds: number) => void;
}

export default function TopicTimeline({ topics, onSeekToTime }: TopicTimelineProps) {
    const displayTopics: TopicSegment[] = topics;

    const [activeIdx, setActiveIdx] = useState<number>(0);
    const activeTopic = displayTopics[activeIdx] || displayTopics[0];

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    Meeting Topics
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Select a topic to explore its context and corresponding dialogue excerpt.
                </p>
            </div>

            {displayTopics.length === 0 ? (
                <div className="p-10 rounded-2xl bg-white border border-dashed border-[var(--border-soft)] text-center max-w-lg mx-auto space-y-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">No topics segmented</p>
                    <p className="text-xs text-[var(--text-muted)]">
                        Topic segmentation will appear once meeting audio analysis and diarization finish.
                    </p>
                </div>
            ) : (
                /* Two-Column Responsive Layout: Left Topic Cards, Right Detailed Segment */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Simple Topic Cards (01, 02, 03 style) */}
                    <div className="lg:col-span-5 space-y-3">
                    {displayTopics.map((topic, i) => {
                        const isSelected = activeIdx === i;
                        const num = (i + 1) < 10 ? `0${i + 1}` : `${i + 1}`;

                        return (
                            <div
                                key={i}
                                onClick={() => setActiveIdx(i)}
                                className={`soft-card p-5 cursor-pointer transition-all border ${
                                    isSelected
                                        ? "bg-white border-[var(--purple-primary)] shadow-[0_6px_20px_rgba(102,86,199,0.1)] ring-1 ring-[var(--purple-primary)]"
                                        : "bg-white/80 border-[var(--border-soft)] hover:border-[var(--purple-light)] hover:bg-white"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <span
                                        className={`text-sm font-extrabold tracking-tight px-2 py-0.5 rounded-lg ${
                                            isSelected
                                                ? "bg-[var(--purple-primary)] text-white"
                                                : "bg-[var(--purple-subtle)] text-[var(--purple-primary)]"
                                        }`}
                                    >
                                        {num}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <h3
                                            className={`text-sm font-bold truncate ${
                                                isSelected ? "text-[var(--purple-primary)]" : "text-[var(--text-primary)]"
                                            }`}
                                        >
                                            {topic.title}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--text-muted)] font-medium">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {topic.duration || "5 min"}
                                            </span>
                                            <span>·</span>
                                            {onSeekToTime ? (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const sec = parseTimestampToSeconds(topic.timestamp) || 0;
                                                        onSeekToTime(sec);
                                                    }}
                                                    className="flex items-center gap-1 text-[var(--purple-primary)] hover:underline font-semibold cursor-pointer"
                                                    title={`Play from ${topic.timestamp}`}
                                                >
                                                    <Play className="w-2.5 h-2.5 fill-current" />
                                                    <span>{topic.timestamp}</span>
                                                </button>
                                            ) : (
                                                <span>Start: {topic.timestamp}</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight
                                        className={`w-4 h-4 mt-1 transition-transform ${
                                            isSelected
                                                ? "text-[var(--purple-primary)] translate-x-0.5"
                                                : "text-[var(--text-placeholder)]"
                                        }`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right: Detailed Transcript Excerpt of Selected Topic */}
                <div className="lg:col-span-7">
                    <div className="soft-card p-7 bg-white border border-[var(--border-soft)] space-y-5 h-full flex flex-col justify-between">
                        <div>
                            {/* Selected Topic Title & Badge */}
                            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] gap-2 flex-wrap">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--purple-bg)] text-[var(--purple-primary)]">
                                        Topic {activeIdx + 1 < 10 ? `0${activeIdx + 1}` : activeIdx + 1}
                                    </span>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                        {activeTopic.title}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[var(--text-muted)]">
                                        {activeTopic.duration}
                                    </span>
                                    {onSeekToTime && (
                                        <ShimmerButton
                                            type="button"
                                            onClick={() => {
                                                const sec = parseTimestampToSeconds(activeTopic.timestamp) || 0;
                                                onSeekToTime(sec);
                                            }}
                                            borderRadius="12px"
                                            shimmerDuration="2.5s"
                                            className="!py-1.5 !px-3 !text-xs !font-semibold !rounded-xl flex items-center gap-1.5 shadow-2xs"
                                            title="Play this topic in media player"
                                        >
                                            <Play className="w-3 h-3 fill-current" />
                                            <span>Play</span>
                                        </ShimmerButton>
                                    )}
                                </div>
                            </div>

                            {/* Brief Summary of Topic */}
                            <div className="mt-4 p-3.5 rounded-xl bg-[var(--purple-subtle)] border border-[var(--border-soft)]">
                                <p className="text-xs text-[var(--purple-primary)] font-semibold mb-1">
                                    Key Takeaway:
                                </p>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    {activeTopic.summary || "Summary of this segment."}
                                </p>
                            </div>

                            {/* Related Transcript Dialogue */}
                            <div className="mt-5 space-y-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                                    <MessageSquare className="w-3.5 h-3.5 text-[var(--purple-primary)]" />
                                    <span>Related Conversation Excerpt</span>
                                </div>
                                <div className="p-4 rounded-xl bg-[var(--bg-card-subtle)] border border-[var(--border-soft)] text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-normal max-h-[300px] overflow-y-auto">
                                    {activeTopic.content}
                                </div>
                            </div>
                        </div>

                        <p className="text-[11px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-subtle)]">
                            Indexed with automatic time stamps from Whisper diarization.
                        </p>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}
