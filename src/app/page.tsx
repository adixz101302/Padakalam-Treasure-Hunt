"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Shield, ArrowRight, Sparkles, Lock, AlertCircle } from "lucide-react";

export default function EntryPage() {
  const router = useRouter();
  const [teamId, setTeamId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authenticatedTeam, setAuthenticatedTeam] = useState<{
    teamId: string;
    teamName: string;
    roundNumber: number;
  } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId.trim()) {
      setError("Please enter your Team ID.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/team-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamId.trim().toUpperCase(),
          pin: pin.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid Team ID or PIN.");
        setLoading(false);
        return;
      }

      // Show team welcome card before routing
      setAuthenticatedTeam({
        teamId: data.team.teamId,
        teamName: data.team.teamName,
        roundNumber: data.team.progress?.currentRound ?? 0,
      });
    } catch {
      setError("Network error. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToHunt = () => {
    router.push("/play");
  };

  return (
    <div className="relative min-h-screen bg-[#070A11] bg-grid-pattern flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] sm:w-[500px] h-[350px] sm:h-[500px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Entry Portal Card */}
      <main className="w-full max-w-md z-10">
        {!authenticatedTeam ? (
          <div className="bg-[#0F172A]/90 border border-slate-750 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl glow-gold transition-all duration-300">
            {/* Title & Branding Section */}
            <div className="text-center mb-8">
              {/* Dual Logo Slots: MLA & Padakalam */}
              <div className="flex items-center justify-center gap-4 mb-4">
                {/* MLA Logo Slot */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/90 border border-slate-700/80 p-1.5 shadow-lg flex items-center justify-center overflow-hidden hover:border-blue-500/50 transition">
                  <img
                    src="/images/mla_logo.svg"
                    alt="MLA Logo"
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="h-8 w-[1px] bg-slate-750" />

                {/* Padakalam Logo Slot */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900/90 border border-amber-500/40 p-1.5 shadow-lg flex items-center justify-center overflow-hidden hover:border-amber-400 transition glow-gold">
                  <img
                    src="/images/padakalam_logo.svg"
                    alt="Padakalam Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Padakalam 2.0 Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full mb-3">
                <span className="text-[11px] font-mono font-black tracking-widest text-amber-400 uppercase">
                  PADAKALAM 2.0 PRESENTS
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-mono font-black tracking-tight text-white uppercase">
                ANVESHIPIN
                <span className="block text-amber-400">KANDETHUM</span>
              </h1>
              <p className="mt-2 text-xs font-mono text-slate-400 uppercase tracking-widest">
                THE HUNT BEGINS HERE.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mb-6 flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-amber-400 font-bold uppercase tracking-wider mb-2">
                  TEAM ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TEAM001"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3.5 text-base font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none transition uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  TEAM PIN <span className="text-slate-600 font-normal">(OPTIONAL)</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3.5 text-base font-mono text-white placeholder-slate-600 focus:outline-none transition"
                  />
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-[0.99] text-slate-950 font-mono font-black text-sm tracking-wider uppercase rounded-xl transition shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>AUTHENTICATING...</span>
                ) : (
                  <>
                    <span>ENTER THE HUNT</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Personalized Welcome Screen */
          <div className="bg-[#0F172A]/95 border-2 border-amber-500/50 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl glow-gold text-center animate-in zoom-in-95 duration-300">
            <div className="inline-flex p-3 bg-amber-500/20 rounded-full border border-amber-400/40 mb-4">
              <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>

            <span className="block text-xs font-mono text-amber-400 uppercase tracking-widest font-bold mb-1">
              TEAM IDENTIFIED
            </span>
            <h2 className="text-2xl sm:text-3xl font-mono font-black text-white uppercase tracking-wider mb-1">
              {authenticatedTeam.teamId}
            </h2>
            <p className="text-sm font-mono text-slate-300 mb-6 font-semibold">
              {authenticatedTeam.teamName}
            </p>

            <div className="p-4 bg-slate-950/80 border border-slate-700 rounded-2xl mb-6">
              <span className="block text-xs font-mono text-slate-400 uppercase">MISSION STAGE</span>
              <span className="text-lg font-mono font-bold text-amber-400">
                {authenticatedTeam.roundNumber === 0
                  ? "ENTRY QUALIFIER ROUND"
                  : `STAGE ${authenticatedTeam.roundNumber} OF 5`}
              </span>
            </div>

            <button
              onClick={handleProceedToHunt}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-black text-sm tracking-wider uppercase rounded-xl transition shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {authenticatedTeam.roundNumber === 0 ? "START QUALIFIER" : "RESUME MISSION"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
