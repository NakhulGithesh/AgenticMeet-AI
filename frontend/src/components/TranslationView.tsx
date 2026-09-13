"use client";

import React, { useState, useEffect } from "react";
import { Globe, ArrowRight, Loader2, Copy, Check } from "lucide-react";
import { translateTranscript } from "@/lib/api";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";

import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";

interface TranslationViewProps {
    taskId: string;
    originalTranscript: string;
}

const LANGUAGES = [
    { label: "Hindi", value: "Hindi", script: "हिन्दी" },
    { label: "Spanish", value: "Spanish", script: "Español" },
    { label: "French", value: "French", script: "Français" },
    { label: "German", value: "German", script: "Deutsch" },
];

export default function TranslationView({
    taskId,
    originalTranscript,
}: TranslationViewProps) {
    const [selectedLanguage, setSelectedLanguage] = useState<string>("Hindi");
    const [translatedText, setTranslatedText] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [translationProgress, setTranslationProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    const handleTranslate = async (lang: string) => {
        setSelectedLanguage(lang);
        setLoading(true);
        setTranslationProgress(15);

        const timer = setInterval(() => {
            setTranslationProgress((prev) => {
                if (prev >= 88) return prev;
                return prev + Math.floor(Math.random() * 12) + 6;
            });
        }, 300);

        try {
            const res = await translateTranscript(taskId, lang, originalTranscript);
            setTranslationProgress(100);
            if (res?.translated_transcript) {
                setTranslatedText(res.translated_transcript);
            }
        } catch (err: any) {
            setTranslationProgress(100);
            setTranslatedText(
                `Unable to translate into ${lang}. Error: ${err?.message || "Translation service unavailable"}`
            );
        } finally {
            clearInterval(timer);
            setTimeout(() => {
                setLoading(false);
            }, 300);
        }
    };

    useEffect(() => {
        if (taskId && !taskId.startsWith("meeting-") && !translatedText && !loading) {
            handleTranslate(selectedLanguage);
        }
    }, [taskId]);

    const handleCopy = () => {
        if (!translatedText) return;
        navigator.clipboard.writeText(translatedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 w-full">
            {/* Top Language Bar */}
            <div className="soft-card p-5 bg-white border border-[var(--border-soft)] flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[var(--purple-bg)] text-[var(--purple-primary)] flex items-center justify-center">
                        <Globe className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-[var(--text-primary)]">
                            Language Translation
                        </h2>
                        <p className="text-xs text-[var(--text-muted)]">
                            Multi-language speaker-preserved translation document
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text-muted)] mr-1">
                        Translate to:
                    </span>
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.value}
                            onClick={() => handleTranslate(lang.value)}
                            disabled={loading}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                                selectedLanguage === lang.value
                                    ? "bg-[var(--purple-primary)] text-white shadow-sm"
                                    : "bg-[var(--purple-subtle)] text-[var(--text-secondary)] hover:bg-[var(--purple-bg)] hover:text-[var(--purple-primary)]"
                            }`}
                        >
                            {lang.label} ({lang.script})
                        </button>
                    ))}
                </div>
            </div>

            {/* Two-Panel Document Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Original Transcript */}
                <div className="soft-card p-6 sm:p-7 bg-white border border-[var(--border-soft)] flex flex-col h-[560px]">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[var(--purple-primary)]" />
                            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                Original (English)
                            </h3>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-medium">
                            Source Document
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-normal space-y-3">
                        {originalTranscript || "No transcript content available."}
                    </div>
                </div>

                {/* Right: Translated Transcript */}
                <div className="soft-card p-6 sm:p-7 bg-white border border-[var(--border-soft)] flex flex-col h-[560px]">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border-subtle)]">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[var(--mint-primary)]" />
                            <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                                Translated ({selectedLanguage})
                            </h3>
                        </div>

                        {translatedText && (
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 text-xs font-medium text-[var(--purple-primary)] hover:underline"
                            >
                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copied ? "Copied" : "Copy text"}</span>
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line font-normal space-y-3">
                        {loading ? (
                            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center gap-4 py-8 animate-in fade-in">
                                <AnimatedCircularProgressBar
                                    max={100}
                                    min={0}
                                    value={translationProgress}
                                    gaugePrimaryColor="var(--purple-primary, #6656C7)"
                                    gaugeSecondaryColor="var(--purple-bg, #E9E6FA)"
                                    className="size-32 text-xl font-bold text-[var(--purple-primary)]"
                                />
                                <div className="space-y-1">
                                    <p className="text-xs font-bold text-[var(--text-primary)]">
                                        Translating into {selectedLanguage}...
                                    </p>
                                    <p className="text-[11px] text-[var(--text-muted)]">
                                        Neural language models processing speech segments
                                    </p>
                                </div>
                            </div>
                        ) : translatedText ? (
                            translatedText
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[var(--text-muted)]">
                                <p className="text-sm font-medium mb-3">
                                    Ready to translate
                                </p>
                                <ShimmerButton
                                    onClick={() => handleTranslate(selectedLanguage)}
                                    className="!text-xs !py-2 !px-4 shadow-sm"
                                    shimmerDuration="2.5s"
                                >
                                    Translate to {selectedLanguage}
                                </ShimmerButton>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
