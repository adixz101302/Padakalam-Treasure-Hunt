"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  Users,
  Trophy,
  Play,
  Pause,
  Lock,
  Unlock,
  RotateCcw,
  Download,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  LogOut,
  Upload,
  Radio,
  FileText,
  Clock,
  ArrowUpRight,
  Eye,
} from "lucide-react";

interface AdminStats {
  totalTeams: number;
  activeTeams: number;
  distribution: {
    qualifier: number;
    round1: number;
    round2: number;
    round3: number;
    round4: number;
    finalists: number;
    finished: number;
    disqualified: number;
  };
}

interface TeamItem {
  id: string;
  teamId: string;
  teamName: string;
  isActive: boolean;
  isDisqualified: boolean;
  currentRound: number;
  state: string;
  totalAttempts: number;
  lastActivityAt?: string;
  isFinalist: boolean;
  finalistPosition?: number | null;
}

interface FinalistItem {
  position: number;
  teamId: string;
  teamName: string;
  qualifiedAt: string;
}

interface AuditItem {
  id: string;
  eventType: string;
  teamId?: string | null;
  message: string;
  details?: any;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Dashboard Data
  const [eventData, setEventData] = useState<any>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [finalists, setFinalists] = useState<FinalistItem[]>([]);
  const [winner, setWinner] = useState<any>(null);
  const [logs, setLogs] = useState<AuditItem[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<"teams" | "puzzles" | "logs">("teams");
  const [searchQuery, setSearchQuery] = useState("");
  const [roundFilter, setRoundFilter] = useState<string>("ALL");

  // Modals
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [newTeamId, setNewTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPin, setNewTeamPin] = useState("1234");
  const [csvBatchText, setCsvBatchText] = useState("");

  const [isDeclareWinnerModalOpen, setIsDeclareWinnerModalOpen] = useState(false);
  const [selectedWinnerTeamId, setSelectedWinnerTeamId] = useState("");

  const [isResetEventModalOpen, setIsResetEventModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState("");

  // Puzzle Editor State
  const [puzzles, setPuzzles] = useState<any[]>([]);
  const [selectedRoundForEdit, setSelectedRoundForEdit] = useState<number>(0);
  const [selectedTeamForEdit, setSelectedTeamForEdit] = useState<string>("GLOBAL");
  const [puzzleTitle, setPuzzleTitle] = useState("");
  const [puzzleLocation, setPuzzleLocation] = useState("");
  const [puzzleClue, setPuzzleClue] = useState("");
  const [puzzleTransform, setPuzzleTransform] = useState("NORMAL");
  const [puzzleEncodedNumbers, setPuzzleEncodedNumbers] = useState("");
  const [puzzleImagePath, setPuzzleImagePath] = useState("");
  const [puzzleAcceptedAnswers, setPuzzleAcceptedAnswers] = useState("");
  const [puzzleLocationAnswers, setPuzzleLocationAnswers] = useState("");
  const [puzzleSubQuestions, setPuzzleSubQuestions] = useState<any[]>([]);
  const [savingPuzzle, setSavingPuzzle] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/overview");
      const data = await res.json();

      if (data.success) {
        setEventData(data.event);
        setStats(data.stats);
        setTeams(data.teams);
        setFinalists(data.finalists);
        setWinner(data.winner);
        setLogs(data.recentLogs);
      } else if (res.status === 401) {
        setIsAdminAuth(false);
      }
    } catch (e) {
      console.error("Overview error:", e);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Fetch Puzzles
  const fetchPuzzles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/puzzles");
      const data = await res.json();
      if (data.success) {
        setPuzzles(data.roundConfigs);
        const targetTeamId = selectedTeamForEdit === "GLOBAL" ? null : selectedTeamForEdit;
        const config = data.roundConfigs.find(
          (c: any) => c.roundNumber === selectedRoundForEdit && c.teamId === targetTeamId
        ) || data.roundConfigs.find(
          (c: any) => c.roundNumber === selectedRoundForEdit && c.teamId === null
        );
        if (config) {
          loadPuzzleIntoEditor(config);
        } else {
          resetPuzzleEditor();
        }
      }
    } catch (e) {
      console.error("Puzzles fetch error:", e);
    }
  }, [selectedRoundForEdit, selectedTeamForEdit]);

  const resetPuzzleEditor = () => {
    setPuzzleTitle(`Round ${selectedRoundForEdit}`);
    setPuzzleLocation("");
    setPuzzleClue("");
    setPuzzleTransform("NORMAL");
    setPuzzleEncodedNumbers("");
    setPuzzleImagePath("");
    setPuzzleAcceptedAnswers("");
    setPuzzleLocationAnswers("");
    setPuzzleSubQuestions([
      { id: 1, question: "What text is inscribed on the wooden memorial bench?", acceptedAnswers: "founding batch, batch 2020, alumni batch, alumni" },
      { id: 2, question: "How many stone lanterns line the eastern flower path?", acceptedAnswers: "4, four" },
      { id: 3, question: "What color is the floral trellis entrance archway?", acceptedAnswers: "emerald, green, dark green" },
      { id: 4, question: "What 4-digit number is engraved on the bronze fountain plaque?", acceptedAnswers: "2026, 1947, 9821" },
    ]);
  };

  const handleSelectTeamOrRound = (roundNum: number, teamIdStr: string) => {
    setSelectedRoundForEdit(roundNum);
    setSelectedTeamForEdit(teamIdStr);
    const targetTeamId = teamIdStr === "GLOBAL" ? null : teamIdStr;
    const config = puzzles.find(
      (c: any) => c.roundNumber === roundNum && c.teamId === targetTeamId
    );
    if (config) {
      loadPuzzleIntoEditor(config);
    } else {
      // Fallback to global template or blank
      const globalConfig = puzzles.find(
        (c: any) => c.roundNumber === roundNum && c.teamId === null
      );
      if (globalConfig) {
        loadPuzzleIntoEditor(globalConfig);
      } else {
        resetPuzzleEditor();
      }
    }
  };

  const loadPuzzleIntoEditor = (config: any) => {
    setPuzzleTitle(config.title || "");
    setPuzzleLocation(config.locationText || "");
    setPuzzleClue(config.clueText || "");
    setPuzzleTransform(config.clueTransform || "NORMAL");
    setPuzzleEncodedNumbers(config.encodedNumbers || "");
    setPuzzleImagePath(config.imagePath || "");
    setPuzzleAcceptedAnswers(Array.isArray(config.acceptedAnswers) ? config.acceptedAnswers.join(", ") : "");
    setPuzzleLocationAnswers(Array.isArray(config.locationAnswers) ? config.locationAnswers.join(", ") : "");
    
    if (config.subQuestions && Array.isArray(config.subQuestions) && config.subQuestions.length > 0) {
      setPuzzleSubQuestions(
        config.subQuestions.map((q: any, idx: number) => ({
          id: q.id || idx + 1,
          question: q.question || "",
          acceptedAnswers: Array.isArray(q.acceptedAnswers) ? q.acceptedAnswers.join(", ") : (q.acceptedAnswers || ""),
        }))
      );
    } else {
      setPuzzleSubQuestions([
        { id: 1, question: "What text is inscribed on the wooden memorial bench?", acceptedAnswers: "founding batch, batch 2020, alumni batch, alumni" },
        { id: 2, question: "How many stone lanterns line the eastern flower path?", acceptedAnswers: "4, four" },
        { id: 3, question: "What color is the floral trellis entrance archway?", acceptedAnswers: "emerald, green, dark green" },
        { id: 4, question: "What 4-digit number is engraved on the bronze fountain plaque?", acceptedAnswers: "2026, 1947, 9821" },
      ]);
    }
  };

  // Check Admin Session on mount
  useEffect(() => {
    const checkAdminSession = async () => {
      try {
        const res = await fetch("/api/auth/session?role=admin");
        const data = await res.json();
        if (data.success && data.role === "admin") {
          setIsAdminAuth(true);
          fetchOverview();
          fetchPuzzles();
        } else {
          setIsAdminAuth(false);
          setLoadingOverview(false);
        }
      } catch {
        setIsAdminAuth(false);
        setLoadingOverview(false);
      }
    };

    checkAdminSession();
  }, [fetchOverview, fetchPuzzles]);

  // Active Background Polling Interval for Admin Hub (every 3 seconds)
  useEffect(() => {
    if (!isAdminAuth) return;
    const interval = setInterval(() => {
      fetchOverview();
    }, 3000);
    return () => clearInterval(interval);
  }, [isAdminAuth, fetchOverview]);

  // Real-time SSE for Admin Hub
  useEffect(() => {
    if (!isAdminAuth) return;

    const eventSource = new EventSource("/api/sse");

    eventSource.addEventListener("AUDIT_LOG", () => {
      fetchOverview();
    });

    eventSource.addEventListener("TEAM_PROGRESS", () => {
      fetchOverview();
    });

    eventSource.addEventListener("FINALIST_UPDATE", () => {
      fetchOverview();
    });

    eventSource.addEventListener("WINNER_DECLARED", () => {
      fetchOverview();
    });

    eventSource.addEventListener("EVENT_STATUS", () => {
      fetchOverview();
    });

    return () => {
      eventSource.close();
    };
  }, [isAdminAuth, fetchOverview]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword.trim(),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsAdminAuth(true);
        fetchOverview();
        fetchPuzzles();
      } else {
        setAuthError(data.error || "Invalid admin credentials.");
      }
    } catch {
      setAuthError("Network error logging into Admin Center.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setIsAdminAuth(false);
  };

  // Event Control Actions
  const handleEventControl = async (action: string, payload?: any) => {
    try {
      const res = await fetch("/api/admin/event-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOverview();
      } else {
        alert(data.error || "Action failed.");
      }
    } catch {
      alert("Error executing event control.");
    }
  };

  // Team Actions
  const handleTeamAction = async (teamId: string, action: string, extra?: any) => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOverview();
      } else {
        alert(data.error || "Team action failed.");
      }
    } catch {
      alert("Error executing team action.");
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm(`Are you sure you want to completely remove Team ${teamId}?`)) return;

    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        fetchOverview();
      }
    } catch {
      alert("Failed to delete team.");
    }
  };

  // Add Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    if (csvBatchText.trim()) {
      // Parse CSV format: teamId,teamName,pin
      const lines = csvBatchText.trim().split("\n");
      const batch = lines.map((line) => {
        const [id, name, pin] = line.split(",").map((s) => s.trim());
        return { teamId: id, teamName: name || id, pin: pin || "1234" };
      });

      await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: batch }),
      });
    } else {
      await fetch("/api/admin/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: newTeamId.trim().toUpperCase(),
          teamName: newTeamName.trim(),
          pin: newTeamPin.trim(),
        }),
      });
    }

    setNewTeamId("");
    setNewTeamName("");
    setCsvBatchText("");
    setIsAddTeamModalOpen(false);
    fetchOverview();
  };

  // Declare Winner
  const handleDeclareWinner = async () => {
    if (!selectedWinnerTeamId) return;

    try {
      const res = await fetch("/api/admin/declare-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: selectedWinnerTeamId }),
      });
      const data = await res.json();
      if (data.success) {
        setIsDeclareWinnerModalOpen(false);
        fetchOverview();
      } else {
        alert(data.error || "Failed to declare winner.");
      }
    } catch {
      alert("Network error declaring winner.");
    }
  };

  // Save Puzzle Config
  const handleSavePuzzle = async () => {
    setSavingPuzzle(true);
    try {
      const acceptedArr = selectedRoundForEdit === 3
        ? ["all_subquestions_valid"]
        : puzzleAcceptedAnswers
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      const locationArr = puzzleLocationAnswers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const formattedSubQuestions = selectedRoundForEdit === 3
        ? puzzleSubQuestions.map((q, idx) => ({
            id: q.id || idx + 1,
            question: (q.question || "").trim(),
            acceptedAnswers: (typeof q.acceptedAnswers === "string" ? q.acceptedAnswers : "")
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean),
          }))
        : null;

      const teamIdPayload = selectedTeamForEdit === "GLOBAL" ? null : selectedTeamForEdit;

      const res = await fetch("/api/admin/puzzles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: teamIdPayload,
          roundNumber: selectedRoundForEdit,
          title: puzzleTitle,
          locationText: puzzleLocation,
          clueText: puzzleClue,
          clueTransform: puzzleTransform,
          encodedNumbers: puzzleEncodedNumbers,
          imagePath: puzzleImagePath,
          acceptedAnswers: acceptedArr,
          locationAnswers: locationArr,
          subQuestions: formattedSubQuestions,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(`Saved configuration for Round ${selectedRoundForEdit} (${selectedTeamForEdit === "GLOBAL" ? "Global Template" : selectedTeamForEdit})!`);
        fetchPuzzles();
      } else {
        alert(data.error || "Failed to save puzzle.");
      }
    } catch {
      alert("Error saving puzzle.");
    } finally {
      setSavingPuzzle(false);
    }
  };

  // Upload Image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPuzzleImagePath(data.url);
      } else {
        alert(data.error || "Upload failed.");
      }
    } catch {
      alert("Error uploading image file.");
    } finally {
      setUploadingImage(false);
    }
  };

  // ================= ADMIN LOGIN SCREEN =================
  if (!isAdminAuth) {
    return (
      <div className="min-h-screen bg-[#070A11] bg-grid-pattern flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#0F172A] border border-slate-750 rounded-3xl p-8 shadow-2xl glow-gold">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl mb-3">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-mono font-black text-white uppercase tracking-tight">
              COMMAND CENTER
            </h1>
            <p className="text-xs font-mono text-slate-400 mt-1 uppercase">
              ANVESHIPIN KANDETHUM ORGANIZERS ONLY
            </p>
          </div>

          {authError && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                ADMINISTRATOR USERNAME
              </label>
              <input
                type="text"
                required
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                AUTHENTICATION SECRET
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-black text-sm uppercase tracking-wider rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {authLoading ? "INITIALIZING HUB..." : "ACCESS CONTROL CENTER"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtered Teams
  const filteredTeams = teams.filter((t) => {
    const matchesSearch =
      t.teamId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.teamName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (roundFilter === "ALL") return true;
    if (roundFilter === "QUALIFIER") return t.currentRound === 0;
    if (roundFilter === "R1") return t.currentRound === 1;
    if (roundFilter === "R2") return t.currentRound === 2;
    if (roundFilter === "R3") return t.currentRound === 3;
    if (roundFilter === "R4") return t.currentRound === 4;
    if (roundFilter === "FINALISTS") return t.isFinalist;
    if (roundFilter === "DISQUALIFIED") return t.isDisqualified;

    return true;
  });

  return (
    <div className="min-h-screen bg-[#070A11] text-slate-100 flex flex-col">
      {/* Tactical Top Bar */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-750 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-base font-mono font-black text-white tracking-wider uppercase">
              COMMAND CENTER // ANVESHIPIN KANDETHUM
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  eventData?.status === "PAUSED"
                    ? "bg-amber-400 animate-pulse"
                    : eventData?.status === "FINISHED"
                    ? "bg-purple-400"
                    : "bg-emerald-400 animate-ping"
                }`}
              />
              <span className="text-xs font-mono text-slate-400 uppercase">
                EVENT STATUS:{" "}
                <strong className="text-amber-400">{eventData?.status || "LIVE"}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchOverview}
            title="Refresh Live Data"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            title="Logout"
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-mono text-xs rounded-xl uppercase transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ================= SECTION 1: LIVE EVENT STATS & EMERGENCY ACTIONS ================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase">TOTAL TEAMS</span>
            <div className="text-2xl font-mono font-black text-white">{stats?.totalTeams ?? 0}</div>
          </div>
          <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase">QUALIFIER</span>
            <div className="text-2xl font-mono font-black text-amber-400">
              {stats?.distribution.qualifier ?? 0}
            </div>
          </div>
          <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase">ROUND 1</span>
            <div className="text-2xl font-mono font-black text-slate-200">
              {stats?.distribution.round1 ?? 0}
            </div>
          </div>
          <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase">ROUND 2</span>
            <div className="text-2xl font-mono font-black text-slate-200">
              {stats?.distribution.round2 ?? 0}
            </div>
          </div>
          <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase">ROUND 3</span>
            <div className="text-2xl font-mono font-black text-slate-200">
              {stats?.distribution.round3 ?? 0}
            </div>
          </div>
          <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-2xl">
            <span className="text-[10px] font-mono text-slate-400 uppercase">ROUND 4</span>
            <div className="text-2xl font-mono font-black text-slate-200">
              {stats?.distribution.round4 ?? 0}
            </div>
          </div>
          <div className="bg-[#0F172A] border border-amber-500/40 p-4 rounded-2xl glow-gold">
            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">
              FINALISTS
            </span>
            <div className="text-2xl font-mono font-black text-amber-400">
              {stats?.distribution.finalists ?? 0} / 5
            </div>
          </div>
          <div className="bg-[#0F172A] border border-purple-500/40 p-4 rounded-2xl">
            <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">WINNER</span>
            <div className="text-lg font-mono font-black text-purple-300 truncate">
              {winner ? winner.teamId : "—"}
            </div>
          </div>
        </div>

        {/* Emergency Control Bar */}
        <div className="bg-[#0F172A] border border-slate-750 p-4 rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-2">
            {eventData?.status === "PAUSED" ? (
              <button
                onClick={() => handleEventControl("RESUME")}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-mono font-bold text-xs rounded-xl uppercase transition cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Resume Event</span>
              </button>
            ) : (
              <button
                onClick={() => handleEventControl("PAUSE")}
                className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-bold text-xs rounded-xl uppercase transition cursor-pointer"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Event</span>
              </button>
            )}

            {eventData?.isLocked ? (
              <button
                onClick={() => handleEventControl("UNLOCK")}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl uppercase transition cursor-pointer"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Game</span>
              </button>
            ) : (
              <button
                onClick={() => handleEventControl("LOCK")}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl uppercase transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Lock Game</span>
              </button>
            )}

            <button
              onClick={() => handleEventControl("START_FINAL_NOW")}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-bold text-xs rounded-xl uppercase transition shadow-md cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              <span>Start Final Now</span>
            </button>

            <button
              onClick={() => setIsDeclareWinnerModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold text-xs rounded-xl uppercase transition shadow-md cursor-pointer"
            >
              <Trophy className="w-4 h-4" />
              <span>Declare Winner</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/api/admin/export?format=csv"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl uppercase transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
            <a
              href="/api/admin/export?format=json"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded-xl uppercase transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup JSON</span>
            </a>
            <button
              onClick={() => setIsResetEventModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 font-mono text-xs rounded-xl uppercase transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Event</span>
            </button>
          </div>
        </div>

        {/* ================= NAVIGATION TABS ================= */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab("teams")}
            className={`pb-3 font-mono text-sm font-bold uppercase transition border-b-2 ${
              activeTab === "teams"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Live Teams Monitor ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab("puzzles")}
            className={`pb-3 font-mono text-sm font-bold uppercase transition border-b-2 ${
              activeTab === "puzzles"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Puzzle & Clue Editor
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 font-mono text-sm font-bold uppercase transition border-b-2 ${
              activeTab === "logs"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Live Audit Stream ({logs.length})
          </button>
        </div>

        {/* ================= TAB 1: LIVE TEAMS MONITOR ================= */}
        {activeTab === "teams" && (
          <div className="space-y-4">
            {/* Search, Filter & Add Team Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Search team ID or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 w-60"
                />

                <select
                  value={roundFilter}
                  onChange={(e) => setRoundFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">All Stages</option>
                  <option value="QUALIFIER">Qualifier (0)</option>
                  <option value="R1">Round 1</option>
                  <option value="R2">Round 2</option>
                  <option value="R3">Round 3</option>
                  <option value="R4">Round 4</option>
                  <option value="FINALISTS">Finalists Only</option>
                  <option value="DISQUALIFIED">Disqualified</option>
                </select>
              </div>

              <button
                onClick={() => setIsAddTeamModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-bold text-xs rounded-xl uppercase transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add / Import Teams</span>
              </button>
            </div>

            {/* Teams Table */}
            <div className="bg-[#0F172A] border border-slate-750 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase">
                    <tr>
                      <th className="p-4">Team ID / Name</th>
                      <th className="p-4">Current Stage</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Submission Guesses</th>
                      <th className="p-4">Last Activity</th>
                      <th className="p-4 text-right">Intervention Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTeams.map((t) => (
                      <tr key={t.teamId} className="hover:bg-slate-900/50 transition">
                        <td className="p-4">
                          <div className="font-bold text-white tracking-wider">{t.teamId}</div>
                          <div className="text-slate-400 text-[11px] truncate max-w-[180px]">
                            {t.teamName}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-block px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold rounded-md text-xs">
                            {t.currentRound === 0
                              ? "Stage 0 (Qualifier)"
                              : t.currentRound === 5
                              ? "Stage 5 (Finale)"
                              : `Stage 0${t.currentRound}`}
                          </span>
                          <span className="block text-[10px] text-slate-500 uppercase mt-1">{t.state}</span>
                        </td>
                        <td className="p-4">
                          {t.isDisqualified ? (
                            <span className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-[10px]">
                              DISQUALIFIED
                            </span>
                          ) : t.isFinalist ? (
                            <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/40 text-amber-400 rounded-full text-[10px] font-bold">
                              FINALIST #{t.finalistPosition}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px]">
                              ACTIVE
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-slate-200 font-bold">{t.totalAttempts}</span>
                          <span className="block text-[10px] text-slate-500">attempts</span>
                        </td>
                        <td className="p-4 text-slate-400 text-[11px]">
                          {t.lastActivityAt ? new Date(t.lastActivityAt).toLocaleTimeString() : "—"}
                        </td>
                        <td className="p-4 text-right space-x-1.5">
                          <button
                            onClick={() => handleTeamAction(t.teamId, "ADVANCE")}
                            title="Manually Advance Round"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] transition cursor-pointer"
                          >
                            + Adv
                          </button>
                          <button
                            onClick={() => {
                              const target = prompt(
                                `Reset ${t.teamId} to which Round (0 to 5)?`,
                                "0"
                              );
                              if (target !== null) {
                                handleTeamAction(t.teamId, "RESET_ROUND", { targetRound: Number(target) });
                              }
                            }}
                            title="Reset Team Round"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[10px] transition cursor-pointer"
                          >
                            ↺ Reset
                          </button>
                          {t.isDisqualified ? (
                            <button
                              onClick={() => handleTeamAction(t.teamId, "RESTORE")}
                              className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] transition cursor-pointer"
                            >
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleTeamAction(t.teamId, "DISQUALIFY")}
                              className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] transition cursor-pointer"
                            >
                              Disqualify
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTeam(t.teamId)}
                            title="Delete Team"
                            className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: PUZZLE & CLUE BUILDER ================= */}
        {activeTab === "puzzles" && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Round Selector Sidebar */}
            <div className="bg-[#0F172A] border border-slate-750 rounded-3xl p-4 space-y-2">
              <span className="block text-xs font-mono text-slate-400 uppercase mb-3">
                SELECT STAGE TO CONFIGURE
              </span>
              {[0, 1, 2, 3, 4, 5].map((rNum) => {
                const cfg = puzzles.find((c) => c.roundNumber === rNum && c.teamId === null);
                return (
                  <button
                    key={rNum}
                    onClick={() => {
                      setSelectedRoundForEdit(rNum);
                      if (cfg) loadPuzzleIntoEditor(cfg);
                    }}
                    className={`w-full text-left p-3 rounded-2xl font-mono text-xs transition cursor-pointer ${
                      selectedRoundForEdit === rNum
                        ? "bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold glow-gold"
                        : "bg-slate-900/60 border border-slate-800 text-slate-300 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {rNum === 0 ? "Stage 0 (Qualifier)" : `Stage 0${rNum} Clues`}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Puzzle Editor Form */}
            <div className="lg:col-span-3 bg-[#0F172A] border border-slate-750 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-mono font-black text-white uppercase">
                    CONFIGURING ROUND 0{selectedRoundForEdit}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono text-slate-400">Target:</span>
                    <select
                      value={selectedTeamForEdit}
                      onChange={(e) => handleSelectTeamOrRound(selectedRoundForEdit, e.target.value)}
                      className="bg-slate-950 border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                    >
                      <option value="GLOBAL">🌐 Global Master Template (All Teams Default)</option>
                      {teams
                        .filter((t) => !t.teamId.startsWith("CONC_"))
                        .map((t) => (
                          <option key={t.teamId} value={t.teamId}>
                            🎯 Team-Specific: {t.teamId} ({t.teamName})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleSavePuzzle}
                  disabled={savingPuzzle}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer"
                >
                  {savingPuzzle ? "Saving..." : "Save Configuration"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                    STAGE TITLE
                  </label>
                  <input
                    type="text"
                    value={puzzleTitle}
                    onChange={(e) => setPuzzleTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {selectedRoundForEdit === 2 && (
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                      CLUE TRANSFORMATION
                    </label>
                    <select
                      value={puzzleTransform}
                      onChange={(e) => setPuzzleTransform(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="MIRRORED">MIRRORED</option>
                      <option value="JUMBLED">JUMBLED</option>
                      <option value="MIRRORED_JUMBLED">MIRRORED + JUMBLED</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Location Text (R1, R3, R5) */}
              {[1, 3, 5].includes(selectedRoundForEdit) && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                    PHYSICAL LOCATION TARGET
                  </label>
                  <input
                    type="text"
                    value={puzzleLocation}
                    onChange={(e) => setPuzzleLocation(e.target.value)}
                    placeholder="e.g. Go to Central Auditorium Main Entrance"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Number Cipher (R2) */}
              {selectedRoundForEdit === 2 && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                    ENCODED NUMBER SEQUENCE (A=1..Z=26)
                  </label>
                  <input
                    type="text"
                    value={puzzleEncodedNumbers}
                    onChange={(e) => setPuzzleEncodedNumbers(e.target.value)}
                    placeholder="e.g. 16 - 1 - 18 - 11"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Image Upload (R3, R4) — optional visual supplement */}
              {[3, 4].includes(selectedRoundForEdit) && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                    PUZZLE IMAGE <span className="text-slate-600 font-normal">(OPTIONAL — overrides text display)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={puzzleImagePath}
                      onChange={(e) => setPuzzleImagePath(e.target.value)}
                      placeholder="Leave blank to use text display below"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none"
                    />
                    <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl flex items-center gap-2 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImage ? "Uploading..." : "Upload File"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {puzzleImagePath && (
                    <button
                      type="button"
                      onClick={() => setPuzzleImagePath("")}
                      className="mt-2 text-[10px] font-mono text-rose-400 hover:text-rose-300 transition"
                    >
                      ✕ Clear image (use text display instead)
                    </button>
                  )}
                </div>
              )}

              {/* Morse Code Text Input (R3) — what participants see */}
              {selectedRoundForEdit === 3 && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    MORSE CODE TEXT
                  </label>
                  <p className="text-[10px] font-mono text-slate-600 mb-2">
                    Type the morse code here (e.g. <span className="text-amber-500/80">-.-. .- -- .--. ..- ...</span>). Shown to the team on their screen if no image is uploaded above.
                  </p>
                  <textarea
                    rows={3}
                    value={puzzleEncodedNumbers}
                    onChange={(e) => setPuzzleEncodedNumbers(e.target.value)}
                    placeholder="e.g. -.-. .- -- .--. ..- ..."
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-3 text-sm font-mono text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 tracking-wider"
                  />
                </div>
              )}

              {/* Clue Text */}
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                  CLUE / QUESTION TEXT
                </label>
                <textarea
                  rows={3}
                  value={puzzleClue}
                  onChange={(e) => setPuzzleClue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Step 1: Target Location Verification Answers (Rounds 1-4) */}
              {[1, 2, 3, 4].includes(selectedRoundForEdit) && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2">
                  <label className="block text-xs font-mono text-amber-400 font-bold uppercase">
                    📍 STEP 1: TARGET LOCATION VERIFICATION ANSWERS (COMMA SEPARATED)
                  </label>
                  <p className="text-[10px] font-mono text-slate-400">
                    Teams must answer one of these correctly to verify they reached the physical location before Step 2 (Object Clue) is unlocked.
                  </p>
                  <input
                    type="text"
                    value={puzzleLocationAnswers}
                    onChange={(e) => setPuzzleLocationAnswers(e.target.value)}
                    placeholder="e.g. Auditorium, Main Auditorium, Centenary Hall"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Step 2 Answers: Sub-Questions Editor for Round 3 VS Standard Single Input for Other Rounds */}
              {selectedRoundForEdit === 3 ? (
                <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-mono text-amber-400 font-bold uppercase">
                        📋 STEP 2: FIELD RECONNAISSANCE QUESTIONS & ANSWERS (ROUND 3)
                      </label>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                        Configure the physical location questions and accepted answers shown to teams after verifying Morse location.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPuzzleSubQuestions((prev) => [
                          ...prev,
                          { id: prev.length + 1, question: "", acceptedAnswers: "" },
                        ]);
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-mono text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      + Add Question
                    </button>
                  </div>

                  <div className="space-y-3">
                    {puzzleSubQuestions.map((q, idx) => (
                      <div key={idx} className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-amber-400">
                            QUESTION {idx + 1}
                          </span>
                          {puzzleSubQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPuzzleSubQuestions((prev) => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-[10px] font-mono text-rose-400 hover:text-rose-300 cursor-pointer"
                            >
                              ✕ Remove
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            Question Prompt
                          </label>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPuzzleSubQuestions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, question: val } : item))
                              );
                            }}
                            placeholder="e.g. What text is inscribed on the wooden memorial bench?"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                            Accepted Answers (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={q.acceptedAnswers}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPuzzleSubQuestions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, acceptedAnswers: val } : item))
                              );
                            }}
                            placeholder="e.g. founding batch, batch 2020, alumni"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                    {selectedRoundForEdit === 0
                      ? "QUALIFIER ANSWER (COMMA SEPARATED)"
                      : "🔍 STEP 2: OBJECT RECONNAISSANCE / FINAL ANSWERS (COMMA SEPARATED)"}
                  </label>
                  <input
                    type="text"
                    value={puzzleAcceptedAnswers}
                    onChange={(e) => setPuzzleAcceptedAnswers(e.target.value)}
                    placeholder="e.g. thermometer, temperature gauge, temp meter"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: AUDIT STREAM ================= */}
        {activeTab === "logs" && (
          <div className="bg-[#0F172A] border border-slate-750 rounded-3xl p-6 shadow-xl space-y-3">
            <h2 className="text-base font-mono font-black text-white uppercase mb-4">
              REAL-TIME AUDIT LOG
            </h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-start justify-between gap-4 text-xs font-mono"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded text-[10px] font-bold">
                        {log.eventType}
                      </span>
                      {log.teamId && (
                        <span className="font-bold text-white">{log.teamId}</span>
                      )}
                    </div>
                    <p className="text-slate-300">{log.message}</p>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL: ADD / IMPORT TEAMS ================= */}
      {isAddTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#0F172A] border border-slate-750 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl glow-gold">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-mono font-black text-lg text-white uppercase">
                Add or Batch Import Teams
              </h3>
              <button
                onClick={() => setIsAddTeamModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-3">
                <span className="block text-xs font-mono text-amber-400 font-bold uppercase">
                  Option A: Single Team Creation
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="TEAM ID (e.g. TEAM011)"
                    value={newTeamId}
                    onChange={(e) => setNewTeamId(e.target.value.toUpperCase())}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Team Name"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-2">
                <span className="block text-xs font-mono text-amber-400 font-bold uppercase">
                  Option B: Batch CSV Paste
                </span>
                <textarea
                  rows={4}
                  placeholder={`TEAM011,Apex Seekers,1234\nTEAM012,Cyber Wolves,1234`}
                  value={csvBatchText}
                  onChange={(e) => setCsvBatchText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTeamModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono font-bold text-xs rounded-xl uppercase"
                >
                  Confirm Creation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DECLARE WINNER ================= */}
      {isDeclareWinnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F172A] border-2 border-purple-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center">
              <div className="inline-flex p-3 bg-purple-500/20 rounded-full border border-purple-400/50 mb-3">
                <Trophy className="w-8 h-8 text-purple-400 animate-bounce" />
              </div>
              <h3 className="text-xl font-mono font-black text-white uppercase">
                DECLARE OFFICIAL WINNER
              </h3>
              <p className="text-xs font-mono text-slate-400 mt-1">
                Select the finalist team that recovered the key and opened the chest
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-400 uppercase">
                SELECT QUALIFIED FINALIST
              </label>
              <select
                value={selectedWinnerTeamId}
                onChange={(e) => setSelectedWinnerTeamId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white"
              >
                <option value="">-- Choose Winning Finalist --</option>
                {finalists.map((f) => (
                  <option key={f.teamId} value={f.teamId}>
                    Finalist #{f.position}: {f.teamId} ({f.teamName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsDeclareWinnerModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeclareWinner}
                disabled={!selectedWinnerTeamId}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-mono font-bold text-xs uppercase rounded-xl shadow-lg disabled:opacity-40"
              >
                Declare & Freeze Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: RESET EVENT ================= */}
      {isResetEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F172A] border-2 border-rose-500 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="text-center">
              <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3 animate-pulse" />
              <h3 className="text-xl font-mono font-black text-rose-400 uppercase">
                CRITICAL ACTION: RESET EVENT
              </h3>
              <p className="text-xs font-mono text-slate-300 mt-2">
                This will reset all teams to Round 0, wipe all finalist records, delete submissions,
                and reset the game clock.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 uppercase mb-2">
                Type <strong>CONFIRM_RESET_ALL_DATA</strong> to confirm:
              </label>
              <input
                type="text"
                value={resetConfirmInput}
                onChange={(e) => setResetConfirmInput(e.target.value)}
                placeholder="CONFIRM_RESET_ALL_DATA"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsResetEventModalOpen(false);
                  setResetConfirmInput("");
                }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleEventControl("RESET_EVENT", { confirmation: resetConfirmInput });
                  setIsResetEventModalOpen(false);
                  setResetConfirmInput("");
                }}
                disabled={resetConfirmInput !== "CONFIRM_RESET_ALL_DATA"}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs uppercase rounded-xl disabled:opacity-40"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
