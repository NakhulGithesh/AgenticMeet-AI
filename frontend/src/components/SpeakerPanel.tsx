"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Check,
    Pencil,
    ArrowRight,
    Play,
    Pause,
    Volume2,
    Camera,
    Trash2,
} from "lucide-react";
import type { SpeakerSegment } from "@/types/meeting";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";

interface SpeakerPanelProps {
    speakerSegments: SpeakerSegment[];
    onRename: (mappings: Record<string, string>) => void;
    savedMappings?: Record<string, string>;
    speakerPhotos?: Record<string, string>;
    onUpdatePhotos?: (photos: Record<string, string>) => void;
    taskId?: string | null;
    audioUrl?: string | null;
}

export default function SpeakerPanel({
    speakerSegments,
    onRename,
    savedMappings = {},
    speakerPhotos = {},
    onUpdatePhotos,
    taskId,
    audioUrl,
}: SpeakerPanelProps) {
    const rawSpeakers = [...new Set(speakerSegments.map((s) => s.speaker))];
    const uniqueSpeakers = rawSpeakers.length > 0 ? rawSpeakers : ["Speaker 1", "Speaker 2", "Speaker 3"];

    const cleanSpeakerName = (s: string) =>
        s.replace(/\s*[\(\[]?\d{1,2}:\d{2}(?::\d{2})?[\)\]]?/g, "").trim();

    // Initialize names using savedMappings or the actual speaker name
    const [names, setNames] = useState<Record<string, string>>(() => {
        const initial: Record<string, string> = {};
        uniqueSpeakers.forEach((s) => {
            const clean = cleanSpeakerName(s);
            const saved = savedMappings[s] || savedMappings[clean];
            initial[s] = saved || (clean.startsWith("Speaker ") ? "" : clean);
        });
        return initial;
    });

    const [photos, setPhotos] = useState<Record<string, string>>(speakerPhotos);
    const [savedSuccess, setSavedSuccess] = useState(false);
    const [playingSpeaker, setPlayingSpeaker] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Keep names in sync whenever speakerSegments or savedMappings change
    useEffect(() => {
        setNames((prev) => {
            const next = { ...prev };
            uniqueSpeakers.forEach((s) => {
                const clean = cleanSpeakerName(s);
                const saved = savedMappings[s] || savedMappings[clean];
                if (saved) {
                    next[s] = saved;
                } else if (!next[s]) {
                    next[s] = clean.startsWith("Speaker ") ? "" : clean;
                }
            });
            return next;
        });
    }, [speakerSegments, savedMappings]);

    // Keep photos in sync
    useEffect(() => {
        if (speakerPhotos && Object.keys(speakerPhotos).length > 0) {
            setPhotos((prev) => ({ ...prev, ...speakerPhotos }));
        }
    }, [speakerPhotos]);

    // Clean up audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Speaker aesthetic palettes (supports up to 8 distinct speakers)
    const palette = [
        { avatarBg: "bg-[#E9E6FA]", avatarText: "text-[#6656C7]", barBg: "bg-[#7567D8]", border: "border-[#D9D4F4]" },
        { avatarBg: "bg-[#DDE7FA]", avatarText: "text-[#3D6AB5]", barBg: "bg-[#83A9E8]", border: "border-[#C5D7F8]" },
        { avatarBg: "bg-[#DDF4EB]", avatarText: "text-[#238561]", barBg: "bg-[#65C6A3]", border: "border-[#BEEBD8]" },
        { avatarBg: "bg-[#FDE8EE]", avatarText: "text-[#C8466E]", barBg: "bg-[#EF7297]", border: "border-[#F8CAD7]" },
        { avatarBg: "bg-[#FEF3C7]", avatarText: "text-[#D97706]", barBg: "bg-[#F59E0B]", border: "border-[#FDE68A]" },
        { avatarBg: "bg-[#EDE9FE]", avatarText: "text-[#7C3AED]", barBg: "bg-[#8B5CF6]", border: "border-[#DDD6FE]" },
        { avatarBg: "bg-[#E0F2FE]", avatarText: "text-[#0284C7]", barBg: "bg-[#38BDF8]", border: "border-[#BAE6FD]" },
        { avatarBg: "bg-[#FCE7F3]", avatarText: "text-[#DB2777]", barBg: "bg-[#F472B6]", border: "border-[#FBCFE8]" },
    ];

    // Compute realistic stats from real segments
    const speakerData = uniqueSpeakers.map((speaker, index) => {
        const segments = speakerSegments.filter(
            (s) => cleanSpeakerName(s.speaker) === cleanSpeakerName(speaker)
        );
        const segmentCount = segments.length;
        const totalSpeakerTime = segments.reduce((acc, s) => acc + Math.max(0, (s.end ?? 0) - (s.start ?? 0)), 0);
        const wordCount = segments.reduce((acc, s) => acc + (s.word_count || s.text.split(/\s+/).filter(Boolean).length), 0);
        
        // Find best segment for voice sample (duration between 2.0s and 6.5s)
        const bestSegment = segments.find(s => ((s.end ?? 0) - (s.start ?? 0)) >= 2.2 && ((s.end ?? 0) - (s.start ?? 0)) <= 6.5) ||
                            segments.find(s => ((s.end ?? 0) - (s.start ?? 0)) >= 1.5) ||
                            segments[0];

        return { 
            speaker, 
            segmentCount, 
            wordCount, 
            index, 
            totalSpeakerTime,
            bestSegment,
            quote: bestSegment?.text?.trim() || ""
        };
    });

    const totalSpeakingSeconds = speakerData.reduce((acc, s) => acc + s.totalSpeakerTime, 0) || 1;

    const playSpeechFallback = (speakerName: string, textSnippet: string, index: number) => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            setPlayingSpeaker(null);
            return;
        }
        try {
            window.speechSynthesis.cancel();
            const pitches = [1.05, 0.82, 1.25, 0.95];
            const rates = [1.0, 0.95, 1.05, 1.0];
            const utterance = new SpeechSynthesisUtterance(textSnippet || `Sample voice clip for ${speakerName}`);
            utterance.pitch = pitches[index % pitches.length];
            utterance.rate = rates[index % rates.length];

            const voices = window.speechSynthesis.getVoices();
            if (voices && voices.length > 0) {
                utterance.voice = voices[index % voices.length];
            }

            utterance.onend = () => setPlayingSpeaker(null);
            utterance.onerror = () => setPlayingSpeaker(null);
            window.speechSynthesis.speak(utterance);
        } catch {
            setPlayingSpeaker(null);
        }
    };

    const handleToggleAudio = (speakerName: string, segment?: SpeakerSegment) => {
        if (playingSpeaker === speakerName) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
            setPlayingSpeaker(null);
            return;
        }

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        setPlayingSpeaker(speakerName);

        const startSec = segment?.start || 0;
        const endSec = segment?.end || (startSec + 4.0);

        // 1. If taskId is available, fetch the exact server-sliced audio clip
        let clipSrc = "";
        if (taskId && !taskId.startsWith("meeting-")) {
            clipSrc = `http://127.0.0.1:8000/api/audio/${taskId}/clip?start=${startSec.toFixed(2)}&end=${endSec.toFixed(2)}`;
        } else if (audioUrl && !audioUrl.startsWith("/audio/meeting_sample")) {
            clipSrc = audioUrl;
        }

        if (clipSrc) {
            const audio = new Audio(clipSrc);
            audioRef.current = audio;

            if (clipSrc === audioUrl) {
                audio.currentTime = startSec;
                const onTimeUpdate = () => {
                    if (audio.currentTime >= endSec) {
                        audio.pause();
                        audio.removeEventListener("timeupdate", onTimeUpdate);
                        setPlayingSpeaker(null);
                    }
                };
                audio.addEventListener("timeupdate", onTimeUpdate);
            }

            audio.onended = () => setPlayingSpeaker(null);
            audio.onerror = () => {
                console.warn(`Audio clip error for ${speakerName}, using fallback speech`);
                playSpeechFallback(speakerName, segment?.text || `Voice sample for ${speakerName}`, 0);
            };

            audio.play().catch(err => {
                console.warn("Playback error:", err);
                playSpeechFallback(speakerName, segment?.text || `Voice sample for ${speakerName}`, 0);
            });
        } else {
            playSpeechFallback(speakerName, segment?.text || `Voice sample for ${speakerName}`, 0);
        }
    };

    const handlePhotoUpload = (speakerKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const clean = cleanSpeakerName(speakerKey);
            const currentNamed = names[speakerKey] || names[clean] || "";
            const cleanNamed = cleanSpeakerName(currentNamed);

            const nextPhotos = {
                ...photos,
                [speakerKey]: dataUrl,
                [clean]: dataUrl,
                ...(cleanNamed ? { [cleanNamed]: dataUrl } : {}),
            };
            setPhotos(nextPhotos);
            onUpdatePhotos?.(nextPhotos);
        };
        reader.readAsDataURL(file);
    };

    const handleRemovePhoto = (speakerKey: string) => {
        const clean = cleanSpeakerName(speakerKey);
        const currentNamed = names[speakerKey] || names[clean] || "";
        const cleanNamed = cleanSpeakerName(currentNamed);

        const nextPhotos = { ...photos };
        delete nextPhotos[speakerKey];
        delete nextPhotos[clean];
        if (cleanNamed) delete nextPhotos[cleanNamed];

        setPhotos(nextPhotos);
        onUpdatePhotos?.(nextPhotos);
    };

    const getSpeakerPhoto = (speakerKey: string) => {
        const clean = cleanSpeakerName(speakerKey);
        const currentNamed = names[speakerKey] || names[clean] || "";
        const cleanNamed = cleanSpeakerName(currentNamed);
        return (
            photos[speakerKey] ||
            photos[clean] ||
            (cleanNamed ? photos[cleanNamed] : undefined) ||
            null
        );
    };

    const handleSave = () => {
        const mappings: Record<string, string> = {};
        Object.entries(names).forEach(([orig, newName]) => {
            const cleanOld = cleanSpeakerName(orig);
            const cleanNew = cleanSpeakerName(newName);
            if (cleanNew) {
                mappings[orig] = cleanNew;
                mappings[cleanOld] = cleanNew;
            }
        });
        onRename(mappings);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
    };

    return (
        <div className="space-y-8 w-full">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        Speakers &amp; Profile Photos
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {uniqueSpeakers.length} speaker{uniqueSpeakers.length === 1 ? "" : "s"} detected. Listen to audio snippets to identify each person, add profile photos, and assign names.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {savedSuccess && (
                        <span className="badge-pill badge-mint text-xs animate-in fade-in">
                            <Check className="w-3.5 h-3.5" />
                            Names saved &amp; updated across transcript!
                        </span>
                    )}
                    <ShimmerButton
                        onClick={handleSave}
                        className="!text-xs !py-2 !px-4 shadow-sm gap-2"
                        shimmerDuration="2.5s"
                    >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save all names</span>
                    </ShimmerButton>
                </div>
            </div>

            {/* Speaker Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {speakerData.map((stat, idx) => {
                    const theme = palette[idx % palette.length];
                    const clean = cleanSpeakerName(stat.speaker);
                    const displayName = names[stat.speaker] || savedMappings[stat.speaker] || savedMappings[clean] || stat.speaker;
                    const percent = Math.max(1, Math.round((stat.totalSpeakerTime / totalSpeakingSeconds) * 100));
                    const estMin = (stat.totalSpeakerTime / 60).toFixed(1);
                    const isPlaying = playingSpeaker === stat.speaker;
                    const photo = getSpeakerPhoto(stat.speaker);

                    return (
                        <div
                            key={stat.speaker}
                            className="soft-card p-5 bg-white border border-[var(--border-soft)] hover:border-[var(--purple-light)] transition-all space-y-4"
                        >
                            <div className="flex items-center justify-between gap-3.5">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    {/* Speaker Photo / Avatar */}
                                    <div className="relative group/avatar shrink-0">
                                        <div
                                            className={`w-12 h-12 rounded-full ${theme.avatarBg} ${theme.avatarText} border ${theme.border} flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-xs`}
                                        >
                                            {photo ? (
                                                <img
                                                    src={photo}
                                                    alt={displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span>{displayName.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>

                                        {/* Camera upload overlay trigger */}
                                        <label
                                            htmlFor={`card-photo-${idx}`}
                                            className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                                            title="Upload speaker photo"
                                        >
                                            <Camera className="w-4 h-4" />
                                        </label>
                                        <input
                                            id={`card-photo-${idx}`}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handlePhotoUpload(stat.speaker, e)}
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                                            {displayName}
                                        </h3>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {estMin} min · {percent}% speaking time
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleToggleAudio(stat.speaker, stat.bestSegment)}
                                    className={`p-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                                        isPlaying
                                            ? "bg-[var(--purple-primary)] text-white shadow-sm ring-2 ring-[var(--purple-light)]/40"
                                            : "bg-[var(--purple-subtle)] text-[var(--purple-primary)] hover:bg-[var(--purple-bg)]"
                                    }`}
                                    title={`Listen to ${displayName}'s voice sample`}
                                >
                                    {isPlaying ? (
                                        <Pause className="w-4 h-4" />
                                    ) : (
                                        <Volume2 className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {/* Participation Bar */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-medium">
                                    <span>Participation</span>
                                    <span>{percent}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-[var(--purple-subtle)] overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${theme.barBg}`}
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rename Speakers & Profile Photos Section */}
            <div className="soft-card p-6 sm:p-7 bg-white border border-[var(--border-soft)] space-y-5">
                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
                    <div className="w-7 h-7 rounded-lg bg-[var(--purple-bg)] text-[var(--purple-primary)] flex items-center justify-center">
                        <Pencil className="w-3.5 h-3.5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            Assign Names &amp; Profile Photos
                        </h3>
                        <p className="text-xs text-[var(--text-muted)]">
                            Play each speaker&apos;s audio clip to identify who is speaking, upload a profile photo, and save their actual name.
                        </p>
                    </div>
                </div>

                <div className="space-y-3.5">
                    {uniqueSpeakers.map((origSpeaker, idx) => {
                        const isPlaying = playingSpeaker === origSpeaker;
                        const theme = palette[idx % palette.length];
                        const clean = cleanSpeakerName(origSpeaker);
                        const statObj = speakerData.find((s) => cleanSpeakerName(s.speaker) === clean);
                        const bestSegment = statObj?.bestSegment;
                        const quote = bestSegment?.text
                            ? `"${bestSegment.text.slice(0, 110)}${bestSegment.text.length > 110 ? "..." : ""}"`
                            : undefined;
                        const photo = getSpeakerPhoto(origSpeaker);
                        const displayName = names[origSpeaker] || savedMappings[origSpeaker] || savedMappings[clean] || origSpeaker;

                        return (
                            <div
                                key={origSpeaker}
                                className={`p-4 rounded-2xl border transition-all ${
                                    isPlaying
                                        ? "bg-[var(--purple-bg)]/40 border-[var(--purple-primary)]/50 shadow-sm"
                                        : "bg-[var(--purple-subtle)]/40 border-[var(--border-soft)] hover:border-[var(--purple-light)]"
                                }`}
                            >
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Speaker Photo / Avatar + Upload Button */}
                                    <div className="flex items-center gap-2.5 min-w-[170px]">
                                        <div className="relative group shrink-0">
                                            <div
                                                className={`w-10 h-10 rounded-full ${theme.avatarBg} ${theme.avatarText} border ${theme.border} flex items-center justify-center font-bold text-xs overflow-hidden shadow-xs`}
                                            >
                                                {photo ? (
                                                    <img
                                                        src={photo}
                                                        alt={displayName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span>{displayName.charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>

                                            {/* Camera Trigger */}
                                            <label
                                                htmlFor={`rename-photo-${idx}`}
                                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-[var(--border-soft)] shadow-xs flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--purple-primary)] cursor-pointer hover:scale-110 transition-transform"
                                                title="Upload profile photo"
                                            >
                                                <Camera className="w-2.5 h-2.5" />
                                            </label>
                                            <input
                                                id={`rename-photo-${idx}`}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => handlePhotoUpload(origSpeaker, e)}
                                            />
                                        </div>

                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-[var(--text-primary)] block truncate">
                                                {origSpeaker}
                                            </span>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <label
                                                    htmlFor={`rename-photo-${idx}`}
                                                    className="text-[10px] text-[var(--purple-primary)] hover:underline cursor-pointer font-medium"
                                                >
                                                    {photo ? "Change photo" : "Add photo"}
                                                </label>
                                                {photo && (
                                                    <>
                                                        <span className="text-[10px] text-[var(--text-placeholder)]">·</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePhoto(origSpeaker)}
                                                            className="text-[10px] text-[var(--pink-primary)] hover:underline font-medium"
                                                            title="Remove photo"
                                                        >
                                                            Remove
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Small Audio Clip Button Beside Rename Bar */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleAudio(origSpeaker, bestSegment)}
                                        aria-label={`Play audio sample of ${origSpeaker}`}
                                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 shadow-xs ${
                                            isPlaying
                                                ? "bg-[var(--purple-primary)] text-white shadow-md ring-2 ring-[var(--purple-light)]/40"
                                                : "bg-white text-[var(--purple-primary)] border border-[var(--border-soft)] hover:bg-[var(--purple-bg)] hover:border-[var(--purple-light)]"
                                        }`}
                                    >
                                        {isPlaying ? (
                                            <>
                                                <div className="flex items-end gap-0.5 h-3.5 w-3.5">
                                                    <span className="w-0.5 bg-white rounded-full animate-soundwave-1" />
                                                    <span className="w-0.5 bg-white rounded-full animate-soundwave-2" />
                                                    <span className="w-0.5 bg-white rounded-full animate-soundwave-3" />
                                                    <span className="w-0.5 bg-white rounded-full animate-soundwave-4" />
                                                </div>
                                                <span>Playing sample</span>
                                                <Pause className="w-3 h-3 ml-0.5" />
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-3 h-3 fill-current" />
                                                <span>Play voice clip</span>
                                                <Volume2 className="w-3 h-3 opacity-60 ml-0.5" />
                                            </>
                                        )}
                                    </button>

                                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-placeholder)] shrink-0 hidden sm:block" />

                                    {/* Rename Input Bar */}
                                    <div className="flex-1 min-w-[190px]">
                                        <input
                                            type="text"
                                            value={names[origSpeaker] || ""}
                                            onChange={(e) =>
                                                setNames((prev) => ({ ...prev, [origSpeaker]: e.target.value }))
                                            }
                                            placeholder={`Assign name for ${clean}...`}
                                            className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-[var(--border-soft)] focus:border-[var(--purple-primary)] focus:ring-2 focus:ring-[var(--purple-soft)] outline-none text-[var(--text-primary)] transition-all font-medium placeholder:text-[var(--text-placeholder)]"
                                        />
                                    </div>
                                </div>

                                {/* Spoken Quote Preview */}
                                {quote && (
                                    <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-start gap-2 text-[11px] text-[var(--text-muted)]">
                                        <Volume2 className="w-3.5 h-3.5 text-[var(--purple-medium)] shrink-0 mt-0.5" />
                                        <p className="line-clamp-1 italic">
                                            Snippet: {quote}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
