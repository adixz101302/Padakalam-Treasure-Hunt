"use client";

import React, { useEffect } from "react";
import confetti from "canvas-confetti";
import { Trophy, Crown, Sparkles } from "lucide-react";

export function VictoryModal({
  winner,
  isOpen,
  onClose,
}: {
  winner: {
    teamId: string;
    teamName: string;
    position?: number;
    declaredAt?: string;
  } | null;
  isOpen: boolean;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!isOpen || !winner) return;

    // Trigger celebratory golden confetti blast
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#F59E0B", "#FBBF24", "#FDE68A", "#FFFFFF"],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#F59E0B", "#FBBF24", "#FDE68A", "#FFFFFF"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  }, [isOpen, winner]);

  if (!isOpen || !winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#090D16] border-2 border-amber-400 rounded-3xl p-8 shadow-2xl glow-gold-lg text-center overflow-hidden">
        {/* Glow Header */}
        <div className="flex justify-center mb-4">
          <div className="relative p-5 bg-amber-500/20 rounded-full border border-amber-400/50 shadow-inner">
            <Crown className="w-12 h-12 text-amber-400 animate-bounce" />
            <Sparkles className="absolute top-2 right-2 w-5 h-5 text-amber-300 animate-spin" />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/40 rounded-full text-amber-400 font-mono text-xs uppercase tracking-widest mb-3">
          <Trophy className="w-3.5 h-3.5" />
          <span>EXPEDITION COMPLETED</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-mono font-black text-white uppercase tracking-tight mb-2">
          THE HUNT IS OVER
        </h2>

        <p className="text-sm font-mono text-slate-300 mb-6">
          The physical treasure chest has been unlocked and claimed!
        </p>

        {/* Winner Highlight Card */}
        <div className="p-6 bg-slate-900/90 border border-amber-500/50 rounded-2xl glow-gold mb-6">
          <span className="block text-xs font-mono text-amber-400/80 uppercase tracking-widest mb-1">
            OFFICIAL CHAMPION
          </span>
          <h3 className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-wider">
            {winner.teamName}
          </h3>
          <span className="inline-block mt-2 px-3 py-1 bg-slate-800 text-slate-300 font-mono text-xs rounded-md">
            TEAM ID: {winner.teamId}
          </span>
        </div>

        {winner.declaredAt && (
          <p className="text-xs font-mono text-slate-500 mb-6">
            Official Victory Recorded: {new Date(winner.declaredAt).toLocaleTimeString()}
          </p>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-mono font-bold text-sm rounded-xl uppercase tracking-wider transition shadow-lg"
          >
            View Expedition Summary
          </button>
        )}
      </div>
    </div>
  );
}
