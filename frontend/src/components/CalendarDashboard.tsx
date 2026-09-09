"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    Plus,
    Video,
    Mic,
    CheckCircle2,
    CalendarCheck,
    Users,
    ArrowRight,
    Sparkles,
    X,
    Filter,
} from "lucide-react";
import GlassCard from "./GlassCard";
import { ShimmerButton } from "@/registry/magicui/shimmer-button";
import type { StoredMeeting } from "@/lib/sampleMeeting";

interface CalendarEvent {
    id: string;
    title: string;
    date: string; // "YYYY-MM-DD"
    time: string;
    duration: string;
    type: "recorded" | "upcoming";
    meetingId?: string;
    color: "purple" | "pink" | "mint" | "blue" | "amber";
    attendees?: string[];
    description?: string;
}

interface CalendarDashboardProps {
    meetings?: Record<string, StoredMeeting>;
    onSelectMeeting?: (meetingId: string) => void;
    onUploadNew?: () => void;
}

// Default upcoming schedule events for September 2026
const DEFAULT_UPCOMING_EVENTS: CalendarEvent[] = [
    {
        id: "evt-retro",
        title: "Sprint Retrospective & Demo",
        date: "2026-09-12",
        time: "10:30 AM",
        duration: "45 min",
        type: "upcoming",
        color: "amber",
        attendees: ["Sarah Lee", "Nakul Githesh", "David Chen"],
        description: "Review sprint deliverables, velocity metrics, and deployment pipelines.",
    },
    {
        id: "evt-roadmap",
        title: "Product Roadmap Sync",
        date: "2026-09-15",
        time: "02:00 PM",
        duration: "30 min",
        type: "upcoming",
        color: "purple",
        attendees: ["Design Team", "Product Lead"],
        description: "Quarterly review of feature timelines and design system milestones.",
    },
    {
        id: "evt-security",
        title: "Security & Infrastructure Review",
        date: "2026-09-18",
        time: "11:00 AM",
        duration: "60 min",
        type: "upcoming",
        color: "blue",
        attendees: ["Security Lead", "DevOps Guild"],
        description: "Cloud infrastructure capacity audit and security compliance walkthrough.",
    },
    {
        id: "evt-client",
        title: "Stakeholder Quarterly Sync",
        date: "2026-09-22",
        time: "03:30 PM",
        duration: "45 min",
        type: "upcoming",
        color: "pink",
        attendees: ["Enterprise Client", "Sarah Lee", "Executive Sponsor"],
        description: "Demonstrate AI-generated meeting summaries, risk audits, and translation capabilities.",
    },
];

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function CalendarDashboard({
    meetings = {},
    onSelectMeeting,
    onUploadNew,
}: CalendarDashboardProps) {
    // Current viewed Month & Year (Default to Sep 2026 where sample meetings reside)
    const [viewDate, setViewDate] = useState(() => new Date(2026, 8, 1)); // September 2026
    const [selectedDateStr, setSelectedDateStr] = useState("2026-09-09");
    const [filterType, setFilterType] = useState<"all" | "recorded" | "upcoming">("all");

    // Scheduling Modal
    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDate, setNewDate] = useState("2026-09-14");
    const [newTime, setNewTime] = useState("10:00 AM");
    const [newDuration, setNewDuration] = useState("30 min");
    const [newAttendees, setNewAttendees] = useState("Sarah Lee, Nakul");
    const [newDesc, setNewDesc] = useState("");

    // Custom events in state / localStorage (hydrated in useEffect to prevent SSR mismatch)
    const [customEvents, setCustomEvents] = useState<CalendarEvent[]>([]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem("agenticmeet_calendar_custom_events");
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setCustomEvents(parsed);
                }
            }
        } catch (e) {
            console.warn("Could not load custom events:", e);
        }
    }, []);

    // Helper to parse date string like "Sep 9, 2026" or "Sep 09, 2026" into "YYYY-MM-DD"
    const parseMeetingDateToIso = (dateStr: string): string => {
        if (!dateStr) return "2026-09-09";
        // Format: "Sep 9, 2026"
        const parts = dateStr.replace(",", "").split(" ");
        if (parts.length >= 3) {
            const mIdx = MONTH_NAMES.findIndex((m) => m.toLowerCase().startsWith(parts[0].toLowerCase().slice(0, 3)));
            const d = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            if (mIdx !== -1 && !isNaN(d) && !isNaN(y)) {
                const mm = String(mIdx + 1).padStart(2, "0");
                const dd = String(d).padStart(2, "0");
                return `${y}-${mm}-${dd}`;
            }
        }
        return "2026-09-09";
    };

    // Combine recorded meetings and upcoming events
    const allEvents: CalendarEvent[] = useMemo(() => {
        const recorded: CalendarEvent[] = Object.values(meetings).map((m, idx) => {
            const iso = parseMeetingDateToIso(m.date);
            const colors: CalendarEvent["color"][] = ["purple", "pink", "blue", "mint"];
            return {
                id: m.id,
                title: m.title,
                date: iso,
                time: idx === 0 ? "09:30 AM" : idx === 1 ? "02:15 PM" : "11:00 AM",
                duration: m.duration || "4 min",
                type: "recorded",
                meetingId: m.id,
                color: colors[idx % colors.length],
                description: `Recorded session with synchronized transcript and AI extraction.`,
            };
        });

        return [...recorded, ...DEFAULT_UPCOMING_EVENTS, ...customEvents];
    }, [meetings, customEvents]);

    // Filtered events
    const filteredEvents = useMemo(() => {
        if (filterType === "all") return allEvents;
        return allEvents.filter((ev) => ev.type === filterType);
    }, [allEvents, filterType]);

    // Calendar grid calculations for current viewed month
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

    const prevMonthDays = new Date(year, month, 0).getDate();

    // Generate 42 calendar grid cells (6 rows x 7 days)
    const calendarCells = useMemo(() => {
        const cells: {
            day: number;
            dateStr: string;
            isCurrentMonth: boolean;
            isToday: boolean;
            events: CalendarEvent[];
        }[] = [];

        // 1. Previous month overflow days
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const d = prevMonthDays - i;
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            cells.push({
                day: d,
                dateStr,
                isCurrentMonth: false,
                isToday: dateStr === "2026-09-09",
                events: filteredEvents.filter((e) => e.date === dateStr),
            });
        }

        // 2. Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            cells.push({
                day: d,
                dateStr,
                isCurrentMonth: true,
                isToday: dateStr === "2026-09-09",
                events: filteredEvents.filter((e) => e.date === dateStr),
            });
        }

        // 3. Next month overflow days to complete 42 cells
        const remaining = 42 - cells.length;
        for (let d = 1; d <= remaining; d++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            cells.push({
                day: d,
                dateStr,
                isCurrentMonth: false,
                isToday: dateStr === "2026-09-09",
                events: filteredEvents.filter((e) => e.date === dateStr),
            });
        }

        return cells;
    }, [year, month, daysInMonth, firstDayIndex, prevMonthDays, filteredEvents]);

    // Selected date events
    const selectedDayEvents = useMemo(() => {
        return allEvents.filter((e) => e.date === selectedDateStr);
    }, [allEvents, selectedDateStr]);

    // Format selected date human friendly
    const formattedSelectedDate = useMemo(() => {
        const parts = selectedDateStr.split("-");
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dt = new Date(y, m, d);
            return dt.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                year: "numeric",
            });
        }
        return selectedDateStr;
    }, [selectedDateStr]);

    const handlePrevMonth = () => {
        setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const handleJumpToToday = () => {
        setViewDate(new Date(2026, 8, 1));
        setSelectedDateStr("2026-09-09");
    };

    const handleSaveSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim()) return;

        const newEvt: CalendarEvent = {
            id: `evt-${Date.now()}`,
            title: newTitle.trim(),
            date: newDate,
            time: newTime,
            duration: newDuration,
            type: "upcoming",
            color: "purple",
            attendees: newAttendees.split(",").map((s) => s.trim()).filter(Boolean),
            description: newDesc.trim() || "Scheduled team meeting and discussion.",
        };

        const updated = [...customEvents, newEvt];
        setCustomEvents(updated);
        try {
            localStorage.setItem("agenticmeet_calendar_custom_events", JSON.stringify(updated));
        } catch (err) {
            console.warn("Failed to persist custom calendar event:", err);
        }

        setSelectedDateStr(newDate);
        setIsScheduleOpen(false);
        setNewTitle("");
        setNewDesc("");
    };

    // Total metrics
    const totalRecorded = allEvents.filter((e) => e.type === "recorded").length;
    const totalUpcoming = allEvents.filter((e) => e.type === "upcoming").length;

    return (
        <div className="w-full max-w-5xl mx-auto space-y-7 pb-20 animate-in fade-in duration-200">
            {/* ── 1. HEADER & CONTROLS ── */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-3">
                        <span>Calendar Dashboard</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--purple-primary)] animate-pulse" />
                    </h1>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                        Schedule upcoming meetings, review past recorded sessions, and jump to synchronized transcripts.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleJumpToToday}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--purple-primary)] hover:border-[var(--purple-primary)] transition-all shadow-xs cursor-pointer"
                    >
                        Today (Sep 9)
                    </button>
                    <ShimmerButton
                        onClick={() => setIsScheduleOpen(true)}
                        className="!text-xs !py-2.5 !px-4 shadow-sm"
                        shimmerDuration="2.5s"
                    >
                        <Plus className="w-4 h-4 mr-1.5 inline" />
                        Schedule Meeting
                    </ShimmerButton>
                </div>
            </div>

            {/* ── 2. METRIC SUMMARY CARDS ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <GlassCard className="!p-4 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-xs">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] block">Month</span>
                    <span className="text-lg font-bold text-[var(--text-primary)] mt-0.5 block">
                        {MONTH_NAMES[month]} {year}
                    </span>
                </GlassCard>

                <GlassCard className="!p-4 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-xs">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] block">Recorded Sessions</span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-lg font-bold text-[var(--mint-text)]">{totalRecorded}</span>
                        <span className="text-[10px] font-semibold text-[var(--text-muted)]">Transcribed</span>
                    </div>
                </GlassCard>

                <GlassCard className="!p-4 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-xs">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] block">Upcoming Calls</span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-lg font-bold text-[var(--purple-primary)] dark:text-[#A79AF4]">{totalUpcoming}</span>
                        <span className="text-[10px] font-semibold text-[var(--text-muted)]">Scheduled</span>
                    </div>
                </GlassCard>

                <GlassCard className="!p-4 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-xs">
                    <span className="text-[11px] font-medium text-[var(--text-muted)] block">Filter View</span>
                    <div className="flex items-center gap-1.5 mt-1">
                        <button
                            type="button"
                            onClick={() => setFilterType("all")}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                filterType === "all"
                                    ? "bg-[var(--purple-primary)] text-white"
                                    : "text-[var(--text-muted)] hover:bg-[var(--purple-subtle)]"
                            }`}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType("recorded")}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                filterType === "recorded"
                                    ? "bg-[var(--mint-primary)] text-white"
                                    : "text-[var(--text-muted)] hover:bg-[var(--purple-subtle)]"
                            }`}
                        >
                            Recorded
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType("upcoming")}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                                filterType === "upcoming"
                                    ? "bg-[var(--orange-primary)] text-white"
                                    : "text-[var(--text-muted)] hover:bg-[var(--purple-subtle)]"
                            }`}
                        >
                            Upcoming
                        </button>
                    </div>
                </GlassCard>
            </div>

            {/* ── 3. MAIN CALENDAR GRID + AGENDA SPLIT VIEW ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left (8 cols on lg): Interactive Month Calendar Grid */}
                <div className="lg:col-span-8 soft-card p-5 sm:p-6 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_4px_25px_rgba(102,86,199,0.04)] space-y-4">
                    {/* Month Navigator Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] dark:border-[#2D2A4A]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] dark:text-[#A79AF4] flex items-center justify-center font-bold">
                                <CalendarIcon className="w-4 h-4" />
                            </div>
                            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                                {MONTH_NAMES[month]} {year}
                            </h2>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#28214A] border border-[var(--border-soft)] dark:border-[#2D2A4A] transition-colors cursor-pointer"
                                title="Previous Month"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#28214A] border border-[var(--border-soft)] dark:border-[#2D2A4A] transition-colors cursor-pointer"
                                title="Next Month"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Weekday Labels */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[var(--text-muted)] py-1">
                        {DAYS_OF_WEEK.map((day) => (
                            <div key={day} className="py-1">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Day Cells Grid */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                        {calendarCells.map((cell, idx) => {
                            const isSelected = cell.dateStr === selectedDateStr;

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setSelectedDateStr(cell.dateStr)}
                                    className={`min-h-[74px] sm:min-h-[84px] p-1.5 sm:p-2 rounded-2xl flex flex-col justify-between text-left transition-all relative border cursor-pointer ${
                                        isSelected
                                            ? "bg-[var(--purple-subtle)]/70 dark:bg-[#2A2350] border-[var(--purple-primary)] ring-2 ring-[var(--purple-primary)]/20 shadow-sm"
                                            : cell.isCurrentMonth
                                            ? "bg-white dark:bg-[#1A1829] border-[var(--border-subtle)] dark:border-[#2D2A4A]/60 hover:border-[var(--purple-light)] hover:bg-[var(--purple-subtle)]/30"
                                            : "bg-black/[0.02] dark:bg-white/[0.02] border-transparent opacity-40 hover:opacity-75"
                                    }`}
                                >
                                    {/* Date Number + Today Pill */}
                                    <div className="flex items-center justify-between w-full">
                                        <span
                                            className={`text-xs font-bold leading-none ${
                                                cell.isToday
                                                    ? "w-6 h-6 rounded-full bg-[var(--purple-primary)] text-white flex items-center justify-center shadow-xs"
                                                    : isSelected
                                                    ? "text-[var(--purple-primary)] font-extrabold"
                                                    : cell.isCurrentMonth
                                                    ? "text-[var(--text-primary)]"
                                                    : "text-[var(--text-muted)]"
                                            }`}
                                        >
                                            {cell.day}
                                        </span>

                                        {cell.isToday && !isSelected && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--purple-primary)]" />
                                        )}
                                    </div>

                                    {/* Event Badges */}
                                    <div className="w-full space-y-1 mt-1">
                                        {cell.events.slice(0, 2).map((ev) => (
                                            <div
                                                key={ev.id}
                                                className={`text-[9px] sm:text-[10px] font-semibold truncate px-1.5 py-0.5 rounded-md border ${
                                                    ev.type === "recorded"
                                                        ? "bg-[var(--mint-soft)] text-[var(--mint-text)] border-[var(--mint-primary)]/30"
                                                        : "bg-[var(--purple-bg)] text-[var(--purple-primary)] border-[var(--purple-soft)] dark:bg-[#2F2755] dark:text-[#C5BCFF]"
                                                }`}
                                            >
                                                {ev.title}
                                            </div>
                                        ))}

                                        {cell.events.length > 2 && (
                                            <span className="text-[9px] font-bold text-[var(--text-muted)] pl-0.5 block">
                                                +{cell.events.length - 2} more
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right (4 cols on lg): Selected Date Agenda & Meeting Inspector */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="soft-card p-5 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_4px_25px_rgba(102,86,199,0.04)] space-y-4">
                        {/* Day Header */}
                        <div className="border-b border-[var(--border-subtle)] dark:border-[#2D2A4A] pb-3">
                            <span className="text-[11px] uppercase tracking-wider font-bold text-[var(--purple-primary)]">
                                Selected Date
                            </span>
                            <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                                {formattedSelectedDate}
                            </h3>
                            <p className="text-xs text-[var(--text-muted)]">
                                {selectedDayEvents.length} session{selectedDayEvents.length === 1 ? "" : "s"} scheduled or recorded
                            </p>
                        </div>

                        {/* Meetings on this Date */}
                        <div className="space-y-3 max-h-[460px] overflow-y-auto no-scrollbar">
                            {selectedDayEvents.length === 0 ? (
                                <div className="py-8 text-center space-y-3">
                                    <div className="w-10 h-10 rounded-2xl bg-[var(--purple-subtle)] dark:bg-[#28214A] text-[var(--purple-primary)] mx-auto flex items-center justify-center">
                                        <CalendarCheck className="w-5 h-5 opacity-70" />
                                    </div>
                                    <p className="text-xs text-[var(--text-muted)] max-w-[200px] mx-auto">
                                        No meetings scheduled for this date.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewDate(selectedDateStr);
                                            setIsScheduleOpen(true);
                                        }}
                                        className="btn-secondary !text-xs !py-1.5 !px-3 cursor-pointer"
                                    >
                                        + Schedule for this Day
                                    </button>
                                </div>
                            ) : (
                                selectedDayEvents.map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="p-3.5 rounded-2xl bg-[var(--purple-subtle)]/50 dark:bg-[#25203F] border border-[var(--border-soft)] dark:border-[#332C55] space-y-2.5 transition-all hover:border-[var(--purple-primary)]/50"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span
                                                        className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                                            ev.type === "recorded"
                                                                ? "bg-[var(--mint-soft)] text-[var(--mint-text)]"
                                                                : "bg-[var(--purple-bg)] text-[var(--purple-primary)] dark:bg-[#342A5C] dark:text-[#B4A7FF]"
                                                        }`}
                                                    >
                                                        {ev.type === "recorded" ? "Recorded" : "Upcoming"}
                                                    </span>
                                                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {ev.time} ({ev.duration})
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-2">
                                                    {ev.title}
                                                </h4>
                                            </div>
                                        </div>

                                        {ev.description && (
                                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                                                {ev.description}
                                            </p>
                                        )}

                                        {/* Action Button */}
                                        {ev.type === "recorded" && ev.meetingId ? (
                                            <ShimmerButton
                                                type="button"
                                                onClick={() => onSelectMeeting?.(ev.meetingId!)}
                                                borderRadius="12px"
                                                shimmerDuration="2.5s"
                                                className="w-full !mt-1.5 !py-2 !px-3 !rounded-xl !text-xs !font-bold flex items-center justify-center gap-2 shadow-xs"
                                            >
                                                <span>Open Meeting Workspace</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </ShimmerButton>
                                        ) : (
                                            <div className="flex items-center gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={onUploadNew}
                                                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-white dark:bg-[#1C1A2E] border border-[var(--border-soft)] dark:border-[#38315E] text-[11px] font-semibold text-[var(--text-primary)] hover:border-[var(--purple-primary)] transition-all text-center cursor-pointer"
                                                >
                                                    Upload Recording
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 4. SCHEDULE MEETING MODAL ── */}
            {isScheduleOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="soft-card p-6 bg-white dark:bg-[#1E1B2E] border border-[var(--border-soft)] dark:border-[#2D2A4A] max-w-md w-full space-y-5 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] dark:border-[#2D2A4A]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-[var(--purple-bg)] dark:bg-[#2C2448] text-[var(--purple-primary)] flex items-center justify-center">
                                    <CalendarIcon className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                                    Schedule New Meeting
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsScheduleOpen(false)}
                                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSchedule} className="space-y-3.5 text-xs">
                            <div>
                                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                                    Meeting Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Reservoir Permeability Sync"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252042] border border-[var(--border-soft)] dark:border-[#382F66] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--purple-primary)]/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-[var(--text-primary)] block mb-1">
                                        Date
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252042] border border-[var(--border-soft)] dark:border-[#382F66] text-[var(--text-primary)] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-[var(--text-primary)] block mb-1">
                                        Time
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="10:00 AM"
                                        value={newTime}
                                        onChange={(e) => setNewTime(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252042] border border-[var(--border-soft)] dark:border-[#382F66] text-[var(--text-primary)] outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                                    Estimated Duration
                                </label>
                                <input
                                    type="text"
                                    placeholder="30 min"
                                    value={newDuration}
                                    onChange={(e) => setNewDuration(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252042] border border-[var(--border-soft)] dark:border-[#382F66] text-[var(--text-primary)] outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                                    Attendees
                                </label>
                                <input
                                    type="text"
                                    placeholder="Sarah Lee, Nakul Githesh"
                                    value={newAttendees}
                                    onChange={(e) => setNewAttendees(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252042] border border-[var(--border-soft)] dark:border-[#382F66] text-[var(--text-primary)] outline-none"
                                />
                            </div>

                            <div>
                                <label className="font-semibold text-[var(--text-primary)] block mb-1">
                                    Description / Agenda Notes
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Discuss telemetry protocol and data validation..."
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl bg-[var(--purple-subtle)] dark:bg-[#252042] border border-[var(--border-soft)] dark:border-[#382F66] text-[var(--text-primary)] outline-none resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                     type="button"
                                     onClick={() => setIsScheduleOpen(false)}
                                     className="btn-secondary !text-xs !py-2 !px-3.5 cursor-pointer"
                                 >
                                     Cancel
                                 </button>
                                 <ShimmerButton
                                     type="submit"
                                     borderRadius="12px"
                                     shimmerDuration="2.5s"
                                     className="!text-xs !py-2 !px-4 !rounded-xl shadow-sm"
                                 >
                                     Save to Calendar
                                 </ShimmerButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
