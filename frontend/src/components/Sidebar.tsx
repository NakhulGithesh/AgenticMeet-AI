"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    LayoutGrid,
    Calendar,
    FileText,
    RotateCw,
} from "lucide-react";

export type NavItem = "home" | "calendar" | "meetings" | "settings";

interface SidebarProps {
    currentNav: NavItem;
    onNavChange: (nav: NavItem) => void;
    hasActiveMeeting?: boolean;
    activeMeetingTitle?: string;
    onOpenActiveMeeting?: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    onHoverChange?: (hovered: boolean) => void;
}

export default function Sidebar({
    currentNav,
    onNavChange,
    hasActiveMeeting,
    activeMeetingTitle = "Project Sync Call",
    onOpenActiveMeeting,
    onHoverChange,
}: SidebarProps) {
    const [isHovered, setIsHovered] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setIsHovered(true);
        onHoverChange?.(true);
    };

    const handleMouseLeave = () => {
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
            onHoverChange?.(false);
        }, 140);
    };

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        };
    }, []);

    const dockWidth = 68;
    const dockHeight = 310;
    const c = 38;

    // Organic liquid S-curve for the compact dock in the middle
    const svgPath = `M 0 0 C 0 ${c * 0.5}, ${dockWidth} ${c * 0.35}, ${dockWidth} ${c} L ${dockWidth} ${dockHeight - c} C ${dockWidth} ${dockHeight - c * 0.35}, 0 ${dockHeight - c * 0.5}, 0 ${dockHeight} Z`;

    return (
        <aside
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`fixed left-0 z-40 transition-all duration-300 ease-in-out select-none overflow-hidden ${
                isHovered
                    ? "top-0 translate-y-0 h-screen w-[220px] bg-[#6656C7] dark:bg-[#5846B8] rounded-r-[32px] py-6 px-4 shadow-[6px_0_28px_rgba(102,86,199,0.32)] flex flex-col justify-between"
                    : "top-1/2 -translate-y-1/2 w-[68px] h-[310px] flex flex-col justify-center items-center py-6 px-3"
            }`}
            style={{
                ...(!isHovered ? { filter: "drop-shadow(5px 0 22px rgba(102, 86, 199, 0.32))" } : {}),
            }}
        >
            {/* Background for Collapsed Dock: Organic Fluid S-curve */}
            {!isHovered && (
                <svg
                    viewBox={`0 0 ${dockWidth} ${dockHeight}`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ overflow: "visible" }}
                >
                    <defs>
                        <linearGradient id="purpleDockGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#6C5CE7" />
                            <stop offset="100%" stopColor="#5848C0" />
                        </linearGradient>
                    </defs>
                    <path d={svgPath} fill="url(#purpleDockGrad)" />
                </svg>
            )}

            {/* When Expanded: Header Brand at Top */}
            {isHovered && (
                <div className="relative z-10 flex items-center gap-2.5 px-2 mb-6 animate-in fade-in duration-200">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#6656C7] flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                        •••
                    </div>
                    <span className="text-[15px] font-bold text-white tracking-tight truncate">
                        AgenticMeet AI
                    </span>
                </div>
            )}

            {/* Navigation Items Stack */}
            <div className={`relative z-10 w-full ${isHovered ? "flex-1 flex flex-col justify-center" : ""}`}>
                <nav className={`w-full flex flex-col gap-3.5 ${isHovered ? "px-1" : "items-center"}`}>
                    {/* 1. Dashboard — Active White Squircle Card */}
                    <button
                        type="button"
                        onClick={() => onNavChange("home")}
                        className={`transition-all duration-200 cursor-pointer ${
                            isHovered
                                ? `w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 text-xs ${
                                      currentNav === "home"
                                          ? "bg-white text-[#6656C7] font-bold shadow-md scale-[1.02]"
                                          : "text-white/85 hover:text-white hover:bg-white/15 font-semibold"
                                  }`
                                : `w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                      currentNav === "home"
                                          ? "bg-white text-[#6656C7] shadow-lg scale-105"
                                          : "text-white/80 hover:text-white hover:bg-white/15"
                                  }`
                        }`}
                        title="Dashboard"
                    >
                        <LayoutGrid className="w-5 h-5 shrink-0" />
                        {isHovered && <span className="truncate font-bold">Dashboard</span>}
                    </button>

                    {/* 2. Calendar */}
                    <button
                        type="button"
                        onClick={() => onNavChange("calendar")}
                        className={`transition-all duration-200 cursor-pointer ${
                            isHovered
                                ? `w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 text-xs ${
                                      currentNav === "calendar"
                                          ? "bg-white text-[#6656C7] font-bold shadow-md scale-[1.02]"
                                          : "text-white/85 hover:text-white hover:bg-white/15 font-semibold"
                                  }`
                                : `w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                      currentNav === "calendar"
                                          ? "bg-white text-[#6656C7] shadow-lg scale-105"
                                          : "text-white/80 hover:text-white hover:bg-white/15"
                                  }`
                        }`}
                        title="Calendar"
                    >
                        <Calendar className="w-5 h-5 shrink-0" />
                        {isHovered && <span className="truncate">Calendar</span>}
                    </button>

                    {/* 4. Meetings */}
                    <button
                        type="button"
                        onClick={() => onNavChange("meetings")}
                        className={`transition-all duration-200 cursor-pointer ${
                            isHovered
                                ? `w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 text-xs ${
                                      currentNav === "meetings"
                                          ? "bg-white text-[#6656C7] font-bold shadow-md scale-[1.02]"
                                          : "text-white/85 hover:text-white hover:bg-white/15 font-semibold"
                                  }`
                                : `w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                      currentNav === "meetings"
                                          ? "bg-white text-[#6656C7] shadow-lg scale-105"
                                          : "text-white/80 hover:text-white hover:bg-white/15"
                                  }`
                        }`}
                        title="Meetings"
                    >
                        <FileText className="w-5 h-5 shrink-0" />
                        {isHovered && <span className="truncate">Meetings</span>}
                    </button>

                    {/* 5. Settings */}
                    <button
                        type="button"
                        onClick={() => onNavChange("settings")}
                        className={`transition-all duration-200 cursor-pointer ${
                            isHovered
                                ? `w-full rounded-2xl px-3.5 py-2.5 flex items-center gap-3 text-xs ${
                                      currentNav === "settings"
                                          ? "bg-white text-[#6656C7] font-bold shadow-md scale-[1.02]"
                                          : "text-white/85 hover:text-white hover:bg-white/15 font-semibold"
                                  }`
                                : `w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                                      currentNav === "settings"
                                          ? "bg-white text-[#6656C7] shadow-lg scale-105"
                                          : "text-white/80 hover:text-white hover:bg-white/15"
                                  }`
                        }`}
                        title="Settings"
                    >
                        <RotateCw className="w-5 h-5 shrink-0" />
                        {isHovered && <span className="truncate">Settings</span>}
                    </button>
                </nav>
            </div>

            {/* When Expanded: Bottom Live Meeting Card */}
            {isHovered && hasActiveMeeting && (
                <div className="relative z-10 pt-4 border-t border-white/20 animate-in fade-in duration-200">
                    <button
                        type="button"
                        onClick={onOpenActiveMeeting}
                        className="w-full text-left p-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all group cursor-pointer shadow-xs"
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
                            <span className="text-[10px] font-bold text-white/90">LIVE</span>
                        </div>
                        <p className="text-xs font-bold line-clamp-1 text-white">
                            {activeMeetingTitle}
                        </p>
                        <span className="text-[10px] text-white/70">
                            Click to open
                        </span>
                    </button>
                </div>
            )}
        </aside>
    );
}
