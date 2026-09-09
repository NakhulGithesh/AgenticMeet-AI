"use client";

import React from "react";
import { Sparkles, AudioWaveform, CheckCircle2, Loader2 } from "lucide-react";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";

interface ProcessingLoaderProps {
    progress: number;
    message: string;
}

export default function ProcessingLoader({ progress, message }: ProcessingLoaderProps) {
    const steps = [
        { label: "Audio decoding & ingestion", threshold: 20 },
        { label: "AI Whisper speech-to-text", threshold: 50 },
        { label: "Diarization & speaker identification", threshold: 75 },
        { label: "Executive summary & decision synthesis", threshold: 95 },
    ];

    return (
        <div className="max-w-md mx-auto w-full">
            <div className="soft-card p-8 sm:p-10 bg-white border border-[var(--border-soft)] text-center space-y-6 shadow-[0_8px_30px_rgba(102,86,199,0.08)]">
                {/* Header Title */}
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--purple-bg)] text-[var(--purple-primary)] text-xs font-semibold mb-2">
                        <AudioWaveform className="w-3.5 h-3.5 animate-pulse" />
                        <span>AI Audio Analysis</span>
                        <Sparkles className="w-3 h-3 text-[var(--pink-text)]" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        Analyzing Meeting Audio
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                        {message || "Transcribing dialogue, tagging speakers, and extracting decisions..."}
                    </p>
                </div>

                {/* Magic UI Animated Circular Progress Bar */}
                <div className="flex justify-center items-center py-2 relative">
                    <AnimatedCircularProgressBar
                        max={100}
                        min={0}
                        value={progress}
                        gaugePrimaryColor="var(--purple-primary, #6656C7)"
                        gaugeSecondaryColor="var(--purple-bg, #E9E6FA)"
                        className="size-40 mx-auto text-3xl font-extrabold text-[var(--purple-primary)] drop-shadow-xs"
                    />
                </div>

                {/* Step Progression Indicators */}
                <div className="text-left space-y-2.5 pt-2 border-t border-[var(--border-subtle)]">
                    {steps.map((step, idx) => {
                        const isDone = progress >= step.threshold;
                        const isCurrent =
                            progress < step.threshold &&
                            (idx === 0 || progress >= steps[idx - 1].threshold);

                        return (
                            <div
                                key={idx}
                                className={`flex items-center justify-between text-xs px-3 py-2 rounded-xl transition-all ${
                                    isDone
                                        ? "bg-[var(--mint-soft)]/50 text-[var(--mint-text)] font-semibold"
                                        : isCurrent
                                        ? "bg-[var(--purple-subtle)] text-[var(--purple-primary)] font-bold border border-[var(--purple-soft)]"
                                        : "text-[var(--text-placeholder)] font-normal"
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    {isDone ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--mint-text)] shrink-0" />
                                    ) : isCurrent ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--purple-primary)] shrink-0" />
                                    ) : (
                                        <span className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center text-[9px] shrink-0">
                                            {idx + 1}
                                        </span>
                                    )}
                                    <span>{step.label}</span>
                                </span>
                                <span className="text-[10px] opacity-75">
                                    {isDone ? "Done" : isCurrent ? `${progress}%` : "Waiting"}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
