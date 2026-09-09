"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
    X,
    Play,
    Pause,
    RotateCcw,
    RotateCw,
    Volume2,
    VolumeX,
    Maximize2,
    PictureInPicture2,
    Sparkles,
    Users,
    MessageSquare,
    Clock,
    Flame,
    AlertTriangle,
    CheckCircle2,
    Search,
    ChevronRight,
    Headphones,
    Video as VideoIcon,
    Calendar,
    Activity,
    ArrowDown,
} from "lucide-react";
import type {
    SpeakerSegment,
    TopicSegment,
    RiskAnalysis,
    SummaryData,
} from "@/types/meeting";
import {
    getSpeakerColor,
    cleanSpeakerName,
    formatTime,
    parseTimestampToSeconds,
} from "@/lib/speakerColors";

interface PlaybackDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    meetingTitle: string;
    fileName?: string;
    fileType?: string;
    mediaUrl: string;
    videoUrl?: string;
    audioUrl?: string;
    speakerSegments?: SpeakerSegment[];
    topics?: TopicSegment[];
    riskAnalysis?: RiskAnalysis;
    summary?: SummaryData;
    speakerPhotos?: Record<string, string>;
    initialSeekTime?: number | null;
    onSeekHandled?: () => void;
}

type DrawerTab = "transcript" | "speakers" | "topics" | "filters";

interface NormalizedSegment {
    id: number;
    speaker: string;
    text: string;
    start: number;
    end: number;
    duration: number;
    wordCount: number;
}

