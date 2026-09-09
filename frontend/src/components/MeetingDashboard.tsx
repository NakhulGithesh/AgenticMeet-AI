"use client";

import React, { useState, useEffect } from "react";
import {
    Share2,
    CheckCircle2,
    Calendar,
    Clock,
    ArrowLeft,
    Check,
    Pencil,
    X,
    Play,
} from "lucide-react";
import MeetingOverview from "./MeetingOverview";
import TranscriptView from "./TranscriptView";
import SpeakerPanel from "./SpeakerPanel";
import TranslationView from "./TranslationView";
import RiskDashboard from "./RiskDashboard";
import TopicTimeline from "./TopicTimeline";
import SummaryView from "./SummaryView";
import AnalyticsCharts from "./AnalyticsCharts";
import ExportPanel from "./ExportPanel";
import PlaybackDrawer from "./PlaybackDrawer";
import { updateSpeakers } from "@/lib/api";
import { BorderBeam } from "@/registry/magicui/border-beam";
import type { MeetingResult, ActiveTab } from "@/types/meeting";

interface MeetingDashboardProps {
    taskId: string;
    result: MeetingResult;
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    onResultUpdate: (updated: Partial<MeetingResult>) => void;
    onBackToHome?: () => void;
    onDeleteCurrentMeeting?: () => void;
    meetingTitle?: string;
    meetingDuration?: string;
    meetingDate?: string;
    onRenameMeeting?: (newTitle: string) => void;
    audioUrl?: string;
    videoUrl?: string;
    mediaUrl?: string;
    fileName?: string;
    fileType?: string;
}

const TABS: { id: ActiveTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "speakers", label: "Speakers" },
    { id: "transcript", label: "Transcript" },
    { id: "translation", label: "Translation" },
    { id: "risks", label: "Risks" },
    { id: "topics", label: "Topics" },
    { id: "summary", label: "Summary" },
    { id: "analytics", label: "Analytics" },
    { id: "export", label: "Export" },
];

