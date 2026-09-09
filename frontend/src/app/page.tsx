"use client";

import React, { useState, useCallback, useEffect } from "react";
import Sidebar, { NavItem } from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import UploadZone from "@/components/UploadZone";
import ProcessingLoader from "@/components/ProcessingLoader";
import MeetingDashboard from "@/components/MeetingDashboard";
import CalendarDashboard from "@/components/CalendarDashboard";
import { uploadFile, getTaskStatus } from "@/lib/api";
import { useTask } from "@/hooks/useTask";
import type { StoredMeeting } from "@/lib/sampleMeeting";
import type { ActiveTab, MeetingResult, UserProfile } from "@/types/meeting";
import {
    Calendar,
    Clock,
    AudioWaveform,
    CheckCircle2,
    ArrowRight,
    Search,
    Cpu,
    Sparkles,
    Sliders,
    Volume2,
    ShieldCheck,
    Languages,
    Trash2,
    Palette,
    Sun,
    Moon,
    Laptop,
    Check,
    Pencil,
    X,
    MousePointer2,
    User,
    Camera,
    Upload,
} from "lucide-react";
import { AnimatedThemeToggler, type TransitionVariant } from "@/registry/magicui/animated-theme-toggler";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";

function computeDurationFromMeeting(res?: MeetingResult | null): string {
    if (!res) return "4.5 min";
    if (res.speaker_segments && res.speaker_segments.length > 0) {
        let maxSec = 0;
        res.speaker_segments.forEach((seg: any) => {
            if (seg.end && typeof seg.end === "number") {
                maxSec = Math.max(maxSec, seg.end);
            }
        });
        if (maxSec > 0) {
            return `${(maxSec / 60).toFixed(1)} min`;
        }
        const totalWords = res.speaker_segments.reduce(
            (acc, s) => acc + (s.word_count || (s.text ? s.text.split(/\s+/).filter(Boolean).length : 0)),
            0
        );
        if (totalWords > 0) {
            return `${Math.max(1, totalWords / 140).toFixed(1)} min`;
        }
    }
    return "4.5 min";
}

