"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, Loader2 } from "lucide-react";
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import GlassCard from "./GlassCard";
import { getAnalytics } from "@/lib/api";
import type { AnalyticsData } from "@/types/meeting";

interface AnalyticsChartsProps { taskId: string; }

const COLORS = ["#6c5ce7", "#0984e3", "#00b894", "#f39c12", "#e74c3c", "#e84393"];

export default function AnalyticsCharts({ taskId }: AnalyticsChartsProps) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getAnalytics(taskId).then(setAnalytics).catch(console.error).finally(() => setLoading(false));
    }, [taskId]);

    if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-[var(--accent-purple)] animate-spin" /></div>;
    if (!analytics) return <p className="text-[var(--text-muted)]">No analytics data available.</p>;

    const pieData = analytics.speaker_stats.map((s) => ({ name: s.speaker, value: s.speaking_time }));
    const barData = analytics.speaker_stats.map((s) => ({ name: s.speaker, words: s.word_count }));
    const keywordData = analytics.keywords.slice(0, 15).map(([word, count]) => ({ word, count }));

    return (
        <div>
            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-4 mb-5">
                {[
                    { label: "Total Speakers", value: analytics.total_speakers, color: "var(--accent-purple)" },
                    { label: "Total Words", value: analytics.total_words.toLocaleString(), color: "var(--accent-blue)" },
                    { label: "Duration", value: `${analytics.duration.toFixed(1)} min`, color: "var(--accent-green)" },
                    { label: "Words/Min", value: analytics.words_per_minute.toFixed(0), color: "var(--accent-orange)" },
                ].map((m) => (
                    <GlassCard key={m.label} className="!p-4 text-center">
                        <div className="text-2xl font-bold mb-0.5" style={{ color: m.color }}>{m.value}</div>
                        <p className="text-xs text-[var(--text-muted)]">{m.label}</p>
                    </GlassCard>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-4 mb-5">
                <GlassCard className="!p-5">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                        <BarChart3 className="w-4 h-4 text-[var(--accent-purple)]" /> Speaker Contribution
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e8e8ef", borderRadius: 8, fontSize: 12 }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                        {pieData.map((d, i) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                {d.name} ({d.value.toFixed(1)}%)
                            </div>
                        ))}
                    </div>
                </GlassCard>

                <GlassCard className="!p-5">
                    <h3 className="text-sm font-semibold mb-4 text-[var(--text-primary)]">Words Spoken by Speaker</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} />
                            <YAxis tick={{ fill: "#6b7280", fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #e8e8ef", borderRadius: 8, fontSize: 12 }} />
                            <Bar dataKey="words" radius={[6, 6, 0, 0]}>
                                {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </GlassCard>
            </div>

            {/* Keywords */}
            {keywordData.length > 0 && (
                <GlassCard className="!p-5">
                    <h3 className="text-sm font-semibold mb-4 text-[var(--text-primary)]">☁️ Top Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                        {keywordData.map((kw, i) => (
                            <span key={kw.word} className="px-3 py-1.5 rounded-full text-xs font-medium border"
                                style={{ fontSize: `${Math.max(11, Math.min(18, 10 + kw.count * 2))}px`, color: COLORS[i % COLORS.length], backgroundColor: COLORS[i % COLORS.length] + "10", borderColor: COLORS[i % COLORS.length] + "25" }}>
                                {kw.word} <span className="opacity-60">({kw.count})</span>
                            </span>
                        ))}
                    </div>
                </GlassCard>
            )}
        </div>
    );
}
