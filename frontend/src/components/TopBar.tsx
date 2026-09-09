"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, User, Settings, Sparkles, Moon, Sun, PanelLeftOpen } from "lucide-react";
import { AnimatedThemeToggler, type TransitionVariant } from "@/registry/magicui/animated-theme-toggler";
import type { UserProfile } from "@/types/meeting";

interface TopBarProps {
    searchQuery?: string;
    onSearchChange?: (q: string) => void;
    showSearch?: boolean;
    currentTheme?: "light" | "dark" | "system";
    isDarkMode?: boolean;
    onToggleTheme?: () => void;
    onThemeChange?: (theme: "light" | "dark") => void;
    transitionVariant?: TransitionVariant;
    userProfile?: UserProfile;
    onOpenProfileSettings?: () => void;
    isSidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

export default function TopBar({
    searchQuery = "",
    onSearchChange,
    showSearch = true,
    isDarkMode = false,
    onToggleTheme,
    onThemeChange,
    transitionVariant = "circle",
    userProfile = {
        name: "Sarah Lee",
        email: "sarah@tubikstudio.com",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
        role: "Product Designer",
    },
    onOpenProfileSettings,
    isSidebarCollapsed = false,
    onToggleSidebar,
}: TopBarProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cmd + K keyboard shortcut to focus search input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <header className="sticky top-0 z-40 h-20 bg-transparent px-8 flex items-center justify-between gap-4 transition-all">
            {/* Left: Floating Search Bar matching 1st Image */}
            {showSearch ? (
                <div className="relative flex-1 max-w-md">
                    <div className="w-full bg-white/90 dark:bg-[#1E1B2E]/90 backdrop-blur-md rounded-2xl border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-3.5 py-2.5 flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-[var(--purple-primary)]/20 focus-within:border-[var(--purple-light)]">
                        <Search className="w-4 h-4 text-[var(--text-placeholder)] shrink-0" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => onSearchChange?.(e.target.value)}
                            placeholder="Find any meeting moment..."
                            className="w-full text-xs bg-transparent text-[var(--text-primary)] placeholder-[var(--text-placeholder)] outline-none"
                        />
                        <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono font-medium text-[var(--text-muted)] bg-[var(--purple-subtle)] dark:bg-[#252238] px-2 py-0.5 rounded-lg border border-[var(--border-subtle)] dark:border-[#322E4D] shrink-0 select-none">
                            Cmd + K
                        </kbd>
                    </div>
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {/* Right: Theme Toggle Button + Profile Card */}
            <div className="flex items-center gap-3.5">
                {/* Theme Toggler Button in soft rounded-2xl card */}
                <div
                    className="w-10 h-10 rounded-2xl bg-white/90 dark:bg-[#1E1B2E]/90 backdrop-blur-md border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex items-center justify-center hover:shadow-md transition-all shrink-0"
                    title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    <AnimatedThemeToggler
                        theme={isDarkMode ? "dark" : "light"}
                        onThemeChange={(newTheme) => {
                            if (onThemeChange) {
                                onThemeChange(newTheme);
                            } else if (onToggleTheme) {
                                onToggleTheme();
                            }
                        }}
                        variant={transitionVariant}
                        duration={450}
                    />
                </div>

                {/* Profile Card matching 1st Image */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        suppressHydrationWarning
                        className="bg-white/90 dark:bg-[#1E1B2E]/90 hover:bg-white dark:hover:bg-[#252238] backdrop-blur-md rounded-2xl border border-[var(--border-soft)] dark:border-[#2D2A4A] px-3.5 py-1.5 flex items-center gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer select-none group"
                        aria-expanded={isProfileOpen}
                        aria-label="User Profile menu"
                    >
                        {/* Avatar Image */}
                        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-[var(--border-subtle)] dark:border-[#332E52] bg-[var(--purple-subtle)]">
                            {userProfile.avatarUrl ? (
                                <img
                                    src={userProfile.avatarUrl}
                                    alt={userProfile.name}
                                    className="w-full h-full object-cover"
                                    suppressHydrationWarning
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center font-bold text-xs text-[var(--purple-primary)]" suppressHydrationWarning>
                                    {userProfile.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Name & Email */}
                        <div className="flex flex-col text-left min-w-[90px] max-w-[150px]">
                            <span className="text-xs font-bold text-[var(--text-primary)] leading-tight truncate" suppressHydrationWarning>
                                {userProfile.name}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] leading-tight truncate font-normal" suppressHydrationWarning>
                                {userProfile.email}
                            </span>
                        </div>

                        {/* Chevron Icon */}
                        <ChevronDown
                            className={`w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform duration-200 ${
                                isProfileOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {/* Interactive Profile Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-white dark:bg-[#1E1B2E] rounded-2xl border border-[var(--border-soft)] dark:border-[#2D2A4A] shadow-[0_12px_36px_rgba(0,0,0,0.12)] z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                            {/* Profile Header */}
                            <div className="flex items-center gap-3 p-2 rounded-xl bg-[var(--purple-subtle)]/40 dark:bg-[#252238]/60">
                                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-[var(--border-subtle)] dark:border-[#332E52]">
                                    <img
                                        src={userProfile.avatarUrl}
                                        alt={userProfile.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                                        {userProfile.name}
                                    </p>
                                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                                        {userProfile.email}
                                    </p>
                                    {userProfile.role && (
                                        <span className="inline-block mt-0.5 text-[9px] font-semibold px-2 py-0.5 rounded-md bg-[var(--purple-bg)] dark:bg-[#2F2656] text-[var(--purple-primary)] dark:text-[#A79AF4]">
                                            {userProfile.role}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Dropdown Options */}
                            <div className="space-y-0.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        onOpenProfileSettings?.();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252238] rounded-xl transition-colors text-left"
                                >
                                    <User className="w-3.5 h-3.5 text-[var(--purple-primary)] dark:text-[#A79AF4]" />
                                    <span>Edit Profile in Settings</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsProfileOpen(false);
                                        onOpenProfileSettings?.();
                                    }}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--purple-subtle)] dark:hover:bg-[#252238] rounded-xl transition-colors text-left"
                                >
                                    <Settings className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                                    <span>Workspace Preferences</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