export default function MeetingDashboard({
    taskId,
    result,
    activeTab,
    onTabChange,
    onResultUpdate,
    onBackToHome,
    onDeleteCurrentMeeting,
    meetingTitle = "Project Sync Call",
    meetingDuration = "4.5 min",
    meetingDate = "Sep 9, 2026",
    onRenameMeeting,
    audioUrl,
    videoUrl,
    mediaUrl,
    fileName,
    fileType,
}: MeetingDashboardProps) {
    const [copiedShare, setCopiedShare] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleVal, setEditTitleVal] = useState(meetingTitle);
    const [isPlaybackOpen, setIsPlaybackOpen] = useState(false);
    const [playbackSeekTime, setPlaybackSeekTime] = useState<number | null>(null);

    const handleSeekToTime = (seconds: number) => {
        setPlaybackSeekTime(seconds);
        setIsPlaybackOpen(true);
    };

    useEffect(() => {
        setEditTitleVal(meetingTitle);
    }, [meetingTitle]);

    const handleSpeakerRename = async (mappings: Record<string, string>) => {
        const cleanName = (name: string) =>
            name.replace(/\s*[\(\[]?\d{1,2}:\d{2}(?::\d{2})?[\)\]]?/g, "").trim();

        const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        const updateText = (text: string) => {
            if (!text) return "";
            let updated = text;
            Object.entries(mappings).forEach(([oldName, newName]) => {
                if (!oldName || !newName || oldName === newName) return;
                const cleanOld = cleanName(oldName);
                const cleanNew = cleanName(newName);
                if (!cleanOld || !cleanNew) return;

                // 1. Matches "Speaker 1 (00:00):" or "[Speaker 1] (00:00):"
                const p1 = new RegExp(
                    `(^|[\\r\\n])(\\s*\\[?)${escapeRegExp(cleanOld)}(\\]?\\s*(?:\\([^)]*\\))?\\s*:)`,
                    "gi"
                );
                updated = updated.replace(p1, `$1$2${cleanNew}$3`);

                // 2. Plain "Speaker 1:"
                const p2 = new RegExp(`\\b${escapeRegExp(cleanOld)}\\s*:`, "gi");
                updated = updated.replace(p2, `${cleanNew}:`);

                // 3. Inside parentheses "(Speaker 1)" or brackets "[Speaker 1]"
                const p3 = new RegExp(`\\(${escapeRegExp(cleanOld)}\\)`, "gi");
                updated = updated.replace(p3, `(${cleanNew})`);
                const p4 = new RegExp(`\\[${escapeRegExp(cleanOld)}\\]`, "gi");
                updated = updated.replace(p4, `[${cleanNew}]`);

                // 4. If old name was "Speaker X", replace word boundary mentions
                if (/^speaker\s*\d+/i.test(cleanOld)) {
                    const p5 = new RegExp(`\\b${escapeRegExp(cleanOld)}\\b`, "gi");
                    updated = updated.replace(p5, cleanNew);
                }
            });
            return updated;
        };

        const updatedFormatted = updateText(result.formatted_transcript || "");
        const updatedCleaned = updateText(result.cleaned_transcript || "");

        // 1. Update speaker_segments
        const updatedSegments = (result.speaker_segments || []).map((seg) => {
            const cleanSpeaker = cleanName(seg.speaker);
            const mapped =
                mappings[seg.speaker] ||
                mappings[cleanSpeaker] ||
                seg.speaker;
            return {
                ...seg,
                speaker: mapped,
                text: updateText(seg.text),
            };
        });

        // 2. Update summary
        let updatedSummary = result.summary ? { ...result.summary } : undefined;
        if (updatedSummary) {
            updatedSummary = {
                summary: updateText(updatedSummary.summary || ""),
                action_items: (updatedSummary.action_items || []).map(updateText),
                key_decisions: (updatedSummary.key_decisions || []).map(updateText),
                next_agenda: (updatedSummary.next_agenda || []).map(updateText),
            };
        }

        // 3. Update topics
        const updatedTopics = (result.topics || []).map((top) => ({
            ...top,
            content: updateText(top.content),
            summary: updateText(top.summary),
        }));

        const combinedMappings = {
            ...(result.speaker_mappings || {}),
            ...mappings,
        };

        // Apply immediately to local state across all features
        onResultUpdate({
            formatted_transcript: updatedFormatted,
            cleaned_transcript: updatedCleaned,
            speaker_segments: updatedSegments,
            summary: updatedSummary,
            topics: updatedTopics,
            speaker_mappings: combinedMappings,
        });

        // Sync with backend API
        try {
            const res = await updateSpeakers(taskId, mappings);
            if (res) {
                onResultUpdate({
                    formatted_transcript: res.formatted_transcript || updatedFormatted,
                    cleaned_transcript: (res as any).cleaned_transcript || updatedCleaned,
                    speaker_segments: (res as any).speaker_segments || updatedSegments,
                    summary: (res as any).summary || updatedSummary,
                    topics: (res as any).topics || updatedTopics,
                    speaker_mappings: combinedMappings,
                });
            }
        } catch (err) {
            console.warn("Backend speaker sync note:", err);
        }
    };

    const handleUpdatePhotos = (photos: Record<string, string>) => {
        onResultUpdate({
            speaker_photos: {
                ...(result.speaker_photos || {}),
                ...photos,
            },
        });
    };

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
    };

    const transcript = result.formatted_transcript || result.cleaned_transcript || "";

    return (
        <div className={`w-full transition-all duration-300 ease-in-out space-y-7 pb-20 ${
            isPlaybackOpen
                ? "max-w-none pr-[510px] md:pr-[540px]"
                : "max-w-6xl mx-auto pr-0"
        }`}>
            {/* Header Area */}
            <div className="space-y-4">
                {onBackToHome && (
                    <button
                        onClick={onBackToHome}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--purple-primary)] transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to All Meetings</span>
                    </button>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4">
                    {/* Meeting Title & Meta */}
                    <div className="space-y-1.5 min-w-0">
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editTitleVal}
                                    onChange={(e) => setEditTitleVal(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            const trimmed = editTitleVal.trim();
                                            if (trimmed) onRenameMeeting?.(trimmed);
                                            setIsEditingTitle(false);
                                        }
                                        if (e.key === "Escape") setIsEditingTitle(false);
                                    }}
                                    autoFocus
                                    className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] px-2.5 py-1 rounded-xl border border-[var(--purple-primary)] bg-white outline-none ring-2 ring-[var(--purple-soft)]"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const trimmed = editTitleVal.trim();
                                        if (trimmed) onRenameMeeting?.(trimmed);
                                        setIsEditingTitle(false);
                                    }}
                                    className="p-1.5 rounded-lg bg-[var(--purple-primary)] text-white hover:bg-[var(--purple-medium)]"
                                    title="Save title"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingTitle(false)}
                                    className="p-1.5 rounded-lg bg-[var(--purple-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                    title="Cancel"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 group/dashTitle">
                                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight truncate">
                                    {meetingTitle}
                                </h1>
                                {onRenameMeeting && (
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingTitle(true)}
                                        className="opacity-0 group-hover/dashTitle:opacity-100 p-1.5 rounded-lg text-[var(--text-placeholder)] hover:text-[var(--purple-primary)] hover:bg-[var(--purple-subtle)] transition-all"
                                        title="Rename meeting"
                                        aria-label="Rename meeting"
                                    >
                                        <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <span className="badge-pill badge-mint text-xs shrink-0">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Completed
                                </span>
                            </div>
                        )}

                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-medium">
                            <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[var(--text-placeholder)]" />
                                {meetingDuration && meetingDuration !== "Calculating..."
                                    ? meetingDuration
                                    : (() => {
                                          if (result.speaker_segments && result.speaker_segments.length > 0) {
                                              const totalWords = result.speaker_segments.reduce(
                                                  (acc, s) => acc + (s.word_count || (s.text ? s.text.split(/\s+/).filter(Boolean).length : 0)),
                                                  0
                                              );
                                              if (totalWords > 0) {
                                                  return `${Math.max(1, totalWords / 140).toFixed(1)} min`;
                                              }
                                          }
                                          return "4.5 min";
                                      })()}
                            </span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-[var(--text-placeholder)]" />
                                {meetingDate}
                            </span>
                        </div>
                    </div>

                    {/* Actions: Playback + Share */}
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setIsPlaybackOpen((prev) => !prev)}
                            className={`btn-secondary !text-xs !py-2 !px-3.5 !rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                isPlaybackOpen
                                    ? "bg-[var(--purple-bg)] text-[var(--purple-primary)] border-[var(--purple-light)] dark:bg-[#28214E] dark:text-[#A497FF] dark:border-[#4B3F7E]"
                                    : "hover:border-[var(--purple-primary)] hover:text-[var(--purple-primary)]"
                            }`}
                            title={isPlaybackOpen ? "Close recording player" : "Play recording & synchronized transcript"}
                        >
                            <Play className={`w-3.5 h-3.5 ${isPlaybackOpen ? "fill-current text-[var(--purple-primary)] dark:text-[#A497FF]" : "text-[var(--purple-primary)] dark:text-[#A79AF4]"}`} />
                            <span>{isPlaybackOpen ? "Close Recording" : "Play Recording"}</span>
                        </button>

                        <button
                            onClick={handleShare}
                            className="btn-secondary !text-xs !py-2 !px-3.5 !rounded-xl"
                            title="Copy link to clipboard"
                        >
                            {copiedShare ? (
                                <>
                                    <Check className="w-3.5 h-3.5 text-[var(--mint-text)]" />
                                    <span>Link Copied</span>
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <span>Share</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab Bar with Animated Border Beam on active tab */}
            <div className="border-b border-[var(--border-soft)] pb-1">
                <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`px-4 py-2 text-xs sm:text-sm font-semibold transition-all relative shrink-0 rounded-xl overflow-hidden ${
                                    isActive
                                        ? "text-[var(--purple-primary)] dark:text-[#A497FF] font-bold bg-[var(--purple-bg)] dark:bg-[#28214E] shadow-xs border border-[var(--purple-soft)] dark:border-[#3E3472]"
                                        : "text-[#2D2A4A] dark:text-[#E8E6F8] font-semibold hover:text-[var(--purple-primary)] dark:hover:text-white hover:bg-[var(--purple-subtle)] dark:hover:bg-[#231E3E] border border-transparent"
                                }`}
                            >
                                {tab.label}
                                {isActive && (
                                    <BorderBeam
                                        duration={4}
                                        size={60}
                                        borderWidth={1.5}
                                        colorFrom="#6656C7"
                                        colorTo="#EF7297"
                                    />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Body View */}
            <div className="animate-in fade-in duration-200">
                {activeTab === "overview" && (
                    <MeetingOverview result={result} onViewTab={onTabChange} />
                )}

                {activeTab === "speakers" && (
                    <SpeakerPanel
                        speakerSegments={result.speaker_segments || []}
                        onRename={handleSpeakerRename}
                        savedMappings={result.speaker_mappings || {}}
                        speakerPhotos={result.speaker_photos || {}}
                        onUpdatePhotos={handleUpdatePhotos}
                        taskId={taskId}
                        audioUrl={audioUrl || result.audio_url || (taskId && !taskId.startsWith("meeting-") ? `http://127.0.0.1:8000/api/audio/${taskId}` : "")}
                    />
                )}

                {activeTab === "transcript" && (
                    <TranscriptView
                        transcript={transcript}
                        riskAnalysis={result.risk_analysis}
                        meetingTitle={meetingTitle}
                        speakerPhotos={result.speaker_photos || {}}
                        audioUrl={audioUrl || result.audio_url || (taskId && !taskId.startsWith("meeting-") ? `http://127.0.0.1:8000/api/audio/${taskId}` : "/audio/meeting_sample.mp3")}
                        speakerSegments={result.speaker_segments || []}
                        onSeekToTime={handleSeekToTime}
                    />
                )}

                {activeTab === "translation" && (
                    <TranslationView
                        taskId={taskId}
                        originalTranscript={transcript}
                    />
                )}

                {activeTab === "risks" && (
                    <RiskDashboard
                        riskAnalysis={result.risk_analysis}
                        onSeekToTime={handleSeekToTime}
                    />
                )}

                {activeTab === "topics" && (
                    <TopicTimeline
                        topics={result.topics || []}
                        onSeekToTime={handleSeekToTime}
                    />
                )}

                {activeTab === "summary" && (
                    <SummaryView
                        taskId={taskId}
                        initialSummary={result.summary}
                        onSeekToTime={handleSeekToTime}
                    />
                )}

                {activeTab === "analytics" && (
                    <AnalyticsCharts taskId={taskId} result={result} />
                )}

                {activeTab === "export" && (
                    <ExportPanel
                        taskId={taskId}
                        transcript={transcript}
                        summary={result.summary?.summary}
                        actionItems={result.summary?.action_items}
                    />
                )}
            </div>

            {/* Slide-over Playback Drawer — attached to the right side of the screen */}
            {(() => {
                const isVideoMeeting = Boolean(
                    result.is_video ||
                    result.video_url ||
                    videoUrl ||
                    (fileType && (fileType.includes("video") || fileType.includes("quicktime"))) ||
                    (fileName && (
                        fileName.toLowerCase().endsWith(".mov") ||
                        fileName.toLowerCase().endsWith(".mp4") ||
                        fileName.toLowerCase().endsWith(".mkv") ||
                        fileName.toLowerCase().endsWith(".webm") ||
                        fileName.toLowerCase().endsWith(".avi")
                    ))
                );

                const effectiveVideo =
                    videoUrl ||
                    (result.video_url
                        ? (result.video_url.startsWith("http")
                            ? result.video_url
                            : `http://127.0.0.1:8000${result.video_url}`)
                        : null) ||
                    (taskId && !taskId.startsWith("meeting-") && isVideoMeeting
                        ? `http://127.0.0.1:8000/api/video/${taskId}`
                        : undefined);

                const effectiveAudio =
                    audioUrl ||
                    (result.audio_url
                        ? (result.audio_url.startsWith("http")
                            ? result.audio_url
                            : `http://127.0.0.1:8000${result.audio_url}`)
                        : null) ||
                    (taskId && !taskId.startsWith("meeting-")
                        ? `http://127.0.0.1:8000/api/audio/${taskId}`
                        : "/audio/meeting_sample.mp3");

                const effectiveMedia =
                    mediaUrl ||
                    (isVideoMeeting ? (effectiveVideo || effectiveAudio) : effectiveAudio);

                return (
                    <PlaybackDrawer
                        isOpen={isPlaybackOpen}
                        onClose={() => setIsPlaybackOpen(false)}
                        meetingTitle={meetingTitle}
                        fileName={fileName}
                        fileType={isVideoMeeting ? "video/mp4" : fileType}
                        mediaUrl={effectiveMedia || effectiveVideo || effectiveAudio}
                        videoUrl={effectiveVideo}
                        audioUrl={effectiveAudio}
                        speakerSegments={result.speaker_segments}
                        topics={result.topics}
                        riskAnalysis={result.risk_analysis}
                        summary={result.summary}
                        speakerPhotos={result.speaker_photos}
                        initialSeekTime={playbackSeekTime}
                        onSeekHandled={() => setPlaybackSeekTime(null)}
                    />
                );
            })()}
        </div>
    );
}
