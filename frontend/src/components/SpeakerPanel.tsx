"use client";

import React, { useState } from "react";
import { Pencil, Check, Users } from "lucide-react";
import GlassCard from "./GlassCard";
import type { SpeakerSegment } from "@/types/meeting";

interface SpeakerPanelProps {
    speakerSegments: SpeakerSegment[];
    onRename: (mappings: Record<string, string>) => void;
}

const COLORS = ["#6c5ce7", "#0984e3", "#00b894", "#f39c12", "#e74c3c", "#e84393"];

export default function SpeakerPanel({ speakerSegments, onRename }: SpeakerPanelProps) {
    const uniqueSpeakers = [...new Set(speakerSegments.map((s) => s.speaker))];
    const [names, setNames] = useState<Record<string, string>>(() => {
        const m: Record<string, string> = {};
        uniqueSpeakers.forEach((s) => (m[s] = ""));
        return m;
    });
    const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);

    const speakerStats = uniqueSpeakers.map((speaker) => {
        const segments = speakerSegments.filter((s) => s.speaker === speaker);
        const totalWords = segments.reduce((a, b) => a + (b.word_count || b.text.split(" ").length), 0);
        return { speaker, totalWords, segmentCount: segments.length };
    });

    const totalWords = speakerStats.reduce((a, b) => a + b.totalWords, 0);

    const handleSave = () => {
        const mappings: Record<string, string> = {};
        Object.entries(names).forEach(([original, newName]) => {
            if (newName.trim()) mappings[original] = newName.trim();
        });
        if (Object.keys(mappings).length > 0) onRename(mappings);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-[var(--accent-purple)]" />
                    <h2 className="text-base font-bold text-[var(--text-primary)]">
                        {uniqueSpeakers.length} Speaker{uniqueSpeakers.length !== 1 ? "s" : ""} Detected
                    </h2>
                </div>
                <button onClick={handleSave} className="btn-primary !py-2 !px-4 !text-xs">
                    Save All Names
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {speakerStats.map((stat, i) => {
                    const color = COLORS[i % COLORS.length];
                    const percentage = totalWords > 0 ? ((stat.totalWords / totalWords) * 100).toFixed(1) : "0";
                    const isEditing = editingSpeaker === stat.speaker;

                    return (
                        <GlassCard key={stat.speaker} hover className="!p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                                        style={{ backgroundColor: color + "20", color, border: `2px solid ${color}` }}
                                    >
                                        {(names[stat.speaker] || stat.speaker).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        {isEditing ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={names[stat.speaker]}
                                                    onChange={(e) => setNames((prev) => ({ ...prev, [stat.speaker]: e.target.value }))}
                                                    placeholder={stat.speaker}
                                                    className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--accent-purple)] w-36"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() => setEditingSpeaker(null)}
                                                    className="p-1.5 rounded-lg bg-[var(--accent-green-bg)] text-[var(--accent-green)]"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">
                                                    {names[stat.speaker] || stat.speaker}
                                                </h3>
                                                <button
                                                    onClick={() => setEditingSpeaker(stat.speaker)}
                                                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                        {names[stat.speaker] && (
                                            <p className="text-xs text-[var(--text-muted)]">was {stat.speaker}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-3">
                                <span>{stat.totalWords} words</span>
                                <span>{stat.segmentCount} segments</span>
                                <span style={{ color }}>{percentage}%</span>
                            </div>

                            <div className="h-2 rounded-full bg-[#f0f0f5] overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${percentage}%`, backgroundColor: color }}
                                />
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        </div>
    );
}
