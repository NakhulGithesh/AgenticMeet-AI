"use client";

import React, { useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import UploadZone from "@/components/UploadZone";
import ProcessingLoader from "@/components/ProcessingLoader";
import MeetingDashboard from "@/components/MeetingDashboard";
import { uploadFile } from "@/lib/api";
import { useTask } from "@/hooks/useTask";
import type { ActiveTab, MeetingResult } from "@/types/meeting";

const tabTitles: Record<ActiveTab, string> = {
  dashboard: "Home",
  transcript: "Transcript",
  speakers: "Speakers",
  risks: "Risk Analysis",
  analytics: "Analytics",
  topics: "Topics",
  summary: "Summary",
  export: "Export",
};

export default function Home() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [localResult, setLocalResult] = useState<MeetingResult | null>(null);

  const { isCompleted, isFailed, progress, message, result, error } = useTask(taskId);

  const effectiveResult = localResult ?? result ?? null;
  const hasResults = !!(taskId && isCompleted && effectiveResult);

  const handleFileSelected = useCallback(async (file: File) => {
    setIsUploading(true);
    setLocalResult(null);
    try {
      const res = await uploadFile(file);
      setTaskId(res.task_id);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleResultUpdate = useCallback(
    (updated: Partial<MeetingResult>) => {
      setLocalResult((prev) => {
        const base = prev ?? result ?? null;
        if (!base) return null;
        return { ...base, ...updated };
      });
    },
    [result],
  );

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === "dashboard" && !hasResults) {
      setActiveTab("dashboard");
    } else {
      setActiveTab(tab);
    }
  };

  // Determine what page title to show
  const showUpload = !taskId || (!isCompleted && !isFailed && !taskId);
  const showProcessing = taskId && !isCompleted && !isFailed;
  const showDashboard = hasResults;

  let pageTitle = tabTitles[activeTab];
  if (activeTab === "dashboard" && !hasResults) pageTitle = "Uploads";
  if (showProcessing) pageTitle = "Processing...";

  return (
    <div className="flex min-h-screen bg-[var(--bg-secondary)]">
      {/* Sidebar — always visible */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hasResults={hasResults}
      />

      {/* Main content */}
      <div className="flex-1 ml-[200px] flex flex-col">
        {/* Top bar */}
        <TopBar title={pageTitle} />

        {/* Content area */}
        <main className="flex-1 p-6">
          {/* Upload state */}
          {!taskId && (
            <UploadZone
              onFileSelected={handleFileSelected}
              isUploading={isUploading}
            />
          )}

          {/* Processing state */}
          {showProcessing && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <ProcessingLoader progress={progress} message={message} />
            </div>
          )}

          {/* Error state */}
          {isFailed && (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="card p-8 max-w-md text-center">
                <p className="text-[var(--accent-red)] text-lg font-bold mb-2">
                  ❌ Processing Failed
                </p>
                <p className="text-sm text-[var(--text-muted)]">{error || "Unknown error"}</p>
                <button
                  onClick={() => {
                    setTaskId(null);
                    setLocalResult(null);
                  }}
                  className="mt-4 px-5 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm hover:bg-[var(--border-light)] transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Dashboard state */}
          {showDashboard && effectiveResult && (
            <MeetingDashboard
              taskId={taskId!}
              result={effectiveResult}
              activeTab={activeTab}
              onResultUpdate={handleResultUpdate}
            />
          )}
        </main>
      </div>
    </div>
  );
}
