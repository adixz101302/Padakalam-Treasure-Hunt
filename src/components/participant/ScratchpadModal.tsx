"use client";

import React, { useState } from "react";
import { Edit3, X, ArrowLeftRight, RotateCcw } from "lucide-react";

export function ScratchpadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [scratchText, setScratchText] = useState("");
  const [reversedText, setReversedText] = useState("");

  if (!isOpen) return null;

  const handleReverse = () => {
    setReversedText(scratchText.split("").reverse().join(""));
  };

  const handleClear = () => {
    setScratchText("");
    setReversedText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#0F172A] border border-amber-500/40 rounded-2xl p-6 shadow-2xl glow-gold">
        <div className="flex items-center justify-between border-b border-slate-750 pb-4 mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Edit3 className="w-5 h-5" />
            <h3 className="font-mono font-bold tracking-wider text-base uppercase">
              Tactical Field Scratchpad
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1 uppercase">
              Field Notes / Clue Anagram Scrambler
            </label>
            <textarea
              rows={3}
              value={scratchText}
              onChange={(e) => setScratchText(e.target.value)}
              placeholder="Paste or type letters / clues here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleReverse}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2 bg-amber-500 hover:bg-amber-600 text-black font-mono font-bold text-xs rounded-xl uppercase transition"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Reverse Text
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {reversedText && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <span className="block text-xs font-mono text-slate-400 mb-1">Reversed Output:</span>
              <p className="font-mono font-bold text-amber-400 text-base break-words tracking-wider">
                {reversedText}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl uppercase tracking-wider transition"
        >
          Close Scratchpad
        </button>
      </div>
    </div>
  );
}
