/**
 * Centralized speaker color palette and timestamp utility helpers
 * Ensures 100% consistent speaker colors across Transcript, Timeline, Media Player, and Speaker Lists.
 */

export interface SpeakerColorConfig {
    name: string;
    avatarBg: string;
    avatarText: string;
    border: string;
    badgeBg: string;
    nameColor: string;
    hex: string;
    barBg: string;
    auroraHex: string;
}

export const SPEAKER_COLOR_PALETTE: SpeakerColorConfig[] = [
    {
        name: "Purple",
        avatarBg: "bg-[#EFEBFB] dark:bg-[#252042]",
        avatarText: "text-[#6656C7] dark:text-[#A79AF4]",
        border: "border-[#D9D4F4] dark:border-[#4B3F7E]",
        badgeBg: "bg-[#F4F2FC] dark:bg-[#2C2448]",
        nameColor: "text-[#6656C7] dark:text-[#A79AF4]",
        hex: "#6656C7",
        barBg: "bg-[#6656C7]",
        auroraHex: "#8B5CF6",
    },
    {
        name: "Blue",
        avatarBg: "bg-[#DDE7FA] dark:bg-[#203354]",
        avatarText: "text-[#3D6AB5] dark:text-[#7EB0F7]",
        border: "border-[#C5D7F8] dark:border-[#2C4875]",
        badgeBg: "bg-[#F0F5FD] dark:bg-[#1A2942]",
        nameColor: "text-[#3D6AB5] dark:text-[#7EB0F7]",
        hex: "#3D6AB5",
        barBg: "bg-[#3D6AB5]",
        auroraHex: "#3B82F6",
    },
    {
        name: "Mint",
        avatarBg: "bg-[#DDF4EB] dark:bg-[#1C4135]",
        avatarText: "text-[#238561] dark:text-[#52D2A2]",
        border: "border-[#BEEBD8] dark:border-[#245C4B]",
        badgeBg: "bg-[#F2FAF6] dark:bg-[#163329]",
        nameColor: "text-[#238561] dark:text-[#52D2A2]",
        hex: "#238561",
        barBg: "bg-[#238561]",
        auroraHex: "#10B981",
    },
    {
        name: "Pink",
        avatarBg: "bg-[#FDE8EE] dark:bg-[#4E2231]",
        avatarText: "text-[#C8466E] dark:text-[#F37B9F]",
        border: "border-[#F8CAD7] dark:border-[#6C2B42]",
        badgeBg: "bg-[#FCF2F5] dark:bg-[#3B1A25]",
        nameColor: "text-[#C8466E] dark:text-[#F37B9F]",
        hex: "#C8466E",
        barBg: "bg-[#C8466E]",
        auroraHex: "#F43F5E",
    },
    {
        name: "Amber",
        avatarBg: "bg-[#FEF3D6] dark:bg-[#4A3B19]",
        avatarText: "text-[#B45309] dark:text-[#FBBF24]",
        border: "border-[#FDE68A] dark:border-[#6A5323]",
        badgeBg: "bg-[#FFFBEB] dark:bg-[#382C13]",
        nameColor: "text-[#B45309] dark:text-[#FBBF24]",
        hex: "#B45309",
        barBg: "bg-[#B45309]",
        auroraHex: "#F59E0B",
    },
    {
        name: "Sky",
        avatarBg: "bg-[#E0F2FE] dark:bg-[#1B3B52]",
        avatarText: "text-[#0369A1] dark:text-[#38BDF8]",
        border: "border-[#BAE6FD] dark:border-[#235070]",
        badgeBg: "bg-[#F0F9FF] dark:bg-[#142A3B]",
        nameColor: "text-[#0369A1] dark:text-[#38BDF8]",
        hex: "#0369A1",
        barBg: "bg-[#0369A1]",
        auroraHex: "#0EA5E9",
    },
];

export function cleanSpeakerName(raw: string): string {
    return (raw || "")
        .replace(/\s*[\(\[]?\d{1,2}:\d{2}(?::\d{2})?[\)\]]?/g, "")
        .replace(/^Speaker\s+/i, "Speaker ")
        .trim();
}

/**
 * Deterministically get a color configuration for any speaker name or index
 */
export function getSpeakerColor(speaker: string, fallbackIndex = 0): SpeakerColorConfig {
    const cleaned = cleanSpeakerName(speaker).toLowerCase();
    
    // Standard names mapped to signature colors
    if (cleaned.includes("nakul") || cleaned.includes("speaker 1") || cleaned.includes("john")) {
        return SPEAKER_COLOR_PALETTE[0]; // Purple
    }
    if (cleaned.includes("lead") || cleaned.includes("engineer") || cleaned.includes("ananya") || cleaned.includes("alex") || cleaned.includes("speaker 2")) {
        return SPEAKER_COLOR_PALETTE[1]; // Blue
    }
    if (cleaned.includes("rahul") || cleaned.includes("michael") || cleaned.includes("speaker 3")) {
        return SPEAKER_COLOR_PALETTE[2]; // Mint
    }
    if (cleaned.includes("priya") || cleaned.includes("sarah") || cleaned.includes("jane") || cleaned.includes("speaker 4")) {
        return SPEAKER_COLOR_PALETTE[3]; // Pink
    }
    if (cleaned.includes("speaker 5")) {
        return SPEAKER_COLOR_PALETTE[4]; // Amber
    }
    if (cleaned.includes("speaker 6")) {
        return SPEAKER_COLOR_PALETTE[5]; // Sky
    }

    // Hash-based index fallback for arbitrary speaker names
    let hash = 0;
    for (let i = 0; i < cleaned.length; i++) {
        hash = (hash << 5) - hash + cleaned.charCodeAt(i);
        hash |= 0;
    }
    const idx = Math.abs(hash + fallbackIndex) % SPEAKER_COLOR_PALETTE.length;
    return SPEAKER_COLOR_PALETTE[idx];
}

/**
 * Format seconds into mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hrs > 0) {
        return `${hrs}:${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;
    }
    return `${mins < 10 ? "0" + mins : mins}:${secs < 10 ? "0" + secs : secs}`;
}

/**
 * Parse strings like "10:24", "01:25:30", "00:45 - 01:20" to seconds
 */
export function parseTimestampToSeconds(str: string): number | null {
    if (!str) return null;
    const clean = str.trim();
    // In case of range "00:00 - 00:45", take the start
    const firstPart = clean.split("-")[0].trim();
    const match = firstPart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return null;

    if (match[3] !== undefined) {
        // hh:mm:ss
        return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    }
    // mm:ss
    return Number(match[1]) * 60 + Number(match[2]);
}
