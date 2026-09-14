"use client";

import React from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineGuard } from "@/components/OfflineGuard";

/**
 * Wraps the entire application with:
 * 1. ErrorBoundary — catches any React UI crash and shows a styled recovery screen
 *    instead of a blank white page. Users can tap "Retry" to recover instantly.
 * 2. OfflineGuard — detects when the phone loses internet (very common outdoors)
 *    and shows a fullscreen "CONNECTION LOST" overlay that auto-dismisses when signal returns.
 */
export default function ClientSafetyWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary fallbackTitle="MISSION SYSTEM ERROR">
      <OfflineGuard>{children}</OfflineGuard>
    </ErrorBoundary>
  );
}
