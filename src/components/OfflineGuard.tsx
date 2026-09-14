"use client";

import React, { useEffect, useState } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

/**
 * Displays a full-screen offline fallback overlay when the user's device loses internet.
 * Automatically dismisses itself when the connection returns.
 * Shows a reassuring message that progress is saved server-side.
 */
export function OfflineGuard({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const goOnline = () => {
      setIsOnline(true);
      // Show a brief "Reconnected!" toast before hiding overlay
      if (wasOffline) {
        setTimeout(() => setWasOffline(false), 2000);
      }
    };
    const goOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [wasOffline]);

  return (
    <>
      {children}

      {/* Offline overlay */}
      {!isOnline && (
        <div className="fixed inset-0 z-[9999] bg-[#070A11]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#0F172A] border-2 border-amber-500/40 rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-full border border-amber-400/30 mb-5 relative">
              <WifiOff className="w-10 h-10 text-amber-400" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-[#0F172A] animate-pulse" />
            </div>
            <h2 className="text-xl font-mono font-black text-white uppercase tracking-wider mb-2">
              CONNECTION LOST
            </h2>
            <p className="text-sm font-mono text-slate-400 mb-4 leading-relaxed">
              Your phone lost internet connection. Walk to a spot with better signal — the app will <span className="text-amber-400 font-bold">reconnect automatically</span>.
            </p>
            <div className="p-3 bg-slate-950/80 border border-slate-700 rounded-xl mb-5">
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-amber-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                SEARCHING FOR SIGNAL...
              </div>
            </div>
            <p className="text-xs font-mono text-slate-600 leading-relaxed">
              ✅ Your game progress is safe on the server.<br />
              ✅ No answers will be lost.<br />
              ✅ The timer does NOT count offline time against you.
            </p>
          </div>
        </div>
      )}

      {/* Reconnected toast */}
      {isOnline && wasOffline && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2 px-5 py-3 bg-emerald-500/20 border border-emerald-400/50 rounded-full shadow-lg">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-emerald-300 uppercase">
              Connection Restored!
            </span>
          </div>
        </div>
      )}
    </>
  );
}