export default function Home() {
    const [currentNav, setCurrentNav] = useState<NavItem>("home");
    const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
    const [taskId, setTaskId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [localResult, setLocalResult] = useState<MeetingResult | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Meeting metadata (Title, duration, date, audioUrl, videoUrl, mediaUrl, fileName, fileType)
    const [meetingMeta, setMeetingMeta] = useState<{
        title: string;
        date: string;
        duration: string;
        audioUrl?: string;
        videoUrl?: string;
        mediaUrl?: string;
        fileName?: string;
        fileType?: string;
    }>({
        title: "",
        date: "",
        duration: "",
        audioUrl: "",
        videoUrl: "",
        mediaUrl: "",
        fileName: "",
        fileType: "",
    });

    // Whether user is currently viewing a specific meeting workspace
    const [inWorkspace, setInWorkspace] = useState(false);

    // Meetings stored in workspace (persisted in localStorage)
    const [meetings, setMeetings] = useState<Record<string, StoredMeeting>>({});
    const [meetingToDelete, setMeetingToDelete] = useState<{ id: string; title: string } | null>(null);
    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
    const [editingMeetingTitle, setEditingMeetingTitle] = useState("");

    // Sidebar collapse state (default collapsed matching image UI)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
    const [sidebarHovered, setSidebarHovered] = useState(false);

    const DEFAULT_USER_PROFILE: UserProfile = {
        name: "Sarah Lee",
        email: "sarah@tubikstudio.com",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        role: "Product Designer",
    };

    // User Profile state (persisted in localStorage, hydrated in useEffect to prevent SSR mismatch)
    const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
    const [editProfileName, setEditProfileName] = useState(DEFAULT_USER_PROFILE.name);
    const [editProfileEmail, setEditProfileEmail] = useState(DEFAULT_USER_PROFILE.email);
    const [editProfileRole, setEditProfileRole] = useState(DEFAULT_USER_PROFILE.role || "Product Designer");
    const [editProfileAvatar, setEditProfileAvatar] = useState(DEFAULT_USER_PROFILE.avatarUrl);
    const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

    // Hydrate user profile from localStorage after initial client mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("agenticmeet_user_profile");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === "object") {
                    setUserProfile(parsed);
                    setEditProfileName(parsed.name || DEFAULT_USER_PROFILE.name);
                    setEditProfileEmail(parsed.email || DEFAULT_USER_PROFILE.email);
                    setEditProfileRole(parsed.role || DEFAULT_USER_PROFILE.role);
                    setEditProfileAvatar(parsed.avatarUrl || DEFAULT_USER_PROFILE.avatarUrl);
                }
            }
        } catch (e) {
            console.warn("Failed to load user profile from localStorage:", e);
        }
    }, []);

    const handleSaveProfile = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const updated: UserProfile = {
            name: editProfileName.trim() || "Sarah Lee",
            email: editProfileEmail.trim() || "sarah@tubikstudio.com",
            role: editProfileRole.trim() || "Product Designer",
            avatarUrl: editProfileAvatar.trim() || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        };
        setUserProfile(updated);
        try {
            localStorage.setItem("agenticmeet_user_profile", JSON.stringify(updated));
        } catch (err) {
            console.warn("Failed to save user profile:", err);
        }
        setProfileSavedFeedback(true);
        setTimeout(() => setProfileSavedFeedback(false), 2500);
    };

    const profileFileInputRef = React.useRef<HTMLInputElement | null>(null);

    const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxDim = 256;
                let w = img.width;
                let h = img.height;
                if (w > h) {
                    if (w > maxDim) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    }
                } else {
                    if (h > maxDim) {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, w, h);
                const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
                setEditProfileAvatar(compressedDataUrl);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Settings state
    const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash");
    const [whisperModel, setWhisperModel] = useState("whisper-base");
    const [autoTranslateLang, setAutoTranslateLang] = useState("none");
    const [enableNotifications, setEnableNotifications] = useState(true);
    const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
    const [isDarkMode, setIsDarkMode] = useState(false);

    const applyTheme = useCallback((newTheme: "light" | "dark" | "system") => {
        const isDark =
            newTheme === "dark" ||
            (newTheme === "system" &&
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);

        setIsDarkMode(isDark);
        if (isDark) {
            document.documentElement.classList.add("dark");
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.setAttribute("data-theme", "light");
        }
    }, []);

    const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
        setTheme(newTheme);
        try {
            localStorage.setItem("agenticmeet_theme", newTheme);
        } catch (e) {
            console.warn("Could not save theme:", e);
        }

        const doc = document as any;
        if (
            typeof doc.startViewTransition === "function" &&
            doc.documentElement?.dataset?.magicuiThemeVt !== "active"
        ) {
            doc.startViewTransition(() => {
                applyTheme(newTheme);
            });
        } else {
            applyTheme(newTheme);
        }
    };

    const handleToggleTheme = () => {
        const nextTheme = isDarkMode ? "light" : "dark";
        handleThemeChange(nextTheme);
    };

    // Animated Theme Toggler transition shape
    const [transitionVariant, setTransitionVariant] = useState<TransitionVariant>("circle");

    useEffect(() => {
        try {
            const savedVariant = localStorage.getItem("agenticmeet_theme_variant") as TransitionVariant | null;
            if (savedVariant) {
                setTransitionVariant(savedVariant);
            }
        } catch (e) {}
    }, []);

    const handleVariantChange = (v: TransitionVariant) => {
        setTransitionVariant(v);
        try {
            localStorage.setItem("agenticmeet_theme_variant", v);
        } catch (e) {}
    };

    // Initialize theme from localStorage and attach OS preference listener
    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem("agenticmeet_theme") as "light" | "dark" | "system" | null;
            if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
                setTheme(savedTheme);
                applyTheme(savedTheme);
            } else {
                applyTheme("system");
            }
        } catch (e) {
            console.warn("Could not read theme:", e);
        }

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleSystemChange = () => {
            const currentSaved = localStorage.getItem("agenticmeet_theme");
            if (currentSaved === "system" || !currentSaved) {
                applyTheme("system");
            }
        };
        mediaQuery.addEventListener("change", handleSystemChange);
        return () => mediaQuery.removeEventListener("change", handleSystemChange);
    }, [applyTheme]);

    // Smooth Cursor state (Magic UI physics cursor)
    const [smoothCursorEnabled, setSmoothCursorEnabled] = useState(true);

    useEffect(() => {
        try {
            const savedPref = localStorage.getItem("agenticmeet_smooth_cursor");
            if (savedPref !== null) {
                setSmoothCursorEnabled(savedPref !== "false");
            }
        } catch (e) {
            console.warn("Could not read smooth cursor pref:", e);
        }
    }, []);

    const toggleSmoothCursor = (enabled: boolean) => {
        setSmoothCursorEnabled(enabled);
        try {
            localStorage.setItem("agenticmeet_smooth_cursor", enabled ? "true" : "false");
            window.dispatchEvent(new Event("smooth_cursor_change"));
        } catch (e) {
            console.warn("Could not save smooth cursor pref:", e);
        }
    };

    const { isCompleted, isFailed, progress, message, result, error } = useTask(taskId);

    // Initialize meetings from localStorage if present, filter out stale mock data, and repair any "Calculating..." durations
    useEffect(() => {
        try {
            const saved = localStorage.getItem("agenticmeet_saved_meetings");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed && typeof parsed === "object") {
                    let changed = false;
                    const cleaned: Record<string, StoredMeeting> = {};
                    Object.entries(parsed as Record<string, StoredMeeting>).forEach(([id, m]) => {
                        if (id === "meeting-drilling") {
                            changed = true;
                            return;
                        }
                        if (m.duration === "Calculating..." || !m.duration) {
                            const fixedDur = computeDurationFromMeeting(m.result);
                            cleaned[id] = { ...m, duration: fixedDur };
                            changed = true;
                        } else {
                            cleaned[id] = m;
                        }
                    });
                    setMeetings(cleaned);
                    if (changed) {
                        localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(cleaned));
                    }

                    // Silently refresh stored tasks from backend to pick up re-processed summaries & diarizations
                    Object.keys(cleaned).forEach(async (id) => {
                        if (!id.startsWith("meeting-") && !id.startsWith("capture-")) {
                            try {
                                const s = await getTaskStatus(id);
                                if (s.status === "completed" && s.result) {
                                    setMeetings((prev) => {
                                        const existing = prev[id];
                                        if (!existing) return prev;
                                        const updated: StoredMeeting = {
                                            ...existing,
                                            duration: computeDurationFromMeeting(s.result),
                                            result: {
                                                ...s.result!,
                                                speaker_mappings: existing.result?.speaker_mappings || s.result!.speaker_mappings,
                                                speaker_photos: existing.result?.speaker_photos || s.result!.speaker_photos,
                                            },
                                        };
                                        const next = { ...prev, [id]: updated };
                                        try {
                                            localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(next));
                                        } catch {}
                                        return next;
                                    });
                                }
                            } catch {}
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("Could not access localStorage:", e);
        }
    }, []);

    const updateAndPersistMeetings = (newMeetings: Record<string, StoredMeeting>) => {
        setMeetings(newMeetings);
        try {
            localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(newMeetings));
        } catch (e) {
            console.warn("Could not save to localStorage:", e);
        }
    };

    const handleDeleteMeeting = (meetingId: string) => {
        const next = { ...meetings };
        delete next[meetingId];
        updateAndPersistMeetings(next);
        if (taskId === meetingId) {
            setTaskId(null);
            setLocalResult(null);
            setInWorkspace(false);
        }
        setMeetingToDelete(null);
    };

    const handleStartRenameMeeting = (id: string, currentTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingMeetingId(id);
        setEditingMeetingTitle(currentTitle);
    };

    const handleSaveRenameMeeting = (id: string, e?: React.MouseEvent | React.KeyboardEvent) => {
        e?.stopPropagation();
        const trimmed = editingMeetingTitle.trim();
        if (!trimmed) {
            setEditingMeetingId(null);
            return;
        }

        setMeetings((prev) => {
            const target = prev[id];
            if (!target) return prev;
            const updated = {
                ...prev,
                [id]: {
                    ...target,
                    title: trimmed,
                },
            };
            try {
                localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(updated));
            } catch (err) {
                console.warn(err);
            }
            return updated;
        });

        if (taskId === id) {
            setMeetingMeta((prev) => ({ ...prev, title: trimmed }));
        }

        setEditingMeetingId(null);
    };

    const handleRenameActiveMeeting = (newTitle: string) => {
        const trimmed = newTitle.trim();
        if (!trimmed) return;
        setMeetingMeta((prev) => ({ ...prev, title: trimmed }));
        if (taskId) {
            setMeetings((prev) => {
                const target = prev[taskId];
                if (!target) return prev;
                const updated = {
                    ...prev,
                    [taskId]: {
                        ...target,
                        title: trimmed,
                    },
                };
                try {
                    localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(updated));
                } catch (err) {
                    console.warn(err);
                }
                return updated;
            });
        }
    };

    // Effective result combines local state with backend task result or sample data
    const effectiveResult = localResult ?? result ?? null;
    const hasActiveMeeting = !!effectiveResult || isCompleted;

    // Save completed uploads to meeting archive and synchronize newly computed backend results
    useEffect(() => {
        const dataToSync = result ?? effectiveResult;
        if (isCompleted && taskId && dataToSync) {
            setLocalResult((prev) => ({
                ...dataToSync,
                speaker_mappings: prev?.speaker_mappings || dataToSync.speaker_mappings,
                speaker_photos: prev?.speaker_photos || dataToSync.speaker_photos,
            }));

            const realDuration =
                meetingMeta.duration && meetingMeta.duration !== "Calculating..."
                    ? meetingMeta.duration
                    : computeDurationFromMeeting(dataToSync);

            setMeetings((prev) => {
                const existing = prev[taskId];
                const updatedMeeting: StoredMeeting = {
                    id: taskId,
                    title: existing?.title || meetingMeta.title || "Uploaded Meeting",
                    date: existing?.date || meetingMeta.date || "Today",
                    duration: realDuration,
                    status: "Completed",
                    result: {
                        ...dataToSync,
                        speaker_mappings: existing?.result?.speaker_mappings || dataToSync.speaker_mappings,
                        speaker_photos: existing?.result?.speaker_photos || dataToSync.speaker_photos,
                    },
                };
                const updated = { ...prev, [taskId]: updatedMeeting };
                try {
                    localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(updated));
                } catch (err) {
                    console.warn("Failed to persist updated meeting:", err);
                }
                return updated;
            });

            if (meetingMeta.duration === "Calculating..." || !meetingMeta.duration) {
                setMeetingMeta((prev) => ({ ...prev, duration: realDuration }));
            }
        }
    }, [isCompleted, taskId, effectiveResult, meetings, meetingMeta.title, meetingMeta.date, meetingMeta.duration]);

    // Keep active meeting duration calculated when effectiveResult arrives
    useEffect(() => {
        if (effectiveResult && (meetingMeta.duration === "Calculating..." || !meetingMeta.duration)) {
            const computed = computeDurationFromMeeting(effectiveResult);
            if (computed && computed !== "Calculating...") {
                setMeetingMeta((prev) => ({ ...prev, duration: computed }));
                if (taskId) {
                    setMeetings((prev) => {
                        const existing = prev[taskId];
                        if (existing && (existing.duration === "Calculating..." || !existing.duration)) {
                            const updated = {
                                ...prev,
                                [taskId]: { ...existing, duration: computed },
                            };
                            try {
                                localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(updated));
                            } catch {}
                            return updated;
                        }
                        return prev;
                    });
                }
            }
        }
    }, [effectiveResult, taskId, meetingMeta.duration]);

    // Handle audio/video file upload
    const handleFileSelected = useCallback(async (file: File) => {
        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);
        setTaskId(null);
        setLocalResult(null);
        setInWorkspace(true);
        setActiveTab("overview");
        const meetingTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

        // Probe media duration immediately from file
        let initialDuration = "Calculating...";
        try {
            const isVideo =
                file.name.toLowerCase().endsWith(".mov") ||
                file.name.toLowerCase().endsWith(".mp4") ||
                file.name.toLowerCase().endsWith(".mkv") ||
                file.name.toLowerCase().endsWith(".avi") ||
                file.name.toLowerCase().endsWith(".webm") ||
                file.type.startsWith("video/") ||
                file.type.includes("quicktime");

            if (!isVideo) {
                const probeAudio = new Audio();
                const probeUrl = URL.createObjectURL(file);
                probeAudio.src = probeUrl;
                probeAudio.onloadedmetadata = () => {
                    if (probeAudio.duration && !isNaN(probeAudio.duration) && isFinite(probeAudio.duration)) {
                        const mins = (probeAudio.duration / 60).toFixed(1);
                        setMeetingMeta((prev) => ({
                            ...prev,
                            duration: `${mins} min`,
                        }));
                    }
                    URL.revokeObjectURL(probeUrl);
                };
            } else {
                const probeVideo = document.createElement("video");
                const probeUrl = URL.createObjectURL(file);
                probeVideo.src = probeUrl;
                probeVideo.onloadedmetadata = () => {
                    if (probeVideo.duration && !isNaN(probeVideo.duration) && isFinite(probeVideo.duration)) {
                        const mins = (probeVideo.duration / 60).toFixed(1);
                        setMeetingMeta((prev) => ({
                            ...prev,
                            duration: `${mins} min`,
                        }));
                    }
                    URL.revokeObjectURL(probeUrl);
                };
            }
        } catch {
            // ignore
        }

        // Create in-browser object URL for media playback if supported
        let uploadedAudioUrl = "";
        let uploadedVideoUrl = "";
        try {
            const isQuickTime = file.name.toLowerCase().endsWith(".mov") || file.type.includes("quicktime");
            if (!isQuickTime && (file.type.startsWith("audio/") || file.type.includes("mp4") || file.type.includes("webm"))) {
                const objUrl = URL.createObjectURL(file);
                uploadedAudioUrl = objUrl;
                const isVideo =
                    file.name.toLowerCase().endsWith(".mp4") ||
                    file.name.toLowerCase().endsWith(".webm") ||
                    file.type.startsWith("video/");
                if (isVideo) uploadedVideoUrl = objUrl;
            }
        } catch {}

        setMeetingMeta({
            title: meetingTitle,
            fileName: file.name,
            fileType: file.type || (file.name.toLowerCase().endsWith(".mov") || file.name.toLowerCase().endsWith(".mp4") ? "video/mp4" : "audio/mpeg"),
            date: new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
            }),
            duration: initialDuration,
            audioUrl: uploadedAudioUrl,
            videoUrl: uploadedVideoUrl,
            mediaUrl: uploadedVideoUrl || uploadedAudioUrl,
        });

        try {
            const res = await uploadFile(file, (percent) => {
                setUploadProgress(percent);
            });
            setTaskId(res.task_id);
            setUploadProgress(null);
        } catch (err: any) {
            console.error("Upload failed:", err);
            setUploadError(
                err?.response?.data?.detail ||
                err?.message ||
                "Upload failed. Please verify that the backend server is running."
            );
            setUploadProgress(null);
        } finally {
            setIsUploading(false);
        }
    }, []);

    // Handle selecting a meeting from Home or Meetings list
    const handleSelectMeeting = useCallback((meetingId: string) => {
        let currentPool = meetings;
        try {
            const raw = localStorage.getItem("agenticmeet_saved_meetings");
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === "object") {
                    currentPool = parsed;
                }
            }
        } catch (e) {
            console.warn("Could not read meetings from localStorage:", e);
        }

        const sample = currentPool[meetingId];
        if (sample) {
            const effectiveDuration =
                sample.duration && sample.duration !== "Calculating..."
                    ? sample.duration
                    : computeDurationFromMeeting(sample.result);

            const isVideo = Boolean(
                sample.result?.is_video ||
                sample.result?.video_url ||
                (sample.result?.audio_url && sample.result.audio_url.includes("/video/")) ||
                (sample.title && (sample.title.toLowerCase().endsWith(".mov") || sample.title.toLowerCase().endsWith(".mp4")))
            );

            const resolvedVideoUrl = sample.result?.video_url
                ? (sample.result.video_url.startsWith("http")
                    ? sample.result.video_url
                    : `http://127.0.0.1:8000${sample.result.video_url}`)
                : isVideo && !sample.id.startsWith("capture-")
                    ? `http://127.0.0.1:8000/api/video/${sample.id}`
                    : undefined;

            const resolvedAudioUrl = sample.result?.audio_url
                ? (sample.result.audio_url.startsWith("http")
                    ? sample.result.audio_url
                    : `http://127.0.0.1:8000${sample.result.audio_url}`)
                : (!sample.id.startsWith("capture-")
                    ? `http://127.0.0.1:8000/api/audio/${sample.id}`
                    : undefined);

            setLocalResult(sample.result);
            setMeetingMeta({
                title: sample.title,
                date: sample.date,
                duration: effectiveDuration,
                audioUrl: resolvedAudioUrl || "",
                videoUrl: resolvedVideoUrl || "",
                mediaUrl: resolvedVideoUrl || resolvedAudioUrl || "",
                fileName: `${sample.title.toLowerCase().replace(/\s+/g, "_")}.${isVideo ? "mp4" : "mp3"}`,
                fileType: isVideo ? "video/mp4" : "audio/mpeg",
            });
            setTaskId(sample.id);
            setInWorkspace(true);
            setActiveTab("overview");
        }
    }, [meetings]);

    // Handle online meeting capture session initiation (Feature coming soon)
    const handleStartCapture = useCallback(() => {
        // Feature coming soon - do nothing
    }, []);

    const handleResultUpdate = useCallback(
        (updated: Partial<MeetingResult>) => {
            setLocalResult((prev) => {
                const base = prev ?? result ?? null;
                if (!base) return null;
                const nextResult = { ...base, ...updated };

                // Persist immediately into stored meetings in state and localStorage
                if (taskId) {
                    setMeetings((prevMeetings) => {
                        const existing = prevMeetings[taskId] || {
                            id: taskId,
                            title: meetingMeta.title || "Meeting",
                            date: meetingMeta.date || "Today",
                            duration: meetingMeta.duration || "4.5 min",
                            status: "Completed",
                            result: nextResult,
                        };
                        const updatedMeeting: StoredMeeting = {
                            ...existing,
                            result: nextResult,
                        };
                        const nextMap = { ...prevMeetings, [taskId]: updatedMeeting };
                        try {
                            localStorage.setItem("agenticmeet_saved_meetings", JSON.stringify(nextMap));
                        } catch (e) {
                            console.warn("Failed to persist updated meeting to localStorage:", e);
                        }
                        return nextMap;
                    });
                }

                return nextResult;
            });
        },
        [result, taskId, meetingMeta.title, meetingMeta.date, meetingMeta.duration],
    );

    const handleNavChange = (nav: NavItem) => {
        setCurrentNav(nav);
        if (nav === "home" || nav === "calendar" || nav === "meetings" || nav === "settings") {
            setInWorkspace(false);
        }
    };

    const handleOpenActiveMeeting = () => {
        if (effectiveResult) {
            setInWorkspace(true);
        }
    };

    const handleUploadNew = () => {
        setTaskId(null);
        setLocalResult(null);
        setUploadError(null);
        setUploadProgress(null);
        setIsUploading(false);
        setInWorkspace(false);
        setCurrentNav("home");
        setActiveTab("overview");
    };

    const showProcessing = !!(
        (isUploading || (taskId && !isCompleted)) &&
        !isFailed &&
        !uploadError &&
        inWorkspace &&
        !localResult
    );

    const meetingCount = Object.keys(meetings).length;

    return (
        <div className="flex min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] overflow-x-hidden">
            {/* Sidebar — Navigation */}
            <Sidebar
                currentNav={currentNav}
                onNavChange={handleNavChange}
                hasActiveMeeting={hasActiveMeeting}
                activeMeetingTitle={meetingMeta.title}
                onOpenActiveMeeting={handleOpenActiveMeeting}
                isCollapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
                onHoverChange={setSidebarHovered}
            />

            {/* Main content wrapper — smoothly pushes and realigns when sidebar expands */}
            <div className={`flex-1 ${sidebarHovered ? "ml-[230px]" : "ml-[76px]"} flex flex-col min-w-0 transition-all duration-300 ease-in-out`}>
                {/* Transparent TopBar matching Image 1 UI */}
                <TopBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    showSearch={!showProcessing}
                    currentTheme={theme}
                    isDarkMode={isDarkMode}
                    onToggleTheme={handleToggleTheme}
                    onThemeChange={(newTheme) => handleThemeChange(newTheme)}
                    transitionVariant={transitionVariant}
                    userProfile={userProfile}
                    onOpenProfileSettings={() => {
                        setInWorkspace(false);
                        setCurrentNav("settings");
                    }}
                />

                {/* Main Content Area — Responsive width */}
                <main className="flex-1 p-6 sm:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200 transition-all">
                    {/* ── 1. ACTIVE MEETING WORKSPACE ────────────────── */}
                    {inWorkspace && (
                        <>
                            {showProcessing && (
                                <div className="flex items-center justify-center min-h-[60vh]">
                                    <ProcessingLoader
                                        progress={isUploading ? (uploadProgress ?? 5) : progress}
                                        message={
                                            isUploading
                                                ? (uploadProgress !== null
                                                    ? `Uploading recording (${uploadProgress}%)...`
                                                    : "Uploading recording to server...")
                                                : message
                                        }
                                    />
                                </div>
                            )}

                            {(isFailed || uploadError) && (
                                <div className="flex items-center justify-center min-h-[60vh]">
                                    <div className="soft-card p-8 max-w-md text-center bg-white dark:bg-[#1E1B2E]">
                                        <p className="text-[var(--pink-text)] text-lg font-bold mb-2">
                                            Processing Failed
                                        </p>
                                        <p className="text-sm text-[var(--text-muted)] mb-5">
                                            {uploadError || error || "An unexpected error occurred during audio processing."}
                                        </p>
                                        <ShimmerButton
                                            onClick={handleUploadNew}
                                            className="!text-xs !py-2.5 !px-5 shadow-sm"
                                            shimmerDuration="2.5s"
                                        >
                                            Try Another File
                                        </ShimmerButton>
                                    </div>
                                </div>
                            )}

                            {!showProcessing && !isFailed && !uploadError && effectiveResult && (() => {
                                const isMeetingVideo = Boolean(
                                    effectiveResult?.is_video ||
                                    effectiveResult?.video_url ||
                                    meetingMeta.videoUrl ||
                                    (meetingMeta.fileType && (meetingMeta.fileType.includes("video") || meetingMeta.fileType.includes("quicktime"))) ||
                                    (meetingMeta.fileName && (
                                        meetingMeta.fileName.toLowerCase().endsWith(".mov") ||
                                        meetingMeta.fileName.toLowerCase().endsWith(".mp4") ||
                                        meetingMeta.fileName.toLowerCase().endsWith(".mkv") ||
                                        meetingMeta.fileName.toLowerCase().endsWith(".webm") ||
                                        meetingMeta.fileName.toLowerCase().endsWith(".avi")
                                    ))
                                );

                                const resolvedVideoUrl =
                                    (effectiveResult?.video_url
                                        ? (effectiveResult.video_url.startsWith("http")
                                            ? effectiveResult.video_url
                                            : `http://127.0.0.1:8000${effectiveResult.video_url}`)
                                        : null) ||
                                    meetingMeta.videoUrl ||
                                    (taskId && !taskId.startsWith("meeting-") && isMeetingVideo
                                        ? `http://127.0.0.1:8000/api/video/${taskId}`
                                        : undefined);

                                const resolvedAudioUrl =
                                    (effectiveResult?.audio_url
                                        ? (effectiveResult.audio_url.startsWith("http")
                                            ? effectiveResult.audio_url
                                            : `http://127.0.0.1:8000${effectiveResult.audio_url}`)
                                        : null) ||
                                    meetingMeta.audioUrl ||
                                    (taskId && !taskId.startsWith("meeting-")
                                        ? `http://127.0.0.1:8000/api/audio/${taskId}`
                                        : "/audio/meeting_sample.mp3");

                                const resolvedMediaUrl = isMeetingVideo
                                    ? (resolvedVideoUrl || resolvedAudioUrl)
                                    : resolvedAudioUrl;

                                return (
                                    <MeetingDashboard
                                        taskId={taskId || "active-task"}
                                        result={effectiveResult}
                                        activeTab={activeTab}
                                        onTabChange={setActiveTab}
                                        onResultUpdate={handleResultUpdate}
                                        onBackToHome={() => setInWorkspace(false)}
                                        onDeleteCurrentMeeting={() => {
                                            if (taskId) {
                                                setMeetingToDelete({ id: taskId, title: meetingMeta.title });
                                            }
                                        }}
                                        meetingTitle={meetingMeta.title}
                                        meetingDuration={meetingMeta.duration}
                                        meetingDate={meetingMeta.date}
                                        fileName={meetingMeta.fileName}
                                        fileType={isMeetingVideo ? "video/mp4" : meetingMeta.fileType}
                                        audioUrl={resolvedAudioUrl}
                                        videoUrl={resolvedVideoUrl}
                                        mediaUrl={resolvedMediaUrl}
                                        onRenameMeeting={handleRenameActiveMeeting}
                                    />
                                );
                            })()}
                        </>
                    )}

                    {/* ── 2. HOME VIEW (Upload + Recents + Insights) ── */}
                    {!inWorkspace && currentNav === "home" && (
                        <UploadZone
                            onFileSelected={handleFileSelected}
                            isUploading={isUploading}
                            onSelectRecentMeeting={handleSelectMeeting}
                            onStartCapture={handleStartCapture}
                            meetings={meetings}
                            onDeleteMeeting={(id) => {
                                setMeetingToDelete({ id, title: meetings[id]?.title || "this meeting" });
                            }}
                            onGoToCalendar={() => setCurrentNav("calendar")}
                            onGoToMeetings={() => setCurrentNav("meetings")}
                        />
                    )}

                    {/* ── 2b. CALENDAR DASHBOARD VIEW ────────────────── */}
                    {!inWorkspace && currentNav === "calendar" && (
                        <CalendarDashboard
                            meetings={meetings}
                            onSelectMeeting={(id) => {
                                handleSelectMeeting(id);
                                setInWorkspace(true);
                            }}
                            onUploadNew={handleUploadNew}
                        />
                    )}

                    {/* ── 3. MEETINGS LIST VIEW ──────────────────────── */}
                    {!inWorkspace && currentNav === "meetings" && (
                        <div className="w-full max-w-5xl mx-auto space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                        Meeting Archives
                                    </h2>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {meetingCount} recorded session{meetingCount === 1 ? "" : "s"} stored in this workspace
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <ShimmerButton
                                        onClick={handleUploadNew}
                                        className="!text-xs !py-2 !px-4 shadow-sm"
                                        shimmerDuration="2.5s"
                                    >
                                        + New Meeting
                                    </ShimmerButton>
                                </div>
                            </div>

                            {/* Meeting list cards or Empty State */}
                            {Object.values(meetings).filter((m) =>
                                m.title.toLowerCase().includes(searchQuery.toLowerCase())
                            ).length === 0 ? (
                                <div className="soft-card p-12 text-center bg-white space-y-3">
                                    <div className="w-12 h-12 rounded-2xl bg-[var(--purple-subtle)] text-[var(--purple-primary)] mx-auto flex items-center justify-center">
                                        <AudioWaveform className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                        No meetings found
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
                                        {searchQuery
                                            ? `No archived meetings match "${searchQuery}".`
                                            : "No meeting recordings stored in this workspace. Upload a file or start a new recording to begin."}
                                    </p>
                                    <ShimmerButton
                                        onClick={handleUploadNew}
                                        className="!text-xs !py-2 !px-4 mt-2 shadow-sm"
                                        shimmerDuration="2.5s"
                                    >
                                        Upload Meeting
                                    </ShimmerButton>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {Object.values(meetings)
                                        .filter((m) =>
                                            m.title.toLowerCase().includes(searchQuery.toLowerCase())
                                        )
                                        .map((meeting) => (
                                            <div
                                                key={meeting.id}
                                                onClick={() => handleSelectMeeting(meeting.id)}
                                                className="soft-card p-5 flex items-center justify-between gap-4 cursor-pointer hover:border-[var(--purple-light)] hover:shadow-md transition-all group bg-white"
                                            >
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="w-11 h-11 rounded-2xl bg-[var(--purple-bg)] text-[var(--purple-primary)] flex items-center justify-center shrink-0 shadow-sm">
                                                        <AudioWaveform className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        {editingMeetingId === meeting.id ? (
                                                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                                <input
                                                                    type="text"
                                                                    value={editingMeetingTitle}
                                                                    onChange={(e) => setEditingMeetingTitle(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === "Enter") handleSaveRenameMeeting(meeting.id, e);
                                                                        if (e.key === "Escape") setEditingMeetingId(null);
                                                                    }}
                                                                    autoFocus
                                                                    className="px-2.5 py-1 text-xs sm:text-sm font-bold rounded-lg border border-[var(--purple-primary)] bg-white text-[var(--text-primary)] outline-none ring-2 ring-[var(--purple-soft)]"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleSaveRenameMeeting(meeting.id, e)}
                                                                    className="p-1.5 rounded-md bg-[var(--purple-primary)] text-white hover:bg-[var(--purple-medium)]"
                                                                    title="Save title"
                                                                >
                                                                    <Check className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingMeetingId(null);
                                                                    }}
                                                                    className="p-1.5 rounded-md bg-[var(--purple-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                                    title="Cancel"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 group/title">
                                                                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--purple-primary)] transition-colors truncate">
                                                                    {meeting.title}
                                                                </h3>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => handleStartRenameMeeting(meeting.id, meeting.title, e)}
                                                                    className="opacity-0 group-hover/title:opacity-100 p-1 rounded-md text-[var(--text-placeholder)] hover:text-[var(--purple-primary)] hover:bg-[var(--purple-subtle)] transition-all"
                                                                    title="Rename meeting"
                                                                    aria-label={`Rename ${meeting.title}`}
                                                                >
                                                                    <Pencil className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {meeting.date}
                                                            </span>
                                                            <span>·</span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {meeting.duration && meeting.duration !== "Calculating..."
                                                                    ? meeting.duration
                                                                    : computeDurationFromMeeting(meeting.result)}
                                                            </span>
                                                            <span>·</span>
                                                            <span>
                                                                {(() => {
                                                                    const cleanSpeaker = (s: string) =>
                                                                        s.replace(/\s*[\(\[]?\d{1,2}:\d{2}(?::\d{2})?[\)\]]?/g, "").trim();
                                                                    const unique = Array.from(
                                                                        new Set(
                                                                            (meeting.result?.speaker_segments || [])
                                                                                .map((s) => cleanSpeaker(s.speaker))
                                                                                .filter(Boolean)
                                                                        )
                                                                    );
                                                                    const count = unique.length > 0 ? unique.length : 2;
                                                                    return `${count} speaker${count === 1 ? "" : "s"}`;
                                                                })()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className="badge-pill badge-mint text-xs">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {meeting.status}
                                                    </span>

                                                    {/* Rename Button */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleStartRenameMeeting(meeting.id, meeting.title, e)}
                                                        className="w-8 h-8 rounded-full bg-[var(--purple-subtle)] hover:bg-[var(--purple-bg)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--purple-primary)] transition-all"
                                                        title={`Rename ${meeting.title}`}
                                                        aria-label={`Rename ${meeting.title}`}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>

                                                    {/* Delete Button */}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMeetingToDelete({ id: meeting.id, title: meeting.title });
                                                        }}
                                                        className="w-8 h-8 rounded-full bg-[var(--purple-subtle)] hover:bg-[var(--pink-soft)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--pink-primary)] transition-all"
                                                        title={`Delete ${meeting.title}`}
                                                        aria-label={`Delete ${meeting.title}`}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>

                                                    <div className="w-8 h-8 rounded-full bg-[var(--purple-subtle)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[var(--purple-primary)] group-hover:bg-[var(--purple-bg)] transition-all">
                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── 4. SETTINGS VIEW ──────────────────────────── */}
                    {!inWorkspace && currentNav === "settings" && (
                        <div className="w-full max-w-5xl mx-auto space-y-6">
                            <div>
                                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                                    Profile, Workspace & Model Settings
                                </h2>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Customize your profile card, visual theme, local AI engines, and export defaults.
                                </p>
                            </div>

                            {/* Section: User Profile & Account */}
                            <div className="soft-card p-6 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] space-y-5 shadow-sm">
                                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] dark:border-[#2D2A4A] flex-wrap gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] dark:text-[#A79AF4] flex items-center justify-center shadow-xs">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                                User Profile & Top Navigation Card
                                            </h3>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Edit your display name, email, and avatar photo shown in the navbar.
                                            </p>
                                        </div>
                                    </div>
                                    {profileSavedFeedback && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--mint-soft)] text-[var(--mint-text)] animate-in fade-in">
                                            <Check className="w-3.5 h-3.5" />
                                            Profile Saved!
                                        </span>
                                    )}
                                </div>

                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    {/* Live Preview Card & Photo Uploader */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[var(--purple-subtle)]/50 dark:bg-[#252238]/60 border border-[var(--border-subtle)] dark:border-[#2D2A4A]">
                                        <div className="flex items-center gap-4 min-w-0">
                                            {/* Avatar Image with Click-to-upload hover overlay */}
                                            <div
                                                onClick={() => profileFileInputRef.current?.click()}
                                                className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 border-2 border-white dark:border-[#3A355A] shadow-md bg-white cursor-pointer group/avatar"
                                                title="Click to upload profile picture from device"
                                            >
                                                <img
                                                    src={editProfileAvatar || userProfile.avatarUrl}
                                                    alt="Avatar preview"
                                                    className="w-full h-full object-cover group-hover/avatar:opacity-75 transition-opacity"
                                                />
                                                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                                                    <Camera className="w-4 h-4" />
                                                    <span className="text-[9px] font-bold mt-0.5">Upload</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1 min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">
                                                        {editProfileName || "Your Name"}
                                                    </p>
                                                    {editProfileRole && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] dark:text-[#A79AF4]">
                                                            {editProfileRole}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-[var(--text-muted)] truncate">
                                                    {editProfileEmail || "your.email@company.com"}
                                                </p>
                                                <p className="text-[10px] text-[var(--purple-primary)] dark:text-[#A79AF4] font-medium">
                                                    Preview: Appears on the top right navigation bar.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Direct Upload Picture Button */}
                                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                                            <input
                                                ref={profileFileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleProfilePhotoUpload}
                                                className="hidden"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => profileFileInputRef.current?.click()}
                                                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] text-[var(--text-primary)] hover:border-[var(--purple-primary)] hover:text-[var(--purple-primary)] shadow-xs hover:shadow-sm transition-all cursor-pointer"
                                            >
                                                <Upload className="w-3.5 h-3.5 text-[var(--purple-primary)] dark:text-[#A79AF4]" />
                                                <span>Upload Picture</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Inputs Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)]">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                value={editProfileName}
                                                onChange={(e) => setEditProfileName(e.target.value)}
                                                placeholder="e.g. Sarah Lee"
                                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252238] border border-[var(--border-soft)] dark:border-[#34314E] text-[var(--text-primary)] focus:bg-white dark:focus:bg-[#1E1B2E] focus:border-[var(--purple-light)] outline-none transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)]">
                                                Email Address
                                            </label>
                                            <input
                                                type="email"
                                                value={editProfileEmail}
                                                onChange={(e) => setEditProfileEmail(e.target.value)}
                                                placeholder="e.g. sarah@tubikstudio.com"
                                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252238] border border-[var(--border-soft)] dark:border-[#34314E] text-[var(--text-primary)] focus:bg-white dark:focus:bg-[#1E1B2E] focus:border-[var(--purple-light)] outline-none transition-all"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-xs font-semibold text-[var(--text-secondary)]">
                                                Role / Job Title
                                            </label>
                                            <input
                                                type="text"
                                                value={editProfileRole}
                                                onChange={(e) => setEditProfileRole(e.target.value)}
                                                placeholder="e.g. Product Designer"
                                                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252238] border border-[var(--border-soft)] dark:border-[#34314E] text-[var(--text-primary)] focus:bg-white dark:focus:bg-[#1E1B2E] focus:border-[var(--purple-light)] outline-none transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex items-center justify-end pt-2">
                                        <ShimmerButton
                                            type="submit"
                                            className="!text-xs !py-2 !px-5 gap-2 shadow-sm font-semibold"
                                            shimmerDuration="2.5s"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Save Profile Changes</span>
                                        </ShimmerButton>
                                    </div>
                                </form>
                            </div>

                            {/* Section: Appearance & Dark Mode */}
                            <div className="soft-card p-6 bg-white space-y-4">
                                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
                                    <Palette className="w-4 h-4 text-[var(--purple-primary)]" />
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                        Appearance & Dark Mode
                                    </h3>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs text-[var(--text-muted)]">
                                        Choose your visual theme or allow AgenticMeet to follow your operating system appearance.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                                        {/* Light Option */}
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange("light")}
                                            className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                                                theme === "light"
                                                    ? "border-[var(--purple-primary)] bg-[var(--purple-bg)]/40 ring-2 ring-[var(--purple-primary)]/20 shadow-sm"
                                                    : "border-[var(--border-soft)] hover:border-[var(--purple-light)] bg-[var(--bg-card)]"
                                            }`}
                                        >
                                            {theme === "light" && (
                                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--purple-primary)] text-white flex items-center justify-center shadow-xs">
                                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                                </div>
                                            )}
                                            <div className="w-9 h-9 rounded-xl bg-[#E9E6FA] text-[#6656C7] border border-[#D9D4F4] flex items-center justify-center mb-3 shadow-xs">
                                                <Sun className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                                Soft Light
                                            </h4>
                                            <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                                                Pale lavender canvas with periwinkle and soft purple accents.
                                            </p>
                                        </button>

                                        {/* Dark Option */}
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange("dark")}
                                            className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                                                theme === "dark"
                                                    ? "border-[var(--purple-primary)] bg-[var(--purple-bg)]/40 ring-2 ring-[var(--purple-primary)]/20 shadow-sm"
                                                    : "border-[var(--border-soft)] hover:border-[var(--purple-light)] bg-[var(--bg-card)]"
                                            }`}
                                        >
                                            {theme === "dark" && (
                                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--purple-primary)] text-white flex items-center justify-center shadow-xs">
                                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                                </div>
                                            )}
                                            <div className="w-9 h-9 rounded-xl bg-[#272248] text-[#8E7EFF] border border-[rgba(142,126,255,0.25)] flex items-center justify-center mb-3 shadow-xs">
                                                <Moon className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                                Deep Obsidian (Dark)
                                            </h4>
                                            <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                                                Midnight purple canvas with luminous lavender highlights.
                                            </p>
                                        </button>

                                        {/* System Option */}
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange("system")}
                                            className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                                                theme === "system"
                                                    ? "border-[var(--purple-primary)] bg-[var(--purple-bg)]/40 ring-2 ring-[var(--purple-primary)]/20 shadow-sm"
                                                    : "border-[var(--border-soft)] hover:border-[var(--purple-light)] bg-[var(--bg-card)]"
                                            }`}
                                        >
                                            {theme === "system" && (
                                                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--purple-primary)] text-white flex items-center justify-center shadow-xs">
                                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                                </div>
                                            )}
                                            <div className="w-9 h-9 rounded-xl bg-[var(--purple-subtle)] text-[var(--purple-primary)] border border-[var(--border-soft)] flex items-center justify-center mb-3 shadow-xs">
                                                <Laptop className="w-4 h-4" />
                                            </div>
                                            <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                                System Default
                                            </h4>
                                            <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-snug">
                                                Automatically mirrors macOS dark or light mode.
                                            </p>
                                        </button>
                                    </div>

                                    {/* View Transition Shape Options */}
                                    <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                                    View Transition Shape (Clip-Path)
                                                </h4>
                                                <p className="text-[11px] text-[var(--text-muted)]">
                                                    Choose the geometric ripple shape that expands across the viewport on theme toggle.
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] text-[var(--text-muted)] font-medium">Test:</span>
                                                <AnimatedThemeToggler
                                                    variant={transitionVariant}
                                                    theme={isDarkMode ? "dark" : "light"}
                                                    onThemeChange={(newTheme) => handleThemeChange(newTheme)}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {(["circle", "star", "diamond", "hexagon", "square", "triangle", "rectangle"] as TransitionVariant[]).map((shape) => (
                                                <button
                                                    key={shape}
                                                    type="button"
                                                    onClick={() => handleVariantChange(shape)}
                                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-all cursor-pointer ${
                                                        transitionVariant === shape
                                                            ? "bg-[var(--purple-primary)] text-white shadow-xs font-semibold"
                                                            : "bg-[var(--purple-subtle)] text-[var(--text-secondary)] hover:bg-[var(--purple-bg)] border border-[var(--border-soft)]"
                                                    }`}
                                                >
                                                    {shape}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Magic UI Smooth Cursor */}
                            <div className="soft-card p-6 bg-white space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                                    <div className="flex items-center gap-2.5">
                                        <MousePointer2 className="w-4 h-4 text-[var(--purple-primary)]" />
                                        <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                            Magic UI Smooth Cursor
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                                            {smoothCursorEnabled ? "Active" : "Disabled"}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => toggleSmoothCursor(!smoothCursorEnabled)}
                                            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                                smoothCursorEnabled
                                                    ? "bg-[var(--purple-primary)]"
                                                    : "bg-[var(--border-soft)]"
                                            }`}
                                            title="Toggle smooth physics cursor"
                                        >
                                            <div
                                                className={`w-5 h-5 rounded-full bg-white transition-transform shadow-xs ${
                                                    smoothCursorEnabled ? "translate-x-5" : "translate-x-0"
                                                }`}
                                            />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                        A customizable, physics-based smooth cursor animation with spring momentum and directional tilt.
                                    </p>

                                    <div className="p-4 rounded-2xl bg-[var(--purple-subtle)] border border-[var(--border-soft)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-[var(--text-secondary)]">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-3.5 h-3.5 text-[var(--purple-primary)] shrink-0" />
                                            <span className="hidden md:block font-medium">
                                                Move your mouse around to feel the physics
                                            </span>
                                            <span className="block md:hidden font-medium text-[var(--text-muted)]">
                                                SmoothCursor is disabled on touch devices
                                            </span>
                                        </div>
                                        <span className="text-[11px] px-2.5 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-soft)] font-mono text-[var(--purple-primary)] font-semibold shadow-2xs">
                                            Spring Physics
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: AI Engine */}
                            <div className="soft-card p-6 bg-white space-y-4">
                                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
                                    <Cpu className="w-4 h-4 text-[var(--purple-primary)]" />
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                        Intelligence Models
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                                                Analysis & Summarization Model
                                            </p>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Powering executive digests, key decisions, and risk assessments.
                                            </p>
                                        </div>
                                        <select
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="px-3 py-1.5 text-xs rounded-xl bg-[var(--purple-subtle)] border border-[var(--border-soft)] text-[var(--text-primary)] font-medium outline-none focus:border-[var(--purple-light)]"
                                        >
                                            <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Crisp)</option>
                                            <option value="gemini-2.0-pro">Gemini 2.0 Pro (Deep Analytical)</option>
                                            <option value="local-ollama">Local Llama 3 (Offline Mode)</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                                                Whisper Audio Engine
                                            </p>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Local speech-to-text model for timestamped diarization.
                                            </p>
                                        </div>
                                        <select
                                            value={whisperModel}
                                            onChange={(e) => setWhisperModel(e.target.value)}
                                            className="px-3 py-1.5 text-xs rounded-xl bg-[var(--purple-subtle)] border border-[var(--border-soft)] text-[var(--text-primary)] font-medium outline-none focus:border-[var(--purple-light)]"
                                        >
                                            <option value="whisper-tiny">Whisper Tiny (Ultra Fast)</option>
                                            <option value="whisper-base">Whisper Base (Balanced)</option>
                                            <option value="whisper-small">Whisper Small (High Precision)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Language & Diarization */}
                            <div className="soft-card p-6 bg-white space-y-4">
                                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
                                    <Languages className="w-4 h-4 text-[var(--purple-primary)]" />
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                        Multilingual & Translation
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                                                Default Target Translation
                                            </p>
                                            <p className="text-[11px] text-[var(--text-muted)]">
                                                Pre-translate transcripts into this language upon upload.
                                            </p>
                                        </div>
                                        <select
                                            value={autoTranslateLang}
                                            onChange={(e) => setAutoTranslateLang(e.target.value)}
                                            className="px-3 py-1.5 text-xs rounded-xl bg-[var(--purple-subtle)] border border-[var(--border-soft)] text-[var(--text-primary)] font-medium outline-none focus:border-[var(--purple-light)]"
                                        >
                                            <option value="none">Manual Only</option>
                                            <option value="Hindi">Hindi (हिंदी)</option>
                                            <option value="Spanish">Spanish (Español)</option>
                                            <option value="French">French (Français)</option>
                                            <option value="German">German (Deutsch)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Privacy & Security */}
                            <div className="soft-card p-6 bg-white space-y-4">
                                <div className="flex items-center gap-2.5 pb-2 border-b border-[var(--border-subtle)]">
                                    <ShieldCheck className="w-4 h-4 text-[var(--mint-text)]" />
                                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                        Privacy & Retention
                                    </h3>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                                            Local Ingestion Sandbox
                                        </p>
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            Keep raw audio chunks stored strictly on your local filesystem.
                                        </p>
                                    </div>
                                    <span className="badge-pill badge-mint text-xs">
                                        Enabled (Localhost)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* ── Soft Delete Confirmation Modal ────────────────── */}
            {meetingToDelete && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs p-4 animate-in fade-in"
                    onClick={() => setMeetingToDelete(null)}
                >
                    <div
                        className="soft-card p-6 bg-white max-w-sm w-full space-y-4 shadow-xl border border-[var(--border-soft)] animate-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-[var(--pink-soft)] text-[var(--pink-primary)] flex items-center justify-center shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Delete Meeting?
                                </h3>
                                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                                    Are you sure you want to delete <span className="font-semibold text-[var(--text-secondary)]">"{meetingToDelete.title}"</span>? This will remove it from your meeting archive.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setMeetingToDelete(null)}
                                className="btn-secondary !text-xs !py-2 !px-4 !rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteMeeting(meetingToDelete.id)}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-[var(--pink-primary)] hover:bg-[#D6456E] text-white transition-all shadow-sm shadow-[rgba(239,114,151,0.25)]"
                            >
                                Delete Meeting
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
