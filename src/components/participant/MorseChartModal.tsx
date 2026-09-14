"use client";

import React from "react";
import { Radio, X } from "lucide-react";

const MORSE_CODE_CHART: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
};

export function MorseChartModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0F172A] border border-amber-500/40 rounded-2xl p-6 shadow-2xl glow-gold max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-750 pb-4 mb-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Radio className="w-5 h-5" />
            <h3 className="font-mono font-bold tracking-wider text-base uppercase">
              International Morse Reference
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Object.entries(MORSE_CODE_CHART).map(([char, code]) => (
            <div
              key={char}
              className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg text-xs font-mono"
            >
              <span className="text-amber-400 font-bold text-sm">{char}</span>
              <span className="text-white font-bold tracking-widest text-sm">{code}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl uppercase tracking-wider transition"
        >
          Close Chart
        </button>
      </div>
    </div>
  );
}