export default function PlaybackDrawer({
    isOpen,
    onClose,
    meetingTitle,
    fileName,
    fileType,
    mediaUrl,
    videoUrl,
    audioUrl,
    speakerSegments = [],
    topics = [],
    riskAnalysis,
    summary,
    speakerPhotos = {},
    initialSeekTime,
    onSeekHandled,
}: PlaybackDrawerProps) {
    // Detect if media is video or audio
    const isVideo = useMemo(() => {
        const nameCheck = (fileName || "").toLowerCase();
        const urlCheck = (videoUrl || mediaUrl || "").toLowerCase();
        const typeCheck = (fileType || "").toLowerCase();
        return (
            Boolean(videoUrl) ||
            typeCheck.includes("video") ||
            typeCheck.includes("quicktime") ||
            urlCheck.includes("/api/video") ||
            urlCheck.includes("/video/") ||
            urlCheck.endsWith(".mp4") ||
            urlCheck.endsWith(".mov") ||
            urlCheck.endsWith(".webm") ||
            urlCheck.endsWith(".mkv") ||
            urlCheck.endsWith(".avi") ||
            nameCheck.endsWith(".mp4") ||
            nameCheck.endsWith(".mov") ||
            nameCheck.endsWith(".webm") ||
            nameCheck.endsWith(".mkv") ||
            nameCheck.endsWith(".avi")
        );
    }, [fileName, mediaUrl, videoUrl, fileType]);

    const effectiveVideoUrl = videoUrl || (isVideo ? mediaUrl : "");
    const effectiveAudioUrl = audioUrl || mediaUrl;

    // Active drawer tab
    const [activeTab, setActiveTab] = useState<DrawerTab>("transcript");

    // Media element reference (shared for both video and audio)
    const mediaRef = useRef<HTMLMediaElement | null>(null);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [transcriptSearch, setTranscriptSearch] = useState("");
    const [autoScroll, setAutoScroll] = useState(true);
    const isProgrammaticScroll = useRef(false);
    const [userScrolledAway, setUserScrolledAway] = useState(false);

    // Hover tooltip for timeline scrubber
    const [scrubHoverTime, setScrubHoverTime] = useState<number | null>(null);
    const [scrubHoverPos, setScrubHoverPos] = useState<number>(0);
    const timelineRef = useRef<HTMLDivElement | null>(null);

    // References to scroll active transcript into view
    const transcriptListRef = useRef<HTMLDivElement | null>(null);
    const segmentRefs = useRef<Record<number, HTMLDivElement | null>>({});

    // Normalize speaker segments with fallback timestamps if missing
    const normalizedSegments: NormalizedSegment[] = useMemo(() => {
        if (!speakerSegments || speakerSegments.length === 0) {
            return [];
        }

        let runningTime = 0;
        return speakerSegments.map((seg, i) => {
            const explicitStart = seg.start;
            const explicitEnd = seg.end;
            const words = seg.word_count || seg.text.split(/\s+/).filter(Boolean).length || 15;
            const estimatedSec = Math.max(3, Math.round(words / 2.6));

            let start = explicitStart !== undefined ? explicitStart : runningTime;
            let end = explicitEnd !== undefined ? explicitEnd : start + estimatedSec;

            if (end <= start) end = start + estimatedSec;
            runningTime = end;

            return {
                id: i,
                speaker: cleanSpeakerName(seg.speaker || `Speaker ${i + 1}`),
                text: seg.text || "",
                start,
                end,
                duration: end - start,
                wordCount: words,
            };
        });
    }, [speakerSegments]);

    // Effective total media duration
    const totalDuration = useMemo(() => {
        if (duration > 0 && isFinite(duration)) return duration;
        if (normalizedSegments.length > 0) {
            return normalizedSegments[normalizedSegments.length - 1].end;
        }
        return 270;
    }, [duration, normalizedSegments]);

    // Identify current active speaking segment based on playback timestamp
    const activeSegment = useMemo(() => {
        return (
            normalizedSegments.find(
                (s) => currentTime >= s.start && currentTime < s.end
            ) ||
            normalizedSegments[0] ||
            null
        );
    }, [currentTime, normalizedSegments]);

    // Active segment index
    const activeSegmentIdx = useMemo(() => {
        if (!activeSegment) return -1;
        return normalizedSegments.findIndex((s) => s.id === activeSegment.id);
    }, [activeSegment, normalizedSegments]);

    // Previous and Next segments for context view
    const prevSegment = activeSegmentIdx > 0 ? normalizedSegments[activeSegmentIdx - 1] : null;
    const nextSegment =
        activeSegmentIdx >= 0 && activeSegmentIdx < normalizedSegments.length - 1
            ? normalizedSegments[activeSegmentIdx + 1]
            : null;

    // Participant Stats for the Speakers tab
    const participantStats = useMemo(() => {
        const statsMap: Record<
            string,
            { speaker: string; talkTime: number; wordCount: number; turns: number }
        > = {};

        normalizedSegments.forEach((seg) => {
            if (!statsMap[seg.speaker]) {
                statsMap[seg.speaker] = {
                    speaker: seg.speaker,
                    talkTime: 0,
                    wordCount: 0,
                    turns: 0,
                };
            }
            statsMap[seg.speaker].talkTime += seg.duration;
            statsMap[seg.speaker].wordCount += seg.wordCount;
            statsMap[seg.speaker].turns += 1;
        });

        const list = Object.values(statsMap);
        const totalTalk = list.reduce((acc, s) => acc + s.talkTime, 0) || 1;

        return list.map((item, idx) => {
            const talkPct = Math.min(100, Math.round((item.talkTime / totalTalk) * 100));
            const wpm = item.talkTime > 0 ? Math.round((item.wordCount / (item.talkTime / 60))) : 160;
            const mins = Math.floor(item.talkTime / 60);
            const secs = Math.floor(item.talkTime % 60);
            const talkTimeFormatted = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

            return {
                ...item,
                colorConfig: getSpeakerColor(item.speaker, idx),
                talkPct,
                listenPct: 100 - talkPct,
                wpm: wpm || 165,
                talkTimeFormatted,
            };
        });
    }, [normalizedSegments]);

    // Seeking handler
    const seekTo = useCallback(
        (targetSecs: number, autoPlay = true) => {
            const safe = Math.max(0, Math.min(targetSecs, totalDuration));
            setCurrentTime(safe);
            if (mediaRef.current) {
                mediaRef.current.currentTime = safe;
                if (autoPlay) {
                    mediaRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
                }
            }
        },
        [totalDuration]
    );

    // Initial seek listener when triggered by external tabs (Transcript, Risks, Summary, Topics)
    useEffect(() => {
        if (isOpen && initialSeekTime !== null && initialSeekTime !== undefined) {
            seekTo(initialSeekTime, true);
            if (onSeekHandled) onSeekHandled();
        }
    }, [isOpen, initialSeekTime, seekTo, onSeekHandled]);

    // Handle Escape key to close drawer
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Auto-scroll active transcript segment into view
    useEffect(() => {
        if (!autoScroll || !activeSegment) return;
        const el = segmentRefs.current[activeSegment.id];
        if (el) {
            isProgrammaticScroll.current = true;
            el.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
            // Clear flag after scroll animation settles
            setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 400);
        }
    }, [activeSegment, autoScroll]);

    // Detect user manual scroll on transcript list — disables autoScroll
    const handleTranscriptScroll = useCallback(() => {
        if (isProgrammaticScroll.current) return; // Ignore programmatic scrolls
        if (autoScroll) {
            setAutoScroll(false);
            setUserScrolledAway(true);
        }
    }, [autoScroll]);

    // Jump to current — re-enables auto-scroll
    const handleJumpToCurrent = useCallback(() => {
        setAutoScroll(true);
        setUserScrolledAway(false);
        if (activeSegment) {
            const el = segmentRefs.current[activeSegment.id];
            if (el) {
                isProgrammaticScroll.current = true;
                el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, 400);
            }
        }
    }, [activeSegment]);

    // Play/Pause toggle
    const togglePlay = () => {
        if (!mediaRef.current) return;
        if (isPlaying) {
            mediaRef.current.pause();
            setIsPlaying(false);
        } else {
            mediaRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
        }
    };

    // Skip backward / forward 15 seconds
    const handleSkip = (deltaSeconds: number) => {
        seekTo(currentTime + deltaSeconds, isPlaying);
    };

    // Toggle mute
    const toggleMute = () => {
        if (!mediaRef.current) return;
        const next = !isMuted;
        mediaRef.current.muted = next;
        setIsMuted(next);
    };

    // Change volume
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        setIsMuted(val === 0);
        if (mediaRef.current) {
            mediaRef.current.volume = val;
            mediaRef.current.muted = val === 0;
        }
    };

    // Cycle speed
    const cycleSpeed = () => {
        const speeds = [0.75, 1, 1.25, 1.5, 2];
        const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
        const nextSpeed = speeds[nextIdx];
        setPlaybackRate(nextSpeed);
        if (mediaRef.current) {
            mediaRef.current.playbackRate = nextSpeed;
        }
    };

    // Fullscreen for video
    const toggleFullscreen = () => {
        if (!mediaRef.current) return;
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        } else {
            mediaRef.current.requestFullscreen().catch(() => {});
        }
    };

    // Picture in Picture for video
    const togglePiP = async () => {
        if (!mediaRef.current || !(mediaRef.current instanceof HTMLVideoElement)) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await mediaRef.current.requestPictureInPicture();
            }
        } catch (e) {
            console.warn("PiP not supported or failed:", e);
        }
    };

    // Timeline Scrubber click & drag
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, clickX / rect.width));
        seekTo(pct * totalDuration, isPlaying);
    };

    const handleTimelineMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const hoverX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, hoverX / rect.width));
        setScrubHoverTime(pct * totalDuration);
        setScrubHoverPos(hoverX);
    };

    // Filtered transcript for search
    const filteredSegments = useMemo(() => {
        if (!transcriptSearch.trim()) return normalizedSegments;
        const q = transcriptSearch.toLowerCase();
        return normalizedSegments.filter(
            (s) => s.text.toLowerCase().includes(q) || s.speaker.toLowerCase().includes(q)
        );
    }, [normalizedSegments, transcriptSearch]);

    // Quick Jump target points
    const jumpTargets = useMemo(() => {
        const targets: { label: string; time: number; type: string }[] = [];

        // First speaker
        if (normalizedSegments.length > 0) {
            targets.push({
                label: `Speaker: ${normalizedSegments[0].speaker}`,
                time: normalizedSegments[0].start,
                type: "speaker",
            });
        }

        // Key decisions
        if (summary?.key_decisions && summary.key_decisions.length > 0) {
            targets.push({
                label: "Key Decision",
                time: Math.min(totalDuration * 0.35, 90),
                type: "decision",
            });
        }

        // Risks
        if (riskAnalysis?.deadlines && riskAnalysis.deadlines.length > 0) {
            targets.push({
                label: "Urgent Risk",
                time: Math.min(totalDuration * 0.55, 140),
                type: "risk",
            });
        }

        // First Topic
        if (topics && topics.length > 0) {
            const tSec = parseTimestampToSeconds(topics[0].timestamp) || 0;
            targets.push({
                label: `Topic: ${topics[0].title.slice(0, 16)}...`,
                time: tSec,
                type: "topic",
            });
        }

        // Action Item
        if (summary?.action_items && summary.action_items.length > 0) {
            targets.push({
                label: "Action Item",
                time: Math.min(totalDuration * 0.8, 195),
                type: "action",
            });
        }

        return targets;
    }, [normalizedSegments, summary, riskAnalysis, topics, totalDuration]);

    const activeColor = activeSegment ? getSpeakerColor(activeSegment.speaker) : getSpeakerColor("Speaker 1");
    const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

    return (
        <aside
            className={`fixed top-24 right-0 bottom-6 max-h-[820px] w-full sm:w-[490px] md:w-[520px] max-w-[calc(100vw-20px)] bg-[#FAF9FF]/95 dark:bg-[#151325]/95 backdrop-blur-xl border-l border-y border-[var(--border-soft)] dark:border-[#2C274A] rounded-l-[36px] sm:rounded-l-[40px] z-50 flex flex-col transition-all duration-300 ease-in-out select-none overflow-hidden ${
                isOpen
                    ? "opacity-100 shadow-[-16px_0_45px_rgba(102,86,199,0.16)] dark:shadow-[-16px_0_45px_rgba(0,0,0,0.55)] pointer-events-auto"
                    : "opacity-0 shadow-none pointer-events-none"
            }`}
            style={{
                transform: isOpen ? "translateX(0)" : "translateX(100%)",
            }}
        >
                {/* ── 1. HEADER ── */}
                <div className="px-6 py-4 border-b border-[var(--border-soft)] dark:border-[#262140] flex items-center justify-between bg-white/80 dark:bg-[#1A172E]/80 backdrop-blur-md shrink-0 rounded-tl-[36px] sm:rounded-tl-[40px]">
                    <div className="min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[var(--mint-text)] animate-pulse" />
                            <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight">
                                Meeting Playback
                            </h3>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[var(--purple-bg)] dark:bg-[#28214A] text-[var(--purple-primary)] dark:text-[#A79AF4] border border-[var(--purple-soft)] dark:border-[#382F66]">
                                {isVideo ? (fileName?.toLowerCase().endsWith(".mov") ? "QuickTime Video" : "MP4 Video") : "Audio"}
                            </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] truncate max-w-[320px] mt-0.5">
                            {fileName || meetingTitle}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-7 h-7 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252042] border border-[var(--border-soft)] dark:border-[#2D2A4A] transition-colors cursor-pointer"
                        title="Close player (Esc)"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── 2. SCROLLABLE PLAYBACK BODY ── */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                    {/* Media Container: Video Frame or Audio Artwork */}
                    <div className="relative">
                        {isVideo ? (
                            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-md group">
                                <video
                                    ref={(el) => {
                                        mediaRef.current = el;
                                    }}
                                    src={effectiveVideoUrl || mediaUrl}
                                    playsInline
                                    preload="metadata"
                                    onClick={togglePlay}
                                    onTimeUpdate={(e) => {
                                        const el = e.currentTarget;
                                        setCurrentTime(el.currentTime);
                                    }}
                                    onLoadedMetadata={(e) => {
                                        const el = e.currentTarget;
                                        if (el.duration && !isNaN(el.duration) && isFinite(el.duration)) {
                                            setDuration(el.duration);
                                        }
                                    }}
                                    onEnded={() => setIsPlaying(false)}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    className="w-full h-full object-contain bg-black cursor-pointer"
                                />

                                {/* Play Overlay on Pause */}
                                {!isPlaying && (
                                    <div
                                        onClick={togglePlay}
                                        className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px] cursor-pointer"
                                    >
                                        <div className="w-13 h-13 rounded-full bg-[var(--purple-primary)]/90 text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-110">
                                            <Play className="w-6 h-6 fill-current ml-0.5" />
                                        </div>
                                    </div>
                                )}

                                {/* Video Floating Quick Controls */}
                                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md px-2 py-1 rounded-xl">
                                    <button
                                        onClick={togglePiP}
                                        className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                                        title="Picture in Picture"
                                    >
                                        <PictureInPicture2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={toggleFullscreen}
                                        className="text-white/80 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                                        title="Fullscreen"
                                    >
                                        <Maximize2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Beautiful Audio Player Card (Waveform + Artwork) */
                            <div className="relative rounded-2xl p-5 bg-gradient-to-br from-[#F5F2FF] via-[#F8F5FF] to-[#EDE8FF] dark:from-[#211B3D] dark:via-[#1B1733] dark:to-[#141126] border border-[#E4DCFF] dark:border-[#322A5A] shadow-sm overflow-hidden">
                                {/* Hidden Audio Element */}
                                <audio
                                    ref={(el) => {
                                        mediaRef.current = el;
                                    }}
                                    src={effectiveAudioUrl}
                                    onTimeUpdate={(e) => {
                                        const el = e.currentTarget;
                                        setCurrentTime(el.currentTime);
                                    }}
                                    onLoadedMetadata={(e) => {
                                        const el = e.currentTarget;
                                        if (el.duration && !isNaN(el.duration) && isFinite(el.duration)) {
                                            setDuration(el.duration);
                                        }
                                    }}
                                    onEnded={() => setIsPlaying(false)}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                />

                                {/* Ambient decorative background circles */}
                                <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-[var(--purple-primary)]/10 dark:bg-[var(--purple-primary)]/20 blur-2xl pointer-events-none" />
                                <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-[#EF7297]/10 dark:bg-[#EF7297]/15 blur-2xl pointer-events-none" />

                                <div className="relative z-10 flex items-center justify-between gap-4">
                                    {/* Left: Artwork / Speaker Avatar */}
                                    <div className="relative shrink-0">
                                        <div className={`w-15 h-15 rounded-2xl bg-white dark:bg-[#252042] border-2 ${activeColor.border} flex items-center justify-center shadow-md overflow-hidden transition-all duration-300 ${isPlaying ? "scale-105 ring-4 ring-[var(--purple-primary)]/20" : ""}`}>
                                            {activeSegment && speakerPhotos[activeSegment.speaker] ? (
                                                <img
                                                    src={speakerPhotos[activeSegment.speaker]}
                                                    alt={activeSegment.speaker}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center">
                                                    <Headphones className="w-6 h-6 text-[var(--purple-primary)] dark:text-[#A79AF4]" />
                                                </div>
                                            )}
                                        </div>

                                        {isPlaying && (
                                            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--mint-text)] border-2 border-white dark:border-[#151325] animate-ping" />
                                        )}
                                    </div>

                                    {/* Middle: Active Speaker & Realtime Waveform Visualization */}
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-bold ${activeColor.nameColor} truncate flex items-center gap-1.5`}>
                                                <Activity className="w-3.5 h-3.5" />
                                                <span>{activeSegment ? activeSegment.speaker : "Speaking..."}</span>
                                            </span>
                                            <span className="text-[10px] font-semibold text-[var(--text-muted)] bg-white/80 dark:bg-[#252042]/80 px-2 py-0.5 rounded-full border border-[var(--border-soft)] dark:border-[#352E5E]">
                                                {formatTime(currentTime)} / {formatTime(totalDuration)}
                                            </span>
                                        </div>

                                        {/* Waveform Equalizer Bars */}
                                        <div className="flex items-end justify-between h-9 gap-1 px-1 py-1 rounded-xl bg-white/60 dark:bg-[#1C1833]/60 border border-[var(--border-soft)] dark:border-[#2F2952]">
                                            {Array.from({ length: 28 }).map((_, barIdx) => {
                                                const barPct = (barIdx / 28) * 100;
                                                const hasPlayed = barPct <= progressPct;
                                                // Dynamic pseudo-waveform pattern
                                                const patternHeights = [40, 65, 85, 50, 100, 75, 45, 90, 60, 30, 70, 95, 55, 80, 45, 60, 90, 100, 70, 40, 85, 60, 50, 75, 90, 40, 65, 50];
                                                const baseH = patternHeights[barIdx % patternHeights.length];
                                                const currentH = isPlaying
                                                    ? Math.max(20, Math.min(100, baseH + Math.sin(currentTime * 5 + barIdx) * 20))
                                                    : baseH * 0.6;

                                                return (
                                                    <span
                                                        key={barIdx}
                                                        onClick={() => seekTo((barIdx / 28) * totalDuration, isPlaying)}
                                                        style={{ height: `${currentH}%` }}
                                                        className={`flex-1 rounded-full transition-all duration-150 cursor-pointer ${
                                                            hasPlayed
                                                                ? "bg-gradient-to-t from-[var(--purple-primary)] to-[#9B8CFF]"
                                                                : "bg-[var(--border-soft)] dark:bg-[#342D5A] hover:bg-[var(--purple-soft)]"
                                                        }`}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── 3. SPEAKER-COLORED TIMELINE SCRUBBER ── */}
                    <div className="space-y-1.5 pt-1">
                        <div
                            ref={timelineRef}
                            onClick={handleTimelineClick}
                            onMouseMove={handleTimelineMouseMove}
                            onMouseLeave={() => setScrubHoverTime(null)}
                            className="relative h-3 w-full rounded-full cursor-pointer bg-[var(--purple-subtle)] dark:bg-[#252042] border border-[var(--border-soft)] dark:border-[#352E5E] overflow-visible group"
                            title="Click or drag to seek"
                        >
                            {/* Proportional Speaker Segments */}
                            <div className="absolute inset-0 rounded-full overflow-hidden flex">
                                {normalizedSegments.map((seg, idx) => {
                                    const widthPct = (seg.duration / totalDuration) * 100;
                                    const col = getSpeakerColor(seg.speaker, idx);
                                    return (
                                        <div
                                            key={seg.id}
                                            style={{ width: `${widthPct}%` }}
                                            className={`h-full ${col.barBg} opacity-85 hover:opacity-100 transition-opacity border-r border-white/20`}
                                            title={`${seg.speaker} (${formatTime(seg.start)} - ${formatTime(seg.end)})`}
                                        />
                                    );
                                })}
                            </div>

                            {/* Played Progress Overlay Filter */}
                            <div
                                style={{ width: `${progressPct}%` }}
                                className="absolute inset-y-0 left-0 bg-white/20 dark:bg-white/15 pointer-events-none rounded-l-full"
                            />

                            {/* Scrubber Playhead Handle */}
                            <div
                                style={{ left: `${progressPct}%` }}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#F3F2FA] border-2 border-[var(--purple-primary)] shadow-md group-hover:scale-125 transition-transform pointer-events-none z-20"
                            />

                            {/* Hover Time Tooltip */}
                            {scrubHoverTime !== null && (
                                <div
                                    style={{ left: `${scrubHoverPos}px` }}
                                    className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#1C1A30] text-white text-[10px] font-bold shadow-md pointer-events-none z-30 whitespace-nowrap"
                                >
                                    {formatTime(scrubHoverTime)}
                                </div>
                            )}
                        </div>

                        {/* Timestamp Labels */}
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] px-0.5">
                            <span className="text-[var(--text-primary)] font-mono">{formatTime(currentTime)}</span>
                            <span className="font-mono">{formatTime(totalDuration)}</span>
                        </div>
                    </div>

                    {/* ── 4. MAIN CONTROLS BAR (Volume, Speed, Rewind, Play, Forward, Jump) ── */}
                    <div className="flex items-center justify-between bg-white dark:bg-[#1A172E] p-2.5 rounded-2xl border border-[var(--border-soft)] dark:border-[#2C274A] shadow-xs">
                        {/* Volume Control */}
                        <div className="flex items-center gap-1.5 group">
                            <button
                                onClick={toggleMute}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252042] transition-colors cursor-pointer"
                                title={isMuted ? "Unmute" : "Mute"}
                            >
                                {isMuted || volume === 0 ? (
                                    <VolumeX className="w-4 h-4 text-[var(--pink-primary)]" />
                                ) : (
                                    <Volume2 className="w-4 h-4" />
                                )}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-14 sm:w-16 h-1.5 rounded-lg appearance-none bg-[var(--border-soft)] dark:bg-[#342D5A] accent-[var(--purple-primary)] cursor-pointer"
                                title="Volume"
                            />
                        </div>

                        {/* Center Transport: -15s, Big Play, +15s */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleSkip(-15)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--purple-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252042] transition-colors cursor-pointer"
                                title="Rewind 15 seconds"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>

                            <button
                                onClick={togglePlay}
                                className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#6656C7] to-[#8E7EFF] hover:from-[#5A4AB8] hover:to-[#8272F2] text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                title={isPlaying ? "Pause" : "Play"}
                            >
                                {isPlaying ? (
                                    <Pause className="w-5 h-5 fill-current" />
                                ) : (
                                    <Play className="w-5 h-5 fill-current ml-0.5" />
                                )}
                            </button>

                            <button
                                onClick={() => handleSkip(15)}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--purple-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252042] transition-colors cursor-pointer"
                                title="Forward 15 seconds"
                            >
                                <RotateCw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Playback Speed Switcher */}
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={cycleSpeed}
                                className="px-2.5 py-1 text-xs font-bold rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252042] text-[var(--purple-primary)] dark:text-[#A79AF4] border border-[var(--border-soft)] dark:border-[#352E5E] hover:border-[var(--purple-primary)] transition-all cursor-pointer"
                                title="Change playback speed"
                            >
                                {playbackRate}×
                            </button>
                        </div>
                    </div>

                    {/* ── 5. QUICK JUMP ACTIONS (Requirement 9) ── */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                            <Sparkles className="w-3 h-3 text-[var(--purple-primary)] dark:text-[#A79AF4]" />
                            <span>Jump to Key Moments</span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                            {jumpTargets.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => seekTo(item.time, true)}
                                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-xl bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] text-[var(--text-secondary)] hover:text-[var(--purple-primary)] hover:border-[var(--purple-primary)] hover:bg-[var(--purple-bg)] transition-all cursor-pointer shadow-2xs"
                                >
                                    <Clock className="w-2.5 h-2.5 text-[var(--text-muted)]" />
                                    <span>{item.label}</span>
                                    <span className="text-[10px] text-[var(--purple-primary)] dark:text-[#A79AF4] font-mono ml-0.5">
                                        {formatTime(item.time)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── 6. LIVE SYNCHRONIZED TRANSCRIPT BOX (Requirement 10) ── */}
                    {activeSegment && (
                        <div className="rounded-2xl p-3.5 bg-white dark:bg-[#1A172E] border border-[var(--border-soft)] dark:border-[#2D2A4A] space-y-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-lg ${activeColor.avatarBg} ${activeColor.avatarText} flex items-center justify-center font-bold text-xs`}>
                                        {activeSegment.speaker.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={`text-xs font-bold ${activeColor.nameColor}`}>
                                        {activeSegment.speaker}
                                    </span>
                                </div>
                                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--purple-subtle)] dark:bg-[#252042] px-2 py-0.5 rounded-md">
                                    {formatTime(activeSegment.start)} - {formatTime(activeSegment.end)}
                                </span>
                            </div>

                            {/* Active sentence emphasized with soft purple background */}
                            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium p-2.5 rounded-xl bg-[var(--purple-bg)] dark:bg-[#2C2448] border border-[var(--purple-soft)] dark:border-[#4B3F7E]">
                                "{activeSegment.text}"
                            </p>

                            {/* Context snippets: Next sentence preview */}
                            {nextSegment && (
                                <p
                                    onClick={() => seekTo(nextSegment.start, true)}
                                    className="text-[11px] text-[var(--text-muted)] opacity-60 hover:opacity-100 transition-opacity truncate cursor-pointer pl-1"
                                    title="Click to jump to next line"
                                >
                                    <span className="font-semibold text-[var(--text-secondary)]">{nextSegment.speaker}:</span> {nextSegment.text}
                                </p>
                            )}
                        </div>
                    )}

                    {/* ── 7. DRAWER BOTTOM TABS (Requirement 8 & Image) ── */}
                    <div className="space-y-3 pt-1">
                        {/* Tab Selector Buttons */}
                        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-white dark:bg-[#1A172E] border border-[var(--border-soft)] dark:border-[#2D2A4A]">
                            {[
                                { id: "transcript" as DrawerTab, label: "Transcript", icon: MessageSquare },
                                { id: "speakers" as DrawerTab, label: "Speakers", icon: Users },
                                { id: "topics" as DrawerTab, label: "Topics", icon: Sparkles },
                                { id: "filters" as DrawerTab, label: "AI Insights", icon: AlertTriangle },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isCurrent = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                            isCurrent
                                                ? "bg-[var(--purple-primary)] text-white shadow-xs"
                                                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252042]"
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* TAB 1: FULL TRANSCRIPT */}
                        {activeTab === "transcript" && (
                            <div className="space-y-2.5">
                                {/* Search input inside transcript */}
                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                    <input
                                        type="text"
                                        placeholder="Search transcript dialogue..."
                                        value={transcriptSearch}
                                        onChange={(e) => setTranscriptSearch(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:border-[var(--purple-primary)] outline-none"
                                    />
                                </div>

                                {/* Chronological Messages List */}
                                <div className="relative">
                                    <div
                                        ref={transcriptListRef}
                                        onScroll={handleTranscriptScroll}
                                        className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-1"
                                    >
                                    {filteredSegments.map((seg, idx) => {
                                        const isSegmentActive = activeSegment?.id === seg.id;
                                        const col = getSpeakerColor(seg.speaker, idx);

                                        return (
                                            <div
                                                key={seg.id}
                                                ref={(el) => {
                                                    segmentRefs.current[seg.id] = el;
                                                }}
                                                onClick={() => seekTo(seg.start, true)}
                                                className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                                                    isSegmentActive
                                                        ? "bg-[var(--purple-bg)] dark:bg-[#2C2448] border-[var(--purple-primary)] shadow-xs ring-1 ring-[var(--purple-primary)]/40"
                                                        : "bg-white dark:bg-[#1C1A30] border-[var(--border-soft)] dark:border-[#2B2748] hover:border-[var(--purple-light)]"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between pb-1">
                                                    <span className={`font-bold ${col.nameColor}`}>
                                                        {seg.speaker}
                                                    </span>
                                                    <span className="font-mono text-[10px] text-[var(--text-muted)]">
                                                        {formatTime(seg.start)}
                                                    </span>
                                                </div>
                                                <p className="text-[var(--text-secondary)] leading-relaxed">
                                                    {seg.text}
                                                </p>
                                            </div>
                                        );
                                    })}
                                    </div>
                                    {/* Floating "Jump to current" button — appears when user scrolls away */}
                                    {userScrolledAway && isPlaying && (
                                        <button
                                            onClick={handleJumpToCurrent}
                                            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-full bg-[var(--purple-primary)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all animate-bounce-slow cursor-pointer"
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                            Jump to current
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* TAB 2: SPEAKERS (Matching User Reference Image Design) */}
                        {activeTab === "speakers" && (
                            <div className="space-y-2">
                                {/* Aurora keyframes + dark mode card styles */}
                                <style>{`
                                    @keyframes aurora-move {
                                        0%   { transform: translate(-60%, -60%) scale(1); }
                                        30%  { transform: translate(10%, -40%) scale(1.15); }
                                        60%  { transform: translate(20%, 20%) scale(1.05); }
                                        80%  { transform: translate(-40%, 10%) scale(1.2); }
                                        100% { transform: translate(-60%, -60%) scale(1); }
                                    }
                                    .aurora-card-outer {
                                        background: rgba(255, 255, 255, 0.22);
                                        border: 1px solid rgba(255, 255, 255, 0.35);
                                        box-shadow: 12px 12px 30px rgba(0,0,0,0.08), -8px -8px 25px rgba(255,255,255,0.45);
                                    }
                                    .dark .aurora-card-outer {
                                        background: rgba(30, 25, 55, 0.55);
                                        border: 1px solid rgba(80, 70, 130, 0.35);
                                        box-shadow: 12px 12px 30px rgba(0,0,0,0.25), -8px -8px 25px rgba(60,50,100,0.15);
                                    }
                                    .aurora-card-outer.aurora-active {
                                        box-shadow: 12px 12px 30px rgba(0,0,0,0.10), -8px -8px 25px rgba(255,255,255,0.45);
                                    }
                                    .dark .aurora-card-outer.aurora-active {
                                        box-shadow: 12px 12px 30px rgba(0,0,0,0.30), -8px -8px 25px rgba(60,50,100,0.20);
                                    }
                                    .aurora-card-inner {
                                        background: linear-gradient(145deg, rgba(255,255,255,0.82), rgba(245,245,245,0.55));
                                        border: 1px solid rgba(255,255,255,0.6);
                                    }
                                    .dark .aurora-card-inner {
                                        background: linear-gradient(145deg, rgba(30,27,46,0.85), rgba(25,22,42,0.65));
                                        border: 1px solid rgba(80,70,130,0.3);
                                    }
                                `}</style>

                                {/* Header Row */}
                                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)] px-3 py-1">
                                    <span>Participants ({participantStats.length})</span>
                                    <div className="flex items-center gap-6">
                                        <span>WPM</span>
                                        <span>Talk time</span>
                                        <span>Talk %</span>
                                    </div>
                                </div>

                                {/* Participant Glassmorphism Aurora Cards */}
                                <div className="space-y-2.5">
                                    {participantStats.map((item, idx) => {
                                        const isSpeakerTalking = activeSegment?.speaker.toLowerCase() === item.speaker.toLowerCase();
                                        const auroraColor = item.colorConfig.auroraHex;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => {
                                                    const firstSeg = normalizedSegments.find(
                                                        (s) => s.speaker.toLowerCase() === item.speaker.toLowerCase()
                                                    );
                                                    if (firstSeg) seekTo(firstSeg.start, true);
                                                }}
                                                className={`aurora-card-outer relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-400 select-none ${
                                                    isSpeakerTalking
                                                        ? "aurora-active shadow-lg scale-[1.02]"
                                                        : "hover:-translate-y-1 hover:shadow-lg"
                                                }`}
                                                style={{
                                                    backdropFilter: "blur(25px)",
                                                    ...(isSpeakerTalking ? {
                                                        borderColor: item.colorConfig.hex,
                                                        borderWidth: "1.5px",
                                                        boxShadow: `0 0 20px ${auroraColor}33`,
                                                    } : {}),
                                                }}
                                                title={`Click to jump to ${item.speaker}'s dialogue`}
                                            >
                                                {/* Animated Aurora Blob */}
                                                <div
                                                    style={{
                                                        position: "absolute",
                                                        top: "50%",
                                                        left: "50%",
                                                        width: isSpeakerTalking ? "120px" : "90px",
                                                        height: isSpeakerTalking ? "120px" : "90px",
                                                        borderRadius: "50%",
                                                        filter: "blur(24px)",
                                                        zIndex: 1,
                                                        background: `radial-gradient(circle, ${auroraColor}D9, ${auroraColor}66, transparent)`,
                                                        animation: `aurora-move 6.5s infinite ease-in-out`,
                                                        animationDelay: `${idx * -1.5}s`,
                                                        opacity: isSpeakerTalking ? 0.95 : 0.55,
                                                        transition: "width 0.4s, height 0.4s, opacity 0.4s",
                                                    }}
                                                />

                                                {/* Inner Glow Panel (frosted content layer) */}
                                                <div
                                                    className="aurora-card-inner relative z-[2] flex items-center justify-between gap-3 p-2.5"
                                                    style={{
                                                        margin: "4px",
                                                        borderRadius: "14px",
                                                        backdropFilter: "blur(25px)",
                                                    }}
                                                >
                                                    {/* Left: Avatar & Name */}
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        <div className={`w-9 h-9 rounded-xl ${item.colorConfig.avatarBg} ${item.colorConfig.avatarText} border ${item.colorConfig.border} flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-sm`}>
                                                            {speakerPhotos[item.speaker] ? (
                                                                <img
                                                                    src={speakerPhotos[item.speaker]}
                                                                    alt={item.speaker}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                item.speaker.charAt(0).toUpperCase()
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs font-bold truncate ${item.colorConfig.nameColor}`}>
                                                                {item.speaker}
                                                            </p>
                                                            <p className="text-[10px] text-[var(--text-muted)] truncate">
                                                                {item.talkTimeFormatted} · {item.talkPct}% speaking
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Right: WPM, Talk time, Talk % Bar */}
                                                    <div className="flex items-center gap-4 shrink-0 text-right">
                                                        <span className="text-xs font-semibold text-[var(--text-secondary)] w-10">
                                                            {item.wpm}
                                                        </span>
                                                        <span className="text-xs font-semibold text-[var(--text-secondary)] w-14">
                                                            {item.talkTimeFormatted}
                                                        </span>
                                                        <div className="w-20 space-y-1">
                                                            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)]">
                                                                <span>{item.talkPct}%</span>
                                                            </div>
                                                            <div className="w-full h-1.5 rounded-full bg-white/60 overflow-hidden flex">
                                                                <div
                                                                    style={{ width: `${item.talkPct}%`, background: auroraColor }}
                                                                    className="h-full rounded-full transition-all duration-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TAB 3: TOPICS */}
                        {activeTab === "topics" && (
                            <div className="space-y-2">
                                {topics && topics.length > 0 ? (
                                    topics.map((t, idx) => {
                                        const startSec = parseTimestampToSeconds(t.timestamp) || 0;
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => seekTo(startSec, true)}
                                                className="p-3 rounded-xl bg-white dark:bg-[#1C1A30] border border-[var(--border-soft)] dark:border-[#2B2748] hover:border-[var(--purple-primary)] transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--purple-primary)] transition-colors truncate max-w-[280px]">
                                                        {t.title}
                                                    </span>
                                                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] dark:text-[#A79AF4]">
                                                        {t.timestamp}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                                                    {t.summary || t.content}
                                                </p>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-xs text-[var(--text-muted)] text-center py-6">
                                        No topics detected for this recording.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* TAB 4: AI FILTERS (Key Decisions & Risks) */}
                        {activeTab === "filters" && (
                            <div className="space-y-3">
                                {/* Key Decisions */}
                                <div className="space-y-1.5">
                                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--mint-text)]" />
                                        <span>Key Decisions</span>
                                    </span>
                                    {summary?.key_decisions && summary.key_decisions.length > 0 ? (
                                        summary.key_decisions.map((dec, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => seekTo(idx * 45, true)}
                                                className="p-2.5 rounded-xl bg-white dark:bg-[#1C1A30] border border-[var(--border-soft)] dark:border-[#2B2748] hover:border-[var(--purple-primary)] transition-all cursor-pointer text-xs text-[var(--text-secondary)] flex items-start gap-2"
                                            >
                                                <span className="text-[10px] font-mono text-[var(--mint-text)] bg-[var(--mint-bg)] px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                                                    {formatTime(idx * 45)}
                                                </span>
                                                <span className="leading-relaxed">{dec}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-[var(--text-muted)] italic pl-1">
                                            No explicit decisions captured yet.
                                        </p>
                                    )}
                                </div>

                                {/* Urgent Risks & Deadlines */}
                                <div className="space-y-1.5 pt-1">
                                    <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-[var(--pink-primary)]" />
                                        <span>Urgent Risks & Deadlines</span>
                                    </span>
                                    {riskAnalysis?.deadlines && riskAnalysis.deadlines.length > 0 ? (
                                        riskAnalysis.deadlines.map((risk, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => seekTo(idx * 60, true)}
                                                className="p-2.5 rounded-xl bg-white dark:bg-[#1C1A30] border border-[var(--border-soft)] dark:border-[#2B2748] hover:border-[var(--pink-primary)] transition-all cursor-pointer text-xs text-[var(--text-secondary)] flex items-start gap-2"
                                            >
                                                <span className="text-[10px] font-mono text-[var(--pink-primary)] bg-[var(--pink-soft)] px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                                                    {formatTime(idx * 60)}
                                                </span>
                                                <span className="leading-relaxed">{risk}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-xs text-[var(--text-muted)] italic pl-1">
                                            No critical risks flagged.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </aside>
    );
}
