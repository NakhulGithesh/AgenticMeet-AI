"use client";

import React, { useState, useCallback } from "react";
import {
    UploadCloud,
    FileAudio,
    ArrowRight,
    CheckCircle2,
    Sparkles,
    AlertCircle,
    Users,
    Key,
    X,
    AudioWaveform,
    Trash2,
    Calendar,
    Video,
    Clock,
    Folder,
    MoreHorizontal,
    Check,
    Globe,
    Bot,
    ChevronDown,
    Plus,
    ExternalLink,
} from "lucide-react";
import GlassCard from "./GlassCard";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";
import { AnimatedCircularProgressBar } from "@/registry/magicui/animated-circular-progress-bar";

interface RecentMeeting {
    id: string;
    title: string;
    date: string;
    duration: string;
    status: "Completed" | "Processing";
    iconColor?: "purple" | "pink" | "blue" | "mint";
    platform?: "teams" | "meet" | "zoom";
    category?: string;
    summaryText?: string;
    attendeeCount?: number;
    avatarUrls?: string[];
}

interface UploadZoneProps {
    onFileSelected: (file: File) => void;
    isUploading: boolean;
    onSelectRecentMeeting?: (meetingId: string) => void;
    onStartCapture?: (info: { meetingUrl: string; meetingName: string; meetingLang: string; botName: string }) => void;
    meetings?: Record<string, any>;
    onDeleteMeeting?: (meetingId: string) => void;
    onGoToCalendar?: () => void;
    onGoToMeetings?: () => void;
}

const SUPPORTED_EXTS = ["mp3", "wav", "mp4", "m4a", "mov", "webm", "mkv", "avi", "aac", "flac", "ogg"];

// Platform Brand Icons
function GoogleMeetIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <path d="M12 5v14l6-5-6-9z" fill="#00832d" />
            <path d="M6 16.5l6-3.5v-7L6 9.5v7z" fill="#0066da" />
            <path d="M2 8.5v7c0 1.1.9 2 2 2h2v-9H4c-1.1 0-2 .9-2 2z" fill="#e53935" />
            <path d="M18 14l4 3.5V6.5L18 10v4z" fill="#ffba00" />
        </svg>
    );
}

function ZoomIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
            <rect width="24" height="24" rx="6" fill="#2D8CFF" />
            <path d="M5 8.5C5 7.67 5.67 7 6.5 7h7c.83 0 1.5.67 1.5 1.5v7c0 .83-.67 1.5-1.5 1.5h-7A1.5 1.5 0 015 15.5v-7z" fill="white" />
            <path d="M16 10.2l3-2.2v8l-3-2.2v-3.6z" fill="white" />
        </svg>
    );
}

function TeamsIcon({ className = "w-4 h-4" }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" className={className} fill="none">
            <rect width="24" height="24" rx="6" fill="#5059C9" />
            <path d="M14.5 9a2 2 0 100-4 2 2 0 000 4zM16 11h-3a1 1 0 00-1 1v4h5v-4a1 1 0 00-1-1z" fill="white" opacity="0.8" />
            <path d="M9.5 8a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM11.5 10.5h-4A1.5 1.5 0 006 12v5h7v-5a1.5 1.5 0 00-1.5-1.5z" fill="white" />
        </svg>
    );
}

