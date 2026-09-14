"use client";

import React, { useEffect, useState } from "react";
import { Timer, Zap } from "lucide-react";

export function CountdownTimer({
  targetDate,
  onComplete,
}: {
  targetDate: string | null;
  onComplete?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    minutes: number;
    seconds: number;
    totalSeconds: number;
  }>({ minutes: 0, seconds: 0, totalSeconds: 0 });

  useEffect(() => {
    if (!targetDate) return;

    const targetTime = new Date(targetDate).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = Math.max(0, targetTime - now);
      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setTimeLeft({ minutes, seconds, totalSeconds });

      if (totalSeconds <= 0) {
        if (onComplete) onComplete();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (!targetDate) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-slate-400 font-mono text-sm animate-pulse">
        <Timer className="w-4 h-4 text-amber-400 animate-spin" />
        <span>WAITING FOR FINAL COUNTDOWN SIGNAL...</span>
      </div>
    );
  }

  const isCritical = timeLeft.totalSeconds <= 10 && timeLeft.totalSeconds > 0;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-950/80 border border-amber-500/30 rounded-2xl glow-gold">
      <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-widest mb-2">
        <Zap className="w-4 h-4 animate-bounce" />
        <span>SYNCHRONIZED FINAL COUNTDOWN</span>
      </div>

      <div
        className={`font-mono font-black text-5xl sm:text-6xl tracking-wider ${
          isCritical
            ? "text-rose-500 animate-ping"
            : timeLeft.totalSeconds === 0
            ? "text-emerald-400"
            : "text-amber-400"
        }`}
      >
        {String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </div>

      <p className="mt-3 text-xs font-mono text-slate-400 text-center">
        {timeLeft.totalSeconds > 0
          ? "All finalist clocks synchronized. Ready your expedition team."
          : "FINAL CLUE IS LIVE! PROCEED IMMEDIATELY!"}
      </p>
    </div>
  );
}
