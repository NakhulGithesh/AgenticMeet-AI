"use client";

import React from "react";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
}

export default function GlassCard({
    children,
    className = "",
    hover = false,
}: GlassCardProps) {
    return (
        <div className={`card p-6 ${hover ? "card-hover" : ""} ${className}`}>
            {children}
        </div>
    );
}
