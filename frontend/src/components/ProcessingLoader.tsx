"use client";

import React from "react";
import { Brain } from "lucide-react";

interface ProcessingLoaderProps {
    progress: number;
    message: string;
}

export default function ProcessingLoader({ progress, message }: ProcessingLoaderProps) {
    return (
        <div className="max-w-lg mx-auto">
            <div className="card p-10 text-center">
                {/* Pulsing brain icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--accent-purple-bg)] mb-6 pulse-glow">
                    <Brain className="w-10 h-10 text-[var(--accent-purple)]" />
                </div>

                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">AI Processing</h2>
                <p className="text-sm text-[var(--text-muted)] mb-6">{message || "Analyzing your meeting..."}</p>

                {/* Progress bar */}
                <div className="progress-bar mb-3">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <p className="text-xs text-[var(--text-muted)]">{progress}% complete</p>

                {/* Skeleton lines */}
                <div className="mt-8 space-y-3">
                    {[80, 60, 90, 45, 70].map((w, i) => (
                        <div
                            key={i}
                            className="h-3 rounded-full bg-[#f0f0f5] pulse-glow"
                            style={{ width: `${w}%`, animationDelay: `${i * 0.2}s` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
