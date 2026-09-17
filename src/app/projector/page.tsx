"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Compass,
  CheckCircle2,
  Clock,
  Maximize,
  Minimize,
  Radio,
  Sparkles,
  Search,
  Users,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

interface TeamProgressData {
  teamId: string;
  teamName: string;
  isActive: boolean;
  isDisqualified: boolean;
  currentRound: number;
  currentStep: number;
  state: string;
  totalAttempts: number;
  lastActivityAt?: string;
  isFinalist: boolean;
  finalistPosition?: number | null;
  qualifiedAt?: string | null;
  isWinner: boolean;
  winnerDeclaredAt?: string | null;
}

interface BoardData {
  event: {
    name: string;
    status: string;
    isLocked: boolean;
  };
  stats: {
    totalTeams: number;
    activeTeams: number;
    disqualifiedCount: number;
    distribution: {
      qualifier: number;
      round1: number;
      round2: number;
      round3: number;
      round4: number;
      finalists: number;
      finished: number;
    };
  };
  finalists: Array<{
    position: number;
    teamId: string;
    teamName: string;
    qualifiedAt: string;
  }>;
  winner: {
    teamId: string;
    teamName: string;
    position?: number;
    declaredAt: string;
  } | null;
  teams: TeamProgressData[];
  serverTime: string;
}

const STAGES = [
  { num: 0, label: "Qualifier" },
  { num: 1, label: "Stage 01" },
  { num: 2, label: "Stage 02" },
  { num: 3, label: "Stage 03" },
  { num: 4, label: "Stage 04" },
  { num: 5, label: "Finale" },
];