export default function UploadZone({
    onFileSelected,
    isUploading,
    onSelectRecentMeeting,
    onStartCapture,
    meetings,
    onDeleteMeeting,
    onGoToCalendar,
    onGoToMeetings,
}: UploadZoneProps) {
    // Mode switcher: "online" or "upload" (omits in-person per user instruction)
    const [activeTab, setActiveTab] = useState<"online" | "upload">("online");

    // Online meeting form state
    const [meetingUrl, setMeetingUrl] = useState("");
    const [meetingName, setMeetingName] = useState("");
    const [meetingLang, setMeetingLang] = useState("English");
    const [botName, setBotName] = useState("AgenticMeet Bot");
    const [comingSoon, setComingSoon] = useState(false);

    // File upload state
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Today's scheduled meetings toggles
    const [scheduledToggles, setScheduledToggles] = useState<Record<string, boolean>>({
        "prod-marketing": true,
        "user-research": true,
        "design-review": true,
    });

    // To-do checklist items state
    const [todos, setTodos] = useState([
        { id: 1, text: "Refine the chosen design and prepare for the prototyping stage", done: false },
        { id: 2, text: "Conduct a competitive analysis to inform the pricing model", done: false },
    ]);

    const handleToggleTodo = (id: number) => {
        setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    };

    const handleToggleSchedule = (id: string) => {
        setScheduledToggles(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Online meeting capture submit
    const handleStartCapturing = (e: React.FormEvent) => {
        e.preventDefault();
        setComingSoon(true);
        setTimeout(() => {
            setComingSoon(false);
        }, 3000);
    };

    // File upload drop handlers
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) setSelectedFile(file);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setSelectedFile(file);
    }, []);

    const handleUploadClick = () => {
        if (selectedFile) onFileSelected(selectedFile);
    };

    const ext = selectedFile?.name.split(".").pop()?.toLowerCase() || "";
    const isVideo = ["mp4", "mov", "webm", "mkv", "avi"].includes(ext) || !!selectedFile?.type?.startsWith("video/");
    const isValid = !!selectedFile && (
        SUPPORTED_EXTS.includes(ext) ||
        (selectedFile.type ? selectedFile.type.startsWith("audio/") || selectedFile.type.startsWith("video/") : false)
    );

    const avatarPresets = [
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
    ];

    // Map strictly over actual user meetings
    const userMeetingList = meetings ? Object.values(meetings) : [];
    const recentDisplayCards = userMeetingList.slice(0, 4).map((m: any, idx: number) => {
        const attendeeCount = m.result?.speaker_names?.length || (m.result?.speaker_segments ? new Set(m.result.speaker_segments.map((s: any) => s.speaker)).size : 1);
        return {
            id: m.id,
            title: m.title || "Meeting Recording",
            date: m.date || "Recently",
            duration: m.duration || "N/A",
            platform: (idx % 2 === 0 ? "teams" : "meet") as any,
            category: idx === 0 ? "Strategic planning" : idx === 1 ? "Development" : "Engineering",
            summaryText: m.result?.summary?.summary || m.result?.cleaned_transcript?.slice(0, 140) || "Meeting processed and ready for playback.",
            attendeeCount: Math.max(1, attendeeCount),
            avatarUrls: avatarPresets.slice(0, Math.min(2, Math.max(1, attendeeCount))),
        };
    });

    return (
        <div className="w-full max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-200">
            {/* ── 2-COLUMN RESPONSIVE LAYOUT MATCHING IMAGE UI ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
                
                {/* ── LEFT MAIN PANEL (8 Cols on lg) ──────────────── */}
                <div className="lg:col-span-8 space-y-7">
                    
                    {/* Header: "New meeting" */}
                    <div className="space-y-4">
                        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
                            New meeting
                        </h1>

                        {/* Top Mode Selector Tabs: Online meeting | Upload meeting (Omitted In-person) */}
                        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#1A1829] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-xs w-fit">
                            <button
                                type="button"
                                onClick={() => setActiveTab("online")}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                                    activeTab === "online"
                                        ? "bg-[var(--purple-subtle)] dark:bg-[#2A2350] text-[var(--purple-primary)] dark:text-[#B6AAFF] font-bold shadow-xs border border-[var(--purple-soft)]/60 dark:border-[#3E3472]"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                                }`}
                            >
                                <Video className="w-4 h-4 text-[var(--purple-primary)] dark:text-[#B6AAFF]" />
                                <span>Online meeting</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab("upload")}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                                    activeTab === "upload"
                                        ? "bg-[var(--purple-subtle)] dark:bg-[#2A2350] text-[var(--purple-primary)] dark:text-[#B6AAFF] font-bold shadow-xs border border-[var(--purple-soft)]/60 dark:border-[#3E3472]"
                                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                                }`}
                            >
                                <UploadCloud className="w-4 h-4 text-[var(--purple-primary)] dark:text-[#B6AAFF]" />
                                <span>Upload meeting</span>
                            </button>
                        </div>
                    </div>

                    {/* ── ACTIVE TAB CONTENT CARD ──────────────────────── */}
                    {activeTab === "online" ? (
                        /* ONLINE MEETING CAPTURE FORM */
                        <div className="soft-card p-6 sm:p-7 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_4px_25px_rgba(102,86,199,0.05)] rounded-3xl space-y-5">
                            <form onSubmit={handleStartCapturing} className="space-y-4">
                                {/* Top URL Input Bar with Brand Logos + Start Capturing Button */}
                                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                    <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#322C56] shadow-xs focus-within:ring-2 focus-within:ring-[var(--purple-primary)]/20 focus-within:border-[var(--purple-primary)] transition-all">
                                        <input
                                            type="text"
                                            value={meetingUrl}
                                            onChange={(e) => setMeetingUrl(e.target.value)}
                                            placeholder="Paste your meeting URL here"
                                            className="w-full text-xs sm:text-sm bg-transparent text-[var(--text-primary)] placeholder-[var(--text-placeholder)] outline-none"
                                        />
                                        
                                        {/* Brand Logos inside URL input */}
                                        <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-[var(--border-subtle)] dark:border-[#2E284D]">
                                            <GoogleMeetIcon className="w-4 h-4" />
                                            <ZoomIcon className="w-4 h-4" />
                                            <TeamsIcon className="w-4 h-4" />
                                        </div>
                                    </div>

                                    {/* Action Button: Start capturing */}
                                    <ShimmerButton
                                        type="submit"
                                        borderRadius="16px"
                                        shimmerDuration="2.5s"
                                        className="!py-3.5 !px-6 !rounded-2xl !font-bold !text-xs sm:!text-sm shadow-md hover:shadow-lg shrink-0 flex items-center justify-center gap-2"
                                    >
                                        {comingSoon ? (
                                            <span className="text-amber-300 dark:text-amber-200">Feature coming soon</span>
                                        ) : (
                                            <span>Start capturing</span>
                                        )}
                                    </ShimmerButton>
                                </div>

                                {comingSoon && (
                                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center justify-center gap-2 animate-in fade-in">
                                        <Sparkles className="w-4 h-4 shrink-0 text-amber-500" />
                                        <span>Feature coming soon</span>
                                    </div>
                                )}

                                {/* Bottom 3 Meta Input Fields in a row */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                                    {/* 1. Name your meeting */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[var(--text-muted)] block">
                                            Name your meeting (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={meetingName}
                                            onChange={(e) => setMeetingName(e.target.value)}
                                            placeholder="E.g. Team Sync"
                                            className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#322C56] text-xs text-[var(--text-primary)] placeholder-[var(--text-placeholder)] outline-none focus:border-[var(--purple-primary)] transition-all"
                                        />
                                    </div>

                                    {/* 2. Meeting language */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[var(--text-muted)] block">
                                            Meeting language
                                        </label>
                                        <div className="relative">
                                            <div className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#322C56] text-xs text-[var(--text-primary)] flex items-center justify-between cursor-pointer">
                                                <div className="flex items-center gap-2">
                                                    <span>🇬🇧</span>
                                                    <span className="font-semibold">{meetingLang}</span>
                                                </div>
                                                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. Bot name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-[var(--text-muted)] block">
                                            Bot name
                                        </label>
                                        <input
                                            type="text"
                                            value={botName}
                                            onChange={(e) => setBotName(e.target.value)}
                                            placeholder="AgenticMeet Bot"
                                            className="w-full px-3.5 py-2.5 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#322C56] text-xs text-[var(--text-primary)] outline-none focus:border-[var(--purple-primary)] transition-all font-semibold"
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        /* UPLOAD MEETING DROP ZONE */
                        <div className="soft-card p-8 bg-white dark:bg-[#1E1B2E] relative overflow-hidden text-center border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_4px_25px_rgba(102,86,199,0.05)] rounded-3xl">
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-2xl p-7 transition-all flex flex-col items-center justify-center relative z-10 ${
                                    isDragging
                                        ? "border-[var(--purple-primary)] bg-[var(--purple-bg)]/40 scale-[1.01]"
                                        : "border-[var(--purple-light)]/50 hover:border-[var(--purple-primary)]/70 bg-[var(--purple-subtle)]/30 dark:bg-[#1A1829]/60"
                                }`}
                            >
                                <input
                                    type="file"
                                    accept=".mp3,.wav,.mp4,.m4a,.mov,.webm,.mkv,.avi,.aac,.flac,.ogg,audio/*,video/*"
                                    onChange={handleFileInput}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    id="file-upload"
                                />

                                <div className="w-14 h-14 rounded-2xl bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] flex items-center justify-center mb-3 shadow-xs">
                                    <UploadCloud className="w-7 h-7" />
                                </div>

                                <p className="text-sm font-bold text-[var(--text-primary)] mb-1">
                                    Drag and drop your audio or video file here
                                </p>
                                <p className="text-xs text-[var(--text-muted)] mb-3">
                                    Supports MP3, WAV, MP4, MOV, and M4A up to 2GB
                                </p>

                                <span className="btn-secondary !text-xs !py-1.5 !px-3 pointer-events-none">
                                    Browse Files
                                </span>
                            </div>

                            {/* Selected file confirmation */}
                            {selectedFile && (
                                <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#322C56] flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {isVideo ? (
                                            <Video className="w-5 h-5 text-[var(--purple-primary)] shrink-0" />
                                        ) : (
                                            <FileAudio className="w-5 h-5 text-[var(--purple-primary)] shrink-0" />
                                        )}
                                        <div className="min-w-0 text-left">
                                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                                {selectedFile.name}
                                            </p>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                {selectedFile.size >= 1024 * 1024 * 1000
                                                    ? `${(selectedFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
                                                    : `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`}
                                            </p>
                                        </div>
                                    </div>

                                    <ShimmerButton
                                        onClick={handleUploadClick}
                                        disabled={!isValid || isUploading}
                                        className="!text-xs !py-2 !px-4 shadow-sm"
                                        shimmerDuration="2.5s"
                                    >
                                        Analyze Recording
                                    </ShimmerButton>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RECENT MEETINGS SECTION ──────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                                Recent meetings
                            </h2>
                            {onGoToMeetings && (
                                <button
                                    type="button"
                                    onClick={onGoToMeetings}
                                    className="text-xs font-bold text-[var(--purple-primary)] hover:text-[var(--purple-hover)] flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                    <span>Go to Meetings</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* 2-Column Grid of Recent Meeting Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {recentDisplayCards.length > 0 ? (
                                recentDisplayCards.map((card) => (
                                    <div
                                        key={card.id}
                                        onClick={() => onSelectRecentMeeting?.(card.id)}
                                        className="soft-card p-5 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] rounded-2xl shadow-xs hover:shadow-md hover:border-[var(--purple-primary)]/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3.5"
                                    >
                                        <div>
                                            {/* Top row: Title + 3 dots */}
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--purple-primary)] transition-colors line-clamp-1">
                                                    {card.title}
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--purple-subtle)] transition-colors"
                                                    title="More actions"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Subtitle row: Date · Duration · Platform Icon */}
                                            <div className="flex items-center gap-2.5 text-xs text-[var(--text-muted)] mb-2.5 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{card.date}</span>
                                                </span>
                                                <span>·</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span>{card.duration}</span>
                                                </span>
                                                <span className="ml-0.5">
                                                    {card.platform === "teams" && <TeamsIcon className="w-3.5 h-3.5" />}
                                                    {card.platform === "meet" && <GoogleMeetIcon className="w-3.5 h-3.5" />}
                                                    {card.platform === "zoom" && <ZoomIcon className="w-3.5 h-3.5" />}
                                                </span>
                                            </div>

                                            {/* Summary text excerpt */}
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                                                {card.summaryText}
                                            </p>
                                        </div>

                                        {/* Bottom row: Category folder tag + Avatar stack */}
                                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] dark:border-[#2D2A4A] gap-2">
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--purple-subtle)] dark:bg-[#28224E] text-[var(--purple-primary)] dark:text-[#A79AF4] text-[11px] font-semibold">
                                                <Folder className="w-3 h-3" />
                                                <span>{card.category}</span>
                                            </div>

                                            {/* Overlapping Avatar Stack */}
                                            <div className="flex items-center -space-x-2">
                                                {card.avatarUrls?.map((url, i) => (
                                                    <img
                                                        key={i}
                                                        src={url}
                                                        alt="participant"
                                                        className="w-6 h-6 rounded-full object-cover border-2 border-white dark:border-[#1E1B2E]"
                                                    />
                                                ))}
                                                <div className="w-6 h-6 rounded-full bg-[var(--purple-bg)] dark:bg-[#322A5A] text-[var(--purple-primary)] dark:text-[#BFAFFC] border-2 border-white dark:border-[#1E1B2E] text-[10px] font-bold flex items-center justify-center">
                                                    +{card.attendeeCount}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="sm:col-span-2 p-8 rounded-2xl bg-white/60 dark:bg-[#161426]/60 border border-dashed border-[var(--border-soft)] dark:border-[#2F294C] text-center flex flex-col items-center justify-center py-10 space-y-2">
                                    <div className="w-10 h-10 rounded-full bg-[var(--purple-subtle)] dark:bg-[#28224E] flex items-center justify-center text-[var(--purple-primary)] dark:text-[#A79AF4]">
                                        <Clock className="w-5 h-5 opacity-60" />
                                    </div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">No recent meetings</p>
                                    <p className="text-xs text-[var(--text-muted)] max-w-sm">
                                        Upload an audio or video file above or capture an online call to see your analyzed meetings here.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT SIDEBAR: "Today" PANEL (4 Cols on lg) ───── */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="soft-card p-6 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_4px_25px_rgba(102,86,199,0.05)] rounded-3xl space-y-6">
                        
                        {/* Header: "Today" + Purple Calendar Button */}
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] dark:border-[#2D2A4A]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                Today
                            </h2>
                            <button
                                type="button"
                                onClick={onGoToCalendar}
                                title="Open Calendar Dashboard"
                                className="w-8 h-8 rounded-xl bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] dark:text-[#A79AF4] flex items-center justify-center shadow-xs hover:scale-105 transition-transform cursor-pointer"
                            >
                                <Calendar className="w-4 h-4" />
                            </button>
                        </div>

                        {/* ── 1. "Meetings" Subsection ── */}
                        <div className="space-y-3.5">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Meetings
                                </h3>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--purple-primary)] bg-[var(--purple-subtle)] dark:bg-[#28214A] px-2.5 py-1 rounded-lg hover:bg-[var(--purple-soft)] transition-colors cursor-pointer"
                                >
                                    <span>Capture all</span>
                                    <ChevronDown className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Meeting Items List */}
                            <div className="space-y-2.5">
                                {/* Item 1: Product marketing meeting */}
                                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#2F294C] shadow-xs space-y-2.5 transition-all">
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                                            Product marketing meeting
                                        </h4>
                                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                                            <Clock className="w-3 h-3" />
                                            <span>11:00 AM – 11:45 AM</span>
                                            <span>·</span>
                                            <GoogleMeetIcon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80"
                                                alt="Jane Cooper"
                                                className="w-5 h-5 rounded-full object-cover"
                                            />
                                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                Jane Cooper
                                            </span>
                                        </div>

                                        {/* Toggle Switch */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSchedule("prod-marketing")}
                                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                                                scheduledToggles["prod-marketing"]
                                                    ? "bg-[#6656C7]"
                                                    : "bg-gray-300 dark:bg-gray-600"
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                                    scheduledToggles["prod-marketing"]
                                                        ? "right-0.5"
                                                        : "left-0.5"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Item 2: User research discussion */}
                                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#2F294C] shadow-xs space-y-2.5 transition-all">
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                                            User research discussion
                                        </h4>
                                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                                            <Clock className="w-3 h-3" />
                                            <span>12:30 PM – 1:30 PM</span>
                                            <span>·</span>
                                            <TeamsIcon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&auto=format&fit=crop&q=80"
                                                alt="Darrell Steward"
                                                className="w-5 h-5 rounded-full object-cover"
                                            />
                                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                Darrell Steward
                                            </span>
                                        </div>

                                        {/* Toggle Switch */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSchedule("user-research")}
                                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                                                scheduledToggles["user-research"]
                                                    ? "bg-[#6656C7]"
                                                    : "bg-gray-300 dark:bg-gray-600"
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                                    scheduledToggles["user-research"]
                                                        ? "right-0.5"
                                                        : "left-0.5"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Item 3: Design review session */}
                                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#2F294C] shadow-xs space-y-2.5 transition-all">
                                    <div>
                                        <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
                                            Design review session
                                        </h4>
                                        <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                                            <Clock className="w-3 h-3" />
                                            <span>2:15 PM – 3:00 PM</span>
                                            <span>·</span>
                                            <ZoomIcon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&auto=format&fit=crop&q=80"
                                                alt="Robert Fox"
                                                className="w-5 h-5 rounded-full object-cover"
                                            />
                                            <span className="text-xs text-[var(--text-secondary)] font-medium">
                                                Robert Fox
                                            </span>
                                        </div>

                                        {/* Toggle Switch */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggleSchedule("design-review")}
                                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                                                scheduledToggles["design-review"]
                                                    ? "bg-[#6656C7]"
                                                    : "bg-gray-300 dark:bg-gray-600"
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                                    scheduledToggles["design-review"]
                                                        ? "right-0.5"
                                                        : "left-0.5"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── 2. "To do" Subsection ── */}
                        <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)] dark:border-[#2D2A4A]">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    To do
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const firstId = meetings && Object.keys(meetings).length > 0 ? Object.keys(meetings)[0] : null;
                                        if (firstId) {
                                            onSelectRecentMeeting?.(firstId);
                                        } else if (onGoToMeetings) {
                                            onGoToMeetings();
                                        }
                                    }}
                                    className="text-xs font-semibold text-[var(--purple-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Go to Action items</span>
                                    <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>

                            {/* Checklist Items */}
                            <div className="space-y-2">
                                {todos.map((todo) => (
                                    <div
                                        key={todo.id}
                                        onClick={() => handleToggleTodo(todo.id)}
                                        className="p-3 rounded-xl bg-white dark:bg-[#161426] border border-[var(--border-soft)] dark:border-[#2F294C] shadow-xs flex items-start gap-2.5 cursor-pointer hover:border-[var(--purple-primary)]/50 transition-all"
                                    >
                                        <button
                                            type="button"
                                            className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center transition-colors shrink-0 ${
                                                todo.done
                                                    ? "bg-[#6656C7] border-[#6656C7] text-white"
                                                    : "border-[var(--border-soft)] dark:border-[#3D3560] bg-transparent"
                                            }`}
                                        >
                                            {todo.done && <Check className="w-3 h-3" />}
                                        </button>
                                        <span
                                            className={`text-xs leading-relaxed ${
                                                todo.done
                                                    ? "text-[var(--text-muted)] line-through"
                                                    : "text-[var(--text-secondary)] font-medium"
                                            }`}
                                        >
                                            {todo.text}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
