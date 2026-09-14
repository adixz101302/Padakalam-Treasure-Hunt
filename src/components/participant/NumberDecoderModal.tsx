"use client";

import React, { useState } from "react";
import { Binary, X, Sparkles } from "lucide-react";

const ALPHABET_MAP: Record<number, string> = {
  1: "A", 2: "B", 3: "C", 4: "D", 5: "E", 6: "F", 7: "G", 8: "H", 9: "I", 10: "J",
  11: "K", 12: "L", 13: "M", 14: "N", 15: "O", 16: "P", 17: "Q", 18: "R", 19: "S", 20: "T",
  21: "U", 22: "V", 23: "W", 24: "X", 25: "Y", 26: "Z",
};

export function NumberDecoderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [testInput, setTestInput] = useState("");

  if (!isOpen) return null;

  // Auto-decode input
  const decodedResult = testInput
    .split(/[\s,-]+/)
    .map((numStr) => {
      const n = parseInt(numStr.trim(), 10);
      return ALPHABET_MAP[n] || "";
    })
    .join("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-amber-500/40 rounded-2xl p-6 shadow-2xl glow-gold max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-750 pb-4 mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Binary className="w-5 h-5" />
            <h3 className="font-mono font-bold tracking-wider text-base uppercase">
              A1Z26 Cipher Reference
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Interactive Decoder */}
        <div className="mb-6 bg-slate-900/90 border border-slate-700 rounded-xl p-4">
          <label className="block text-xs font-mono text-amber-400/90 mb-2 uppercase">
            Quick Live Decoder
          </label>
          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="e.g. 16 - 1 - 18 - 11"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {decodedResult && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-mono text-slate-300">Decoded:</span>
                <span className="text-base font-mono font-bold text-amber-400 tracking-widest uppercase">
                  {decodedResult}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cipher Chart Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {Object.entries(ALPHABET_MAP).map(([num, letter]) => (
            <div
              key={num}
              className="flex items-center justify-between px-2.5 py-1.5 bg-slate-900/60 border border-slate-800 rounded-lg text-xs font-mono"
            >
              <span className="text-amber-400/90 font-bold">{num}</span>
              <span className="text-slate-500">=</span>
              <span className="text-white font-bold text-sm">{letter}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl uppercase tracking-wider transition"
        >
          Close Decoder
        </button>
      </div>
    </div>
  );
}