export default function ProjectorBoardPage() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortBy, setSortBy] = useState<"rank" | "teamId">("rank");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState("");

  // Live Digital Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Board Data
  const fetchBoardData = useCallback(async () => {
    try {
      const res = await fetch(`/api/board?t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json);
        setLastRefreshedAt(new Date());
      }
    } catch (e) {
      console.error("Error fetching board data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load + Auto Refresh (3.5s fail-safe polling)
  useEffect(() => {
    fetchBoardData();
    const interval = setInterval(fetchBoardData, 3500);
    return () => clearInterval(interval);
  }, [fetchBoardData]);

  // Real-time SSE Connection
  useEffect(() => {
    const sse = new EventSource("/api/sse");

    sse.addEventListener("TEAM_PROGRESS", () => {
      fetchBoardData();
    });

    sse.addEventListener("TEAM_STATUS", () => {
      fetchBoardData();
    });

    sse.addEventListener("EVENT_CONTROL", () => {
      fetchBoardData();
    });

    sse.addEventListener("WINNER_DECLARED", () => {
      fetchBoardData();
    });

    return () => {
      sse.close();
    };
  }, [fetchBoardData]);

  // Toggle Native Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  // Sync fullscreen change with ESC or browser actions
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Sorted and Filtered Teams
  const sortedTeams = useMemo(() => {
    if (!data?.teams) return [];

    let filtered = [...data.teams];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.teamId.toLowerCase().includes(q) ||
          t.teamName.toLowerCase().includes(q)
      );
    }

    if (sortBy === "teamId") {
      return filtered.sort((a, b) => a.teamId.localeCompare(b.teamId));
    }

    // Rank Sort:
    // 1. Winner first
    // 2. Finalists ordered by finalistPosition (1 to 5)
    // 3. Highest currentRound (4 > 3 > 2 > 1 > 0)
    // 4. Highest currentStep (Step 2 > Step 1)
    // 5. Fewest totalAttempts
    // 6. Active before Disqualified
    return filtered.sort((a, b) => {
      if (a.isWinner && !b.isWinner) return -1;
      if (!a.isWinner && b.isWinner) return 1;

      if (a.isFinalist && !b.isFinalist) return -1;
      if (!a.isFinalist && b.isFinalist) return 1;

      if (a.isFinalist && b.isFinalist) {
        return (a.finalistPosition ?? 99) - (b.finalistPosition ?? 99);
      }

      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;

      if (b.currentRound !== a.currentRound) {
        return b.currentRound - a.currentRound;
      }

      if (b.currentStep !== a.currentStep) {
        return b.currentStep - a.currentStep;
      }

      return a.totalAttempts - b.totalAttempts;
    });
  }, [data?.teams, sortBy, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* ================= PROJECTOR HEADER BAR ================= */}
      <header className="bg-[#0B111D] border-b border-amber-500/20 px-4 sm:px-8 py-3.5 sticky top-0 z-40 backdrop-blur-md shadow-2xl">
        <div className="max-w-[1700px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-[#0B111D] rounded-[10px] flex items-center justify-center">
                <Compass className="w-5 h-5 text-amber-400 animate-spin-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-mono font-black text-white tracking-wider uppercase">
                  PADAKALAM 2.0
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold tracking-widest uppercase">
                  ANVESHIPIN KANDETHUM
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 tracking-wide">
                CAMPUS LIVE RECONNAISSANCE & STAGE PROGRESSION BOARD
              </p>
            </div>
          </div>

          {/* Center: Stage Count Distribution Ticker */}
          {data?.stats?.distribution && (
            <div className="hidden xl:flex items-center gap-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-1.5 font-mono text-xs">
              <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">STAGE 0:</span>
                <span className="font-bold text-amber-400">{data.stats.distribution.qualifier}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">STAGE 1:</span>
                <span className="font-bold text-amber-400">{data.stats.distribution.round1}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">STAGE 2:</span>
                <span className="font-bold text-amber-400">{data.stats.distribution.round2}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">STAGE 3:</span>
                <span className="font-bold text-amber-400">{data.stats.distribution.round3}</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-750 text-slate-300 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">STAGE 4:</span>
                <span className="font-bold text-amber-400">{data.stats.distribution.round4}</span>
              </div>
              <div className="px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>FINALISTS: {data.stats.distribution.finalists}/5</span>
              </div>
            </div>
          )}

          {/* Right: Live Clock, Controls & Fullscreen */}
          <div className="flex items-center gap-2.5">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300 font-bold tracking-wider">LIVE</span>
              <span className="text-slate-500 text-[10px] border-l border-slate-800 pl-2">
                {currentTime}
              </span>
            </div>

            {/* Sort Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setSortBy("rank")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  sortBy === "rank"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Rank
              </button>
              <button
                type="button"
                onClick={() => setSortBy("teamId")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  sortBy === "teamId"
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Team ID
              </button>
            </div>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen (F11)"}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400/50 text-slate-300 hover:text-amber-400 transition cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Link back to Admin */}
            <Link
              href="/admin"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs rounded-xl transition"
            >
              <span>Admin</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ================= HERO: OFFICIAL WINNER BANNER ================= */}
        {data?.winner && (
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-600/20 border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl glow-gold animate-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-5">
                <div className="p-4 bg-amber-400 rounded-2xl text-slate-950 shadow-xl shadow-amber-500/30 animate-bounce">
                  <Trophy className="w-10 h-10" />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 bg-amber-400 text-slate-950 font-mono text-xs font-black rounded-full uppercase tracking-widest mb-1.5">
                    ★ OFFICIAL CHAMPION DECLARED ★
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-mono font-black text-white tracking-tight">
                    {data.winner.teamName}
                  </h2>
                  <p className="text-sm font-mono text-amber-300 font-bold tracking-wider mt-1">
                    TEAM IDENTIFIER: {data.winner.teamId}
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-amber-400/40 rounded-2xl px-6 py-4 text-center font-mono">
                <span className="block text-xs text-slate-400 uppercase tracking-wider">
                  TIME DECLARED
                </span>
                <span className="text-base font-bold text-amber-400">
                  {new Date(data.winner.declaredAt).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================= FINAL 5 QUALIFIED SHOWCASE ================= */}
        {data?.finalists && data.finalists.length > 0 && (
          <div className="bg-[#0B111D]/80 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold uppercase tracking-wider">
                <Award className="w-4 h-4" />
                <span>THE QUALIFIED FINAL FIVE ({data.finalists.length}/5 SLOTS CLAIMED)</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                First 5 teams to crack Stage 4 unlock the Final Treasure Vault
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((pos) => {
                const finalist = data.finalists.find((f) => f.position === pos);
                return (
                  <div
                    key={pos}
                    className={`p-4 rounded-2xl border font-mono transition ${
                      finalist
                        ? "bg-gradient-to-b from-amber-500/15 to-slate-900 border-amber-500/50 shadow-lg glow-gold"
                        : "bg-slate-950/40 border-slate-800/80 border-dashed"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          finalist
                            ? "bg-amber-400 text-slate-950 font-black"
                            : "bg-slate-800 text-slate-500"
                        }`}
                      >
                        SLOT #{pos}
                      </span>
                      {finalist && (
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          QUALIFIED
                        </span>
                      )}
                    </div>

                    {finalist ? (
                      <div className="mt-2">
                        <div className="font-black text-white text-sm sm:text-base tracking-tight truncate">
                          {finalist.teamName}
                        </div>
                        <div className="text-[11px] text-amber-400 font-bold mt-0.5">
                          {finalist.teamId}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(finalist.qualifiedAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-center py-2 text-slate-600 text-xs">
                        Awaiting Team...
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= TEAMS LIVE PROGRESS TABLE ================= */}
        <div className="bg-[#0B111D] border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          {/* Table Controls / Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-mono text-base font-bold uppercase tracking-wider">
              <Users className="w-5 h-5 text-amber-400" />
              <span>LIVE PARTICIPATING TEAMS ({sortedTeams.length})</span>
            </div>

            <div className="w-full sm:w-72 relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team name or ID..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition"
              />
            </div>
          </div>

          {/* The Live Board Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3 w-16 text-center">Rank</th>
                  <th className="py-3 px-4 min-w-[200px]">Team Info</th>
                  <th className="py-3 px-4 min-w-[340px] text-center">Stage Progression Flow</th>
                  <th className="py-3 px-4 text-center min-w-[120px]">Current Status</th>
                  <th className="py-3 px-4 text-center w-24">Attempts</th>
                  <th className="py-3 px-4 text-right w-32">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {sortedTeams.map((team, idx) => {
                  const isLeading = idx === 0 && !team.isDisqualified;
                  return (
                    <tr
                      key={team.teamId}
                      className={`transition duration-150 ${
                        team.isWinner
                          ? "bg-amber-500/10 hover:bg-amber-500/15"
                          : team.isFinalist
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : team.isDisqualified
                          ? "opacity-50 hover:opacity-75 bg-slate-950/40"
                          : "hover:bg-slate-900/60"
                      }`}
                    >
                      {/* Rank Number */}
                      <td className="py-3.5 px-3 text-center">
                        {team.isWinner ? (
                          <div className="w-8 h-8 mx-auto rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm shadow-md">
                            🏆
                          </div>
                        ) : team.isFinalist ? (
                          <div className="w-8 h-8 mx-auto rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-400 flex items-center justify-center font-bold text-xs">
                            #{team.finalistPosition}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-bold text-sm">
                            {idx + 1}
                          </span>
                        )}
                      </td>

                      {/* Team ID & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-white text-sm sm:text-base tracking-wide">
                            {team.teamId}
                          </span>
                          {isLeading && !team.isFinalist && !team.isWinner && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold">
                              LEADER
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-medium truncate max-w-[220px]">
                          {team.teamName}
                        </div>
                      </td>

                      {/* Stage Progression Visualizer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          {STAGES.map((s, sIdx) => {
                            const isCompleted = team.currentRound > s.num;
                            const isCurrent = team.currentRound === s.num && !team.isDisqualified;
                            const isLocked = team.currentRound < s.num;

                            return (
                              <React.Fragment key={s.num}>
                                {/* Stage Node */}
                                <div className="flex flex-col items-center">
                                  <div
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs transition duration-200 ${
                                      isCompleted
                                        ? "bg-emerald-500/20 border border-emerald-500/60 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                        : isCurrent
                                        ? "bg-amber-500 border border-amber-300 text-slate-950 font-black scale-110 shadow-lg glow-gold animate-pulse"
                                        : "bg-slate-900 border border-slate-800 text-slate-600"
                                    }`}
                                    title={`${s.label}: ${isCompleted ? "Completed" : isCurrent ? "Currently Active" : "Locked"}`}
                                  >
                                    {isCompleted ? "✓" : s.num === 5 ? "👑" : s.num}
                                  </div>
                                  <span
                                    className={`text-[9px] mt-1 font-mono uppercase ${
                                      isCurrent
                                        ? "text-amber-400 font-bold"
                                        : isCompleted
                                        ? "text-slate-400"
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {s.num === 0 ? "Q" : `S${s.num}`}
                                  </span>
                                </div>

                                {/* Connecting Line */}
                                {sIdx < STAGES.length - 1 && (
                                  <div
                                    className={`h-1 flex-1 min-w-[8px] sm:min-w-[16px] max-w-[28px] rounded-full transition-colors ${
                                      isCompleted
                                        ? "bg-emerald-500/60"
                                        : isCurrent
                                        ? "bg-amber-500/40"
                                        : "bg-slate-850"
                                    }`}
                                  />
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </td>

                      {/* Current Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {team.isDisqualified ? (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/40 text-rose-400 text-[10px] font-bold">
                            DISQUALIFIED
                          </span>
                        ) : team.isWinner ? (
                          <span className="inline-block px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                            ★ WINNER ★
                          </span>
                        ) : team.isFinalist ? (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 text-[10px] font-bold">
                            FINALIST #{team.finalistPosition}
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-bold">
                            {team.currentRound === 0
                              ? "STAGE 0 (QUALIFIER)"
                              : `STAGE 0${team.currentRound} (${team.currentStep === 1 ? "STEP 2" : "STEP 1"})`}
                          </span>
                        )}
                      </td>

                      {/* Guesses / Total Attempts */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-300 text-sm">
                        {team.totalAttempts}
                      </td>

                      {/* Last Activity Time */}
                      <td className="py-3.5 px-4 text-right text-xs text-slate-400">
                        {team.lastActivityAt
                          ? new Date(team.lastActivityAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-850 px-6 py-3 text-center text-slate-500 font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-2 max-w-[1700px] w-full mx-auto">
        <span>PADAKALAM 2.0 // OFFICIAL TREASURE HUNT ENGINE</span>
        <span className="text-slate-600">
          Last Synced: {lastRefreshedAt.toLocaleTimeString()} • Updates live every 3s & on event pushes
        </span>
      </footer>
    </div>
  );
}
