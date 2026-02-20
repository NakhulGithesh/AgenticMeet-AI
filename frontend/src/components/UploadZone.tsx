"use client";

import React, { useCallback, useState } from "react";
import { Upload, FileAudio, X } from "lucide-react";

interface UploadZoneProps {
    onFileSelected: (file: File) => void;
    isUploading: boolean;
}

const ALLOWED = ["mp3", "wav", "mp4", "m4a"];

export default function UploadZone({ onFileSelected, isUploading }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

    const handleUpload = () => {
        if (selectedFile) onFileSelected(selectedFile);
    };

    const ext = selectedFile?.name.split(".").pop()?.toLowerCase() || "";
    const isValid = selectedFile && ALLOWED.includes(ext);

    return (
        <div className="max-w-2xl mx-auto">
            {/* Upload card */}
            <div className="card p-8">
                {/* Upload dashed area */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`upload-zone relative p-10 text-center cursor-pointer ${isDragging ? "dragging" : ""}`}
                >
                    <input
                        type="file"
                        accept=".mp3,.wav,.mp4,.m4a"
                        onChange={handleFileInput}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-10 h-10 mx-auto mb-4 text-[var(--text-muted)]" />
                    <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                        Upload a file to generate a transcript
                    </h2>
                    <p className="text-sm text-[var(--text-muted)] mb-5">
                        Browse or drag and drop <strong>MP3</strong>, <strong>M4A</strong>, <strong>WAV</strong>, <strong>MP4</strong> or <strong>WEBM</strong> files. (Max video size: 100 MB, Max audio size: 500 MB)
                    </p>
                    <button
                        className="btn-primary"
                        onClick={(e) => {
                            e.stopPropagation();
                            const input = (e.currentTarget.parentElement?.querySelector("input[type=file]") as HTMLInputElement);
                            input?.click();
                        }}
                    >
                        Browse Files
                    </button>
                </div>

                {/* Selected file preview */}
                {selectedFile && (
                    <div className="mt-5">
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]">
                            <div className="flex items-center gap-3">
                                <FileAudio className="w-8 h-8 text-[var(--accent-purple)]" />
                                <div>
                                    <p className="font-medium text-sm text-[var(--text-primary)]">{selectedFile.name}</p>
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedFile(null)}
                                className="p-1.5 rounded-lg hover:bg-[var(--border-light)] transition-colors"
                            >
                                <X className="w-4 h-4 text-[var(--text-muted)]" />
                            </button>
                        </div>

                        {!isValid && (
                            <p className="mt-2 text-sm text-[var(--accent-red)]">
                                ⚠️ Unsupported file type. Please use .mp3, .wav, .mp4, or .m4a
                            </p>
                        )}

                        <button
                            onClick={handleUpload}
                            disabled={!isValid || isUploading}
                            className="btn-primary mt-4 w-full"
                        >
                            {isUploading ? "Uploading..." : "🚀 Start AI Analysis"}
                        </button>
                    </div>
                )}
            </div>

            {/* Recent uploads placeholder */}
            <div className="mt-8 text-center py-12">
                <div className="w-16 h-12 mx-auto mb-4 text-[var(--border-medium)] opacity-40">
                    <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="8" y="8" width="48" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
                        <rect x="16" y="0" width="32" height="8" rx="2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                </div>
                <p className="text-base font-semibold text-[var(--text-primary)]">
                    You have no recent uploads!
                </p>
            </div>
        </div>
    );
}
