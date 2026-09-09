"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
    Search,
    Download,
    Copy,
    Check,
    AlertCircle,
    CheckCircle2,
    Key,
    Play,
    Pause,
    RotateCcw,
    Volume2,
    VolumeX,
    AudioWaveform,
    Sparkles,
    FastForward,
    Rewind,
    ScrollText,
    ArrowDown,
} from "lucide-react";
import type { RiskAnalysis, SpeakerSegment } from "@/types/meeting";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";

interface TranscriptViewProps {
    transcript: string;
    riskAnalysis?: RiskAnalysis;
    meetingTitle?: string;
    speakerPhotos?: Record<string, string>;
    audioUrl?: string;
    speakerSegments?: SpeakerSegment[];
    onSeekToTime?: (seconds: number) => void;
}

interface MessageEntry {
    id: number;
    speaker: string;
    timestamp: string;
    startSeconds: number;
    endSeconds: number;
    text: string;
    highlights: { type: "decision" | "risk" | "action"; text: string }[];
}

const SPEAKER_PALETTES = [
    {
        avatarBg: "bg-[#E9E6FA] dark:bg-[#332B56]",
        avatarText: "text-[#6656C7] dark:text-[#A79AF4]",
        border: "border-[#D9D4F4] dark:border-[#4B3F7E]",
        badgeBg: "bg-[#F4F2FC] dark:bg-[#2C2448]",
        nameColor: "text-[#6656C7] dark:text-[#A79AF4]",
    },
    {
        avatarBg: "bg-[#DDE7FA] dark:bg-[#203354]",
        avatarText: "text-[#3D6AB5] dark:text-[#7EB0F7]",
        border: "border-[#C5D7F8] dark:border-[#2C4875]",
        badgeBg: "bg-[#F0F5FD] dark:bg-[#1A2942]",
        nameColor: "text-[#3D6AB5] dark:text-[#7EB0F7]",
    },
    {
        avatarBg: "bg-[#DDF4EB] dark:bg-[#1C4135]",
        avatarText: "text-[#238561] dark:text-[#52D2A2]",
        border: "border-[#BEEBD8] dark:border-[#245C4B]",
        badgeBg: "bg-[#F2FAF6] dark:bg-[#163329]",
        nameColor: "text-[#238561] dark:text-[#52D2A2]",
    },
    {
        avatarBg: "bg-[#FDE8EE] dark:bg-[#4E2231]",
        avatarText: "text-[#C8466E] dark:text-[#F37B9F]",
        border: "border-[#F8CAD7] dark:border-[#6C2B42]",
        badgeBg: "bg-[#FCF2F5] dark:bg-[#3B1A25]",
        nameColor: "text-[#C8466E] dark:text-[#F37B9F]",
    },
    {
        avatarBg: "bg-[#FEF3D6] dark:bg-[#4A3B19]",
        avatarText: "text-[#B45309] dark:text-[#FBBF24]",
        border: "border-[#FDE68A] dark:border-[#6A5323]",
        badgeBg: "bg-[#FFFBEB] dark:bg-[#382C13]",
        nameColor: "text-[#B45309] dark:text-[#FBBF24]",
    },
    {
        avatarBg: "bg-[#E0F2FE] dark:bg-[#1B3B52]",
        avatarText: "text-[#0369A1] dark:text-[#38BDF8]",
        border: "border-[#BAE6FD] dark:border-[#235070]",
        badgeBg: "bg-[#F0F9FF] dark:bg-[#142A3B]",
        nameColor: "text-[#0369A1] dark:text-[#38BDF8]",
    },
];

function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m < 10 ? "0" + m : m}:${s < 10 ? "0" + s : s}`;
}

function parseTimestampToSeconds(str: string): number | null {
    if (!str) return null;
    const clean = str.trim();
    const parts = clean.split(":").map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return null;
}

export default function TranscriptView({
    transcript,
    riskAnalysis,
    meetingTitle = "Meeting Transcript",
    speakerPhotos = {},
    audioUrl = "/audio/meeting_sample.mp3",
    speakerSegments = [],
    onSeekToTime,
}: TranscriptViewProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSpeaker, setSelectedSpeaker] = useState<string>("all");
    const [copied, setCopied] = useState(false);

    // Real audio player state
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const msgRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [activeMsgId, setActiveMsgId] = useState<number | null>(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const isProgrammaticScroll = useRef(false);
    const [userScrolledAway, setUserScrolledAway] = useState(false);
    const transcriptContainerRef = useRef<HTMLDivElement | null>(null);

    // Parse transcript into chronological conversation entries with accurate start & end seconds
    const parsedMessages = useMemo(() => {
        if (!transcript) return [];
        const lines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
        const entries: MessageEntry[] = [];
        let currentSpeaker = "Speaker 1";
        let speakerIndexMap: Record<string, number> = {};
        let nextIndex = 0;

        lines.forEach((line, i) => {
            const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);
            let speaker = currentSpeaker;
            let content = line;
            let timeStr = "";
            let explicitSeconds: number | null = null;

            if (speakerMatch) {
                const rawSpeaker = speakerMatch[1].trim();
                content = speakerMatch[2].trim();

                const timeMatch = rawSpeaker.match(/^(.*?)\s*[\(\[]?(\d{1,2}:\d{2}(?::\d{2})?)[\)\]]?$/);
                if (timeMatch && timeMatch[1].trim()) {
                    speaker = timeMatch[1].trim();
                    timeStr = timeMatch[2];
                    explicitSeconds = parseTimestampToSeconds(timeMatch[2]);
                } else {
                    speaker = rawSpeaker;
                }
                currentSpeaker = speaker;
            }

            if (!(speaker in speakerIndexMap)) {
                speakerIndexMap[speaker] = nextIndex++;
            }

            // Match speaker segments if provided
            let segStart: number | undefined;
            let segEnd: number | undefined;
            if (speakerSegments && speakerSegments[i]) {
                segStart = speakerSegments[i].start;
                segEnd = speakerSegments[i].end;
            }

            const startSec =
                typeof segStart === "number"
                    ? segStart
                    : explicitSeconds !== null
                    ? explicitSeconds
                    : i * 20;

            const endSec =
                typeof segEnd === "number"
                    ? segEnd
                    : startSec + 15;

            if (!timeStr) {
                timeStr = formatTime(startSec);
            }

            // Detect highlight triggers within line
            const highlights: { type: "decision" | "risk" | "action"; text: string }[] = [];
            const lower = content.toLowerCase();

            if (lower.includes("decided") || lower.includes("agreed") || lower.includes("record 1") || lower.includes("concluded")) {
                highlights.push({ type: "decision", text: "Decision" });
            }
            if (lower.includes("budget") || lower.includes("risk") || lower.includes("permeability") || lower.includes("gamma ray") || lower.includes("doubt")) {
                highlights.push({ type: "risk", text: "Risk / Follow-up" });
            }
            if (lower.includes("will") || lower.includes("need to") || lower.includes("simulate") || lower.includes("please") || lower.includes("engineer")) {
                highlights.push({ type: "action", text: "Action Item" });
            }

            entries.push({
                id: i,
                speaker,
                timestamp: timeStr,
                startSeconds: startSec,
                endSeconds: endSec,
                text: content,
                highlights,
            });
        });

        // Ensure contiguous boundaries between segments
        for (let i = 0; i < entries.length; i++) {
            if (i < entries.length - 1) {
                const nextStart = entries[i + 1].startSeconds;
                if (nextStart > entries[i].startSeconds && (!speakerSegments?.[i]?.end || entries[i].endSeconds <= entries[i].startSeconds)) {
                    entries[i].endSeconds = nextStart;
                }
            }
        }

        return entries;
    }, [transcript, speakerSegments]);

    // Unique speakers for the filter dropdown
    const allSpeakers = useMemo(() => {
        return Array.from(new Set(parsedMessages.map((m) => m.speaker)));
    }, [parsedMessages]);

    // Build stable speaker-to-color mapping based on unique speaker identity
    const speakerColorMap = useMemo(() => {
        const map: Record<string, number> = {};
        let idx = 0;
        parsedMessages.forEach((m) => {
            const clean = m.speaker.trim();
            if (!(clean in map)) {
                map[clean] = idx++;
            }
        });
        return map;
    }, [parsedMessages]);

    const getSpeakerColor = (speakerName: string) => {
        const clean = speakerName.trim();
        const colorIdx = speakerColorMap[clean] ?? 0;
        return SPEAKER_PALETTES[colorIdx % SPEAKER_PALETTES.length];
    };

    // Filter by search and speaker
    const filteredMessages = useMemo(() => {
        return parsedMessages.filter((msg) => {
            const matchesSearch =
                !searchTerm.trim() ||
                msg.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
                msg.speaker.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSpeaker =
                selectedSpeaker === "all" || msg.speaker === selectedSpeaker;
            return matchesSearch && matchesSpeaker;
        });
    }, [parsedMessages, searchTerm, selectedSpeaker]);

    // Find active dialogue message matching current playback second
    const findActiveMessage = useCallback(
        (timeSec: number) => {
            if (parsedMessages.length === 0) return null;

            for (let i = 0; i < parsedMessages.length; i++) {
                const msg = parsedMessages[i];
                const nextMsg = parsedMessages[i + 1];
                const segEnd = nextMsg
                    ? nextMsg.startSeconds
                    : Math.max(msg.endSeconds, duration || msg.startSeconds + 15);

                if (timeSec >= msg.startSeconds && timeSec < segEnd) {
                    return msg.id;
                }
            }

            if (timeSec >= parsedMessages[parsedMessages.length - 1].startSeconds) {
                return parsedMessages[parsedMessages.length - 1].id;
            }

            return parsedMessages[0].id;
        },
        [parsedMessages, duration]
    );

    // Audio event listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onTimeUpdate = () => {
            const cur = audio.currentTime;
            setCurrentTime(cur);

            const activeId = findActiveMessage(cur);
            setActiveMsgId(activeId);

            if (autoScroll && activeId !== null) {
                const el = msgRefs.current[activeId];
                if (el) {
                    isProgrammaticScroll.current = true;
                    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                    setTimeout(() => {
                        isProgrammaticScroll.current = false;
                    }, 400);
                }
            }
        };

        const onLoadedMetadata = () => {
            if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
                setDuration(audio.duration);
            } else if (parsedMessages.length > 0) {
                const last = parsedMessages[parsedMessages.length - 1];
                setDuration(Math.max(last.endSeconds, 271));
            }
        };

        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onEnded = () => {
            setIsPlaying(false);
            setActiveMsgId(null);
        };

        audio.addEventListener("timeupdate", onTimeUpdate);
        audio.addEventListener("loadedmetadata", onLoadedMetadata);
        audio.addEventListener("durationchange", onLoadedMetadata);
        audio.addEventListener("play", onPlay);
        audio.addEventListener("pause", onPause);
        audio.addEventListener("ended", onEnded);

        return () => {
            audio.removeEventListener("timeupdate", onTimeUpdate);
            audio.removeEventListener("loadedmetadata", onLoadedMetadata);
            audio.removeEventListener("durationchange", onLoadedMetadata);
            audio.removeEventListener("play", onPlay);
            audio.removeEventListener("pause", onPause);
            audio.removeEventListener("ended", onEnded);
        };
    }, [findActiveMessage, autoScroll, parsedMessages]);

    // Handle source URL change
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
            setIsPlaying(false);
            setCurrentTime(0);
            setActiveMsgId(null);
        }
    }, [audioUrl]);

    // Detect user manual scroll on transcript container — disables autoScroll
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
        if (activeMsgId !== null) {
            const el = msgRefs.current[activeMsgId];
            if (el) {
                isProgrammaticScroll.current = true;
                el.scrollIntoView({ behavior: "smooth", block: "nearest" });
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, 400);
            }
        }
    }, [activeMsgId]);

    // Progress percentage
    const playbackProgress = useMemo(() => {
        if (!duration || duration <= 0) return 0;
        return Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
    }, [currentTime, duration]);

    // Controls
    const handleTogglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            if (audioRef.current.currentTime >= duration - 0.5 && duration > 0) {
                audioRef.current.currentTime = 0;
            }
            audioRef.current.play().catch((err) => {
                console.warn("Audio playback error:", err);
            });
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const targetSec = parseFloat(e.target.value);
        setCurrentTime(targetSec);
        if (audioRef.current) {
            audioRef.current.currentTime = targetSec;
        }
        const activeId = findActiveMessage(targetSec);
        setActiveMsgId(activeId);
    };

    const handleSkip = (deltaSec: number) => {
        if (!audioRef.current) return;
        const target = Math.max(0, Math.min(duration || 1000, audioRef.current.currentTime + deltaSec));
        audioRef.current.currentTime = target;
        setCurrentTime(target);
    };

    const handleResetPlay = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        setCurrentTime(0);
        setIsPlaying(false);
        setActiveMsgId(null);
    };

    const handlePlaySingle = (msgId: number) => {
        const msg = parsedMessages.find((m) => m.id === msgId);
        if (!msg) return;

        if (onSeekToTime) {
            onSeekToTime(msg.startSeconds);
            return;
        }

        if (!audioRef.current) return;

        if (activeMsgId === msgId && isPlaying) {
            audioRef.current.pause();
            return;
        }

        audioRef.current.currentTime = msg.startSeconds;
        setCurrentTime(msg.startSeconds);
        setActiveMsgId(msgId);
        audioRef.current.play().catch((err) => {
            console.warn("Audio play error:", err);
        });
    };

    const handleSpeedToggle = () => {
        const speeds = [1, 1.25, 1.5, 2];
        const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
        const nextSpeed = speeds[nextIdx];
        setPlaybackRate(nextSpeed);
        if (audioRef.current) {
            audioRef.current.playbackRate = nextSpeed;
        }
    };

    const handleToggleMute = () => {
        if (!audioRef.current) return;
        const nextMute = !isMuted;
        setIsMuted(nextMute);
        audioRef.current.muted = nextMute;
    };

    // Copy entire transcript
    const handleCopy = () => {
        navigator.clipboard.writeText(transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Download as TXT
    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([transcript], { type: "text/plain" });
        element.href = URL.createObjectURL(file);
        element.download = `${meetingTitle.replace(/\s+/g, "_")}_transcript.txt`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    // Currently speaking message details
    const activeMessage = activeMsgId !== null ? parsedMessages.find((m) => m.id === activeMsgId) : null;

    // Loading State
    if (!transcript) {
        return (
            <div className="soft-card p-12 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] text-center max-w-md mx-auto space-y-5 shadow-[0_8px_30px_rgba(102,86,199,0.06)]">
                <AnimatedCircularProgressBar
                    max={100}
                    min={0}
                    value={70}
                    gaugePrimaryColor="var(--purple-primary, #6656C7)"
                    gaugeSecondaryColor="var(--purple-bg, #E9E6FA)"
                    className="size-36 mx-auto text-2xl font-bold text-[var(--purple-primary)]"
                />
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                        Loading Transcript...
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                        Aligning audio timestamps and speaker turns
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 w-full">
            {/* Hidden HTML5 audio element playing real meeting recording */}
            <audio
                ref={audioRef}
                src={audioUrl}
                preload="metadata"
                className="hidden"
            />

            {/* Audio Playback & Real-time Synchronization Dashboard */}
            <div className="soft-card p-5 sm:p-6 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] space-y-4 shadow-[0_4px_20px_rgba(102,86,199,0.05)] transition-colors">
                {/* Top Row: Track Information & Circular Progress */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-[260px] flex-1">
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner transition-colors ${
                                isPlaying
                                    ? "bg-[var(--purple-primary)] text-white shadow-[0_0_15px_rgba(102,86,199,0.35)]"
                                    : "bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] dark:text-[#A79AF4]"
                            }`}
                        >
                            <AudioWaveform className={`w-6 h-6 ${isPlaying ? "animate-pulse" : ""} stroke-[2]`} />
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Original Meeting Audio
                                </h3>
                                <span
                                    className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                        isPlaying
                                            ? "bg-[var(--mint-soft)] dark:bg-[#163329] text-[var(--mint-text)] dark:text-[#52D2A2]"
                                            : "bg-[var(--purple-subtle)] dark:bg-[#252238] text-[var(--text-muted)]"
                                    }`}
                                >
                                    {isPlaying && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
                                    {isPlaying ? "PACING AUDIO SYNC" : "READY"}
                                </span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] truncate max-w-[340px] sm:max-w-md">
                                {activeMessage ? (
                                    <span className="font-medium text-[var(--text-primary)]">
                                        Speaking: <strong className="text-[var(--purple-primary)] dark:text-[#A79AF4]">{activeMessage.speaker}</strong> ({activeMessage.timestamp})
                                    </span>
                                ) : (
                                    "Playing real audio recording synced with transcript lines"
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Magic UI Animated Circular Progress Bar */}
                    <div className="flex items-center gap-3 pl-3 border-l border-[var(--border-subtle)] dark:border-[#2D2A4A]">
                        <div className="text-right hidden sm:block">
                            <p className="text-[11px] font-bold text-[var(--text-primary)]">
                                Meeting Coverage
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] font-mono">
                                {activeMsgId !== null ? `Segment ${activeMsgId + 1} / ${parsedMessages.length}` : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                            </p>
                        </div>
                        <AnimatedCircularProgressBar
                            max={100}
                            min={0}
                            value={playbackProgress}
                            gaugePrimaryColor="var(--purple-primary, #6656C7)"
                            gaugeSecondaryColor="var(--purple-bg, #E9E6FA)"
                            className="size-14 text-xs font-bold text-[var(--purple-primary)] dark:text-[#A79AF4]"
                        />
                    </div>
                </div>

                {/* Middle Row: Interactive Audio Scrubber Timeline */}
                <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] px-0.5">
                        <span className="font-bold text-[var(--text-primary)]">{formatTime(currentTime)}</span>
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-placeholder)]">
                            {activeMessage ? activeMessage.speaker : "Timeline Scrubber"}
                        </span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    <div className="relative flex items-center group">
                        <input
                            type="range"
                            min={0}
                            max={duration > 0 ? duration : 100}
                            step={0.1}
                            value={currentTime}
                            onChange={handleSeek}
                            aria-label="Seek audio position"
                            className="w-full h-2 bg-[var(--purple-subtle)] dark:bg-[#252238] rounded-lg appearance-none cursor-pointer accent-[var(--purple-primary)] hover:accent-[var(--purple-dark)] transition-all"
                            style={{
                                background: `linear-gradient(to right, var(--purple-primary, #6656C7) ${playbackProgress}%, var(--purple-subtle, #F4F2FC) ${playbackProgress}%)`,
                            }}
                        />
                    </div>
                </div>

                {/* Bottom Row: Player Action Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[var(--border-subtle)] dark:border-[#2D2A4A]/60">
                    <div className="flex items-center gap-2">
                        {/* Skip Backward 5s */}
                        <button
                            type="button"
                            onClick={() => handleSkip(-5)}
                            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252238] transition-colors"
                            title="Rewind 5 seconds"
                            aria-label="Rewind 5 seconds"
                        >
                            <Rewind className="w-4 h-4" />
                        </button>

                        {/* Play/Pause Button with Magic UI Shimmer Button */}
                        <ShimmerButton
                            onClick={handleTogglePlay}
                            className="!text-xs !py-2 !px-5 gap-2 shadow-sm font-semibold"
                            shimmerDuration="2.5s"
                        >
                            {isPlaying ? (
                                <>
                                    <Pause className="w-3.5 h-3.5 fill-current" />
                                    <span>Pause Audio</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    <span>{currentTime > 0 ? "Resume Audio" : "Play Audio"}</span>
                                </>
                            )}
                        </ShimmerButton>

                        {/* Skip Forward 5s */}
                        <button
                            type="button"
                            onClick={() => handleSkip(5)}
                            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252238] transition-colors"
                            title="Forward 5 seconds"
                            aria-label="Forward 5 seconds"
                        >
                            <FastForward className="w-4 h-4" />
                        </button>

                        {/* Reset / Restart */}
                        {currentTime > 0 && (
                            <button
                                type="button"
                                onClick={handleResetPlay}
                                className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252238] transition-colors"
                                title="Restart from beginning"
                                aria-label="Restart audio from beginning"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Speed Toggle */}
                        <button
                            type="button"
                            onClick={handleSpeedToggle}
                            className="text-xs font-bold font-mono px-2.5 py-1.5 rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252238] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-soft)] dark:border-[#2D2A4A] transition-colors"
                            title="Toggle playback speed"
                        >
                            {playbackRate}x
                        </button>

                        {/* Mute/Unmute */}
                        <button
                            type="button"
                            onClick={handleToggleMute}
                            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252238] transition-colors"
                            title={isMuted ? "Unmute" : "Mute"}
                            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
                        </button>

                        {/* Auto-scroll sync toggle */}
                        <button
                            type="button"
                            onClick={() => {
                                const next = !autoScroll;
                                setAutoScroll(next);
                                if (next) setUserScrolledAway(false);
                            }}
                            className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl border transition-colors ${
                                autoScroll
                                    ? "bg-[var(--purple-subtle)] dark:bg-[#252238] text-[var(--purple-primary)] dark:text-[#A79AF4] border-[var(--purple-light)] dark:border-[#4B3F7E]"
                                    : "text-[var(--text-muted)] border-transparent hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252238]"
                            }`}
                            title="Auto-scroll transcript as audio plays"
                        >
                            <ScrollText className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Auto-scroll</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="soft-card p-4 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] flex flex-wrap items-center justify-between gap-3.5 transition-colors">
                {/* Search */}
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-placeholder)]" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search dialogue, speaker, or topics..."
                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252238] border border-transparent focus:border-[var(--purple-light)] focus:bg-white dark:focus:bg-[#1E1B2E] text-[var(--text-primary)] placeholder-[var(--text-placeholder)] outline-none transition-all"
                    />
                </div>

                {/* Controls Group */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Speaker Filter */}
                    <div className="relative inline-flex items-center">
                        <select
                            value={selectedSpeaker}
                            onChange={(e) => setSelectedSpeaker(e.target.value)}
                            aria-label="Filter by speaker"
                            className="text-xs font-medium bg-[var(--purple-subtle)] dark:bg-[#252238] border border-[var(--border-soft)] dark:border-[#34314E] text-[var(--text-secondary)] rounded-xl px-3 py-2 pr-7 outline-none hover:bg-[var(--purple-bg)] dark:hover:bg-[#2C2448] transition-colors cursor-pointer"
                        >
                            <option value="all">All Speakers ({allSpeakers.length})</option>
                            {allSpeakers.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="btn-secondary !py-2 !px-3 !text-xs !rounded-xl"
                        title="Copy transcript to clipboard"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-[var(--mint-text)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                    </button>

                    {/* Download Button */}
                    <button
                        onClick={handleDownload}
                        className="btn-secondary !py-2 !px-3 !text-xs !rounded-xl"
                        title="Download transcript as text"
                    >
                        <Download className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* Legend / Info Bar */}
            <div className="flex items-center gap-4 px-2 text-[11px] text-[var(--text-muted)] font-medium flex-wrap">
                <span>Indicators:</span>
                <span className="inline-flex items-center gap-1.5 hl-decision">
                    <Key className="w-3 h-3 text-[#6656C7]" /> Decision
                </span>
                <span className="inline-flex items-center gap-1.5 hl-action">
                    <CheckCircle2 className="w-3 h-3 text-[#238561]" /> Action
                </span>
                <span className="inline-flex items-center gap-1.5 hl-risk">
                    <AlertCircle className="w-3 h-3 text-[#C8466E]" /> Follow-up / Risk
                </span>
            </div>

            {/* Chronological Synchronized Conversation Stream */}
            <div className="relative">
                <div
                    ref={transcriptContainerRef}
                    onScroll={handleTranscriptScroll}
                    className="soft-card p-6 sm:p-8 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] space-y-6 transition-colors max-h-[600px] overflow-y-auto"
                >
                {filteredMessages.length === 0 ? (
                    <div className="text-center py-12 text-[var(--text-muted)] text-sm">
                        No dialogue matched your search query.
                    </div>
                ) : (
                    filteredMessages.map((msg, idx) => {
                        const style = getSpeakerColor(msg.speaker);
                        const photo = speakerPhotos[msg.speaker] || speakerPhotos[msg.speaker.trim()];
                        const initials = msg.speaker
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();
                        const isCurrentActive = activeMsgId === msg.id;

                        return (
                            <div
                                key={msg.id}
                                ref={(el) => {
                                    msgRefs.current[msg.id] = el;
                                }}
                                className={`group rounded-2xl p-3 -mx-3 transition-all duration-300 ${
                                    isCurrentActive
                                        ? "bg-[var(--purple-subtle)]/90 dark:bg-[var(--purple-primary)]/15 ring-2 ring-[var(--purple-primary)] dark:ring-[#A79AF4] shadow-md"
                                        : ""
                                }`}
                            >
                                <div className="flex items-start gap-3.5">
                                    {/* Circular Speaker Avatar */}
                                    <div
                                        className={`w-9 h-9 rounded-full ${style.avatarBg} ${style.avatarText} border ${style.border} flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5 select-none overflow-hidden transition-transform ${
                                            isCurrentActive && isPlaying ? "scale-105 ring-2 ring-[var(--purple-primary)]" : ""
                                        }`}
                                    >
                                        {photo ? (
                                            <img
                                                src={photo}
                                                alt={msg.speaker}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            initials || "S"
                                        )}
                                    </div>

                                    {/* Message Body */}
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        {/* Header Row: Speaker name + Timestamp + Tag + Single Play Audio */}
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className={`text-xs font-bold ${style.nameColor}`}>
                                                {msg.speaker}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handlePlaySingle(msg.id)}
                                                className="text-[11px] text-[var(--text-placeholder)] hover:text-[var(--purple-primary)] hover:underline font-mono font-medium transition-colors cursor-pointer"
                                                title={`Seek to ${msg.timestamp}`}
                                            >
                                                {msg.timestamp}
                                            </button>

                                            {/* Active Speaking Indicator Badge */}
                                            {isCurrentActive && isPlaying && (
                                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--purple-primary)] text-white shadow-xs animate-pulse">
                                                    <Volume2 className="w-3 h-3" />
                                                    <span>Speaking now</span>
                                                </span>
                                            )}

                                            {/* Individual Audio Clip Play Button */}
                                            <button
                                                type="button"
                                                onClick={() => handlePlaySingle(msg.id)}
                                                className={`p-1 px-2 rounded-lg text-xs transition-colors flex items-center gap-1.5 ${
                                                    isCurrentActive && isPlaying
                                                        ? "text-[var(--purple-primary)] dark:text-[#A79AF4] bg-white dark:bg-[#252238] shadow-xs font-bold ring-1 ring-[var(--purple-primary)]/40"
                                                        : "text-[var(--text-placeholder)] hover:text-[var(--purple-primary)] hover:bg-white/80 dark:hover:bg-[#252238]"
                                                }`}
                                                title={`Listen to ${msg.speaker} from ${msg.timestamp}`}
                                                aria-label={`Listen to ${msg.speaker}'s dialogue from ${msg.timestamp}`}
                                            >
                                                {isCurrentActive && isPlaying ? (
                                                    <Pause className="w-3 h-3 fill-current" />
                                                ) : (
                                                    <Play className="w-3 h-3 fill-current" />
                                                )}
                                                <span className="text-[10px] font-medium">
                                                    {isCurrentActive && isPlaying ? "Pause" : "Listen"}
                                                </span>
                                            </button>

                                            {msg.highlights.map((h, i) => (
                                                <span
                                                    key={i}
                                                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                        h.type === "decision"
                                                            ? "hl-decision"
                                                            : h.type === "action"
                                                            ? "hl-action"
                                                            : "hl-risk"
                                                    }`}
                                                >
                                                    {h.text}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Content Bubble */}
                                        <div
                                            className={`p-3.5 rounded-2xl transition-colors text-sm text-[var(--text-secondary)] leading-relaxed font-normal ${
                                                isCurrentActive
                                                    ? "bg-white dark:bg-[#252238] border border-[var(--purple-light)] dark:border-[#4B3F7E] shadow-xs text-[var(--text-primary)]"
                                                    : "bg-[var(--purple-subtle)]/40 dark:bg-[#252238]/50 hover:bg-[var(--purple-subtle)]/70 dark:hover:bg-[#252238]/80 border border-transparent hover:border-[var(--border-subtle)]"
                                            }`}
                                        >
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>

                                {/* Subtle separator between messages */}
                                {idx < filteredMessages.length - 1 && (
                                    <div className="my-4 border-b border-[var(--border-subtle)]/60 dark:border-[#2D2A4A]/50" />
                                )}
                            </div>
                        );
                    })
                )}
                </div>
                {/* Floating "Jump to current" button — appears when user scrolls away during playback */}
                {userScrolledAway && isPlaying && (
                    <button
                        onClick={handleJumpToCurrent}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-[var(--purple-primary)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all cursor-pointer"
                    >
                        <ArrowDown className="w-3.5 h-3.5" />
                        Jump to current
                    </button>
                )}
            </div>
        </div>
    );
}
