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
  Key,
  MapPin,
  Search,
  Camera,
  CheckCircle2,
  XCircle,
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
  const [activeTab, setActiveTab] = useState<"teams" | "puzzles" | "photos" | "logs">("teams");
  const [searchQuery, setSearchQuery] = useState("");
  const [roundFilter, setRoundFilter] = useState<string>("ALL");

  // Photo Verification Queue State
  const [photoSubmissions, setPhotoSubmissions] = useState<any[]>([]);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<string | null>(null);

  const fetchPhotoSubmissions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/photo-submissions?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success) {
        setPhotoSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error("Fetch photo submissions error:", e);
    }
  }, []);

  const handleVerifyPhoto = async (submissionId: string, action: "APPROVE" | "REJECT") => {
    let rejectReason = "";
    if (action === "REJECT") {
      const input = prompt(
        "Enter rejection reason for participant (optional):",
        "Incorrect physical location. Please capture a clear photo of your target destination."
      );
      if (input === null) return;
      rejectReason = input.trim();
    }

    try {
      const res = await fetch("/api/admin/verify-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, action, rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPhotoSubmissions();
        fetchOverview();
      } else {
        alert(data.error || "Verification action failed.");
      }
    } catch {
      alert("Error processing photo verification.");
    }
  };

  // Modals
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);
  const [newTeamId, setNewTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamPin, setNewTeamPin] = useState("1234");
  const [csvBatchText, setCsvBatchText] = useState("");

  // Edit Team Modal State
  const [isEditTeamModalOpen, setIsEditTeamModalOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState("");
  const [editingTeamName, setEditingTeamName] = useState("");
  const [editingTeamPin, setEditingTeamPin] = useState("");
  const [savingEditTeam, setSavingEditTeam] = useState(false);

  const [isDeclareWinnerModalOpen, setIsDeclareWinnerModalOpen] = useState(false);
  const [selectedWinnerTeamId, setSelectedWinnerTeamId] = useState("");

  const [isResetEventModalOpen, setIsResetEventModalOpen] = useState(false);
  const [resetConfirmInput, setResetConfirmInput] = useState("");

  // Change Admin Credentials Modal State
  const [isChangeCredsModalOpen, setIsChangeCredsModalOpen] = useState(false);
  const [currentAdminPassword, setCurrentAdminPassword] = useState("");
  const [newAdminUsername, setNewAdminUsername] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [updatingCreds, setUpdatingCreds] = useState(false);

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
      const res = await fetch(`/api/admin/overview?t=${Date.now()}`, {
        cache: "no-store",
      });
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
      const res = await fetch(`/api/admin/puzzles?t=${Date.now()}`, {
        cache: "no-store",
      });
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
        const res = await fetch(`/api/auth/session?role=admin&t=${Date.now()}`, {
          cache: "no-store",
        });
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
  }, [fetchOverview, fetchPuzzles, fetchPhotoSubmissions]);

  // Active Background Polling Interval for Admin Hub
  // Active Background Polling Interval for Admin Hub
  // overview every 10s, photo-submissions every 30s — staggered to avoid hitting DB simultaneously
  useEffect(() => {
    if (!isAdminAuth) return;

    fetchPhotoSubmissions();
    const photoInterval = setInterval(() => {
      fetchPhotoSubmissions();
    }, 30000);

    let overviewInterval: ReturnType<typeof setInterval> | undefined;
    const overviewTimeout = setTimeout(() => {
      fetchOverview();
      overviewInterval = setInterval(() => {
        fetchOverview();
      }, 10000);
    }, 2000);

    return () => {
      clearInterval(photoInterval);
      clearTimeout(overviewTimeout);
      if (overviewInterval) clearInterval(overviewInterval);
    };
  }, [isAdminAuth, fetchOverview, fetchPhotoSubmissions]);

  // Real-time SSE for Admin Hub
  useEffect(() => {
    if (!isAdminAuth) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/sse");

      eventSource.onerror = () => {
        eventSource?.close();
      };

      eventSource.addEventListener("PHOTO_SUBMITTED", () => {
        fetchPhotoSubmissions();
        fetchOverview();
      });

      eventSource.addEventListener("AUDIT_LOG", () => {
        fetchOverview();
      });

      eventSource.addEventListener("TEAM_PROGRESS", () => {
        fetchOverview();
        fetchPhotoSubmissions();
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
    } catch {}

    return () => {
      eventSource?.close();
    };
  }, [isAdminAuth, fetchOverview, fetchPhotoSubmissions]);

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

  // Edit Team Handlers
  const handleOpenEditTeam = (team: { teamId: string; teamName: string }) => {
    setEditingTeamId(team.teamId);
    setEditingTeamName(team.teamName);
    setEditingTeamPin("");
    setIsEditTeamModalOpen(true);
  };

  const handleSaveEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamId || !editingTeamName.trim()) return;

    setSavingEditTeam(true);
    try {
      const res = await fetch(`/api/admin/teams/${editingTeamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPDATE",
          teamName: editingTeamName.trim(),
          pin: editingTeamPin.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditTeamModalOpen(false);
        fetchOverview();
      } else {
        alert(data.error || "Failed to update team.");
      }
    } catch {
      alert("Error updating team.");
    } finally {
      setSavingEditTeam(false);
    }
  };

  // Declare Winner
  // Change Admin Credentials Handler
  const handleChangeCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername.trim() || !newAdminPassword.trim()) return;

    setUpdatingCreds(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentAdminPassword,
          newUsername: newAdminUsername.trim(),
          newPassword: newAdminPassword.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Admin credentials updated successfully!\nNew Username: ${newAdminUsername}`);
        setIsChangeCredsModalOpen(false);
        setCurrentAdminPassword("");
        setNewAdminPassword("");
      } else {
        alert(data.error || "Failed to update credentials.");
      }
    } catch {
      alert("Error updating credentials.");
    } finally {
      setUpdatingCreds(false);
    }
  };

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

  // Upload Image:
  // - Stage 4: 100% Uncompressed & Lossless (Preserves raw resolution for hidden letters/steganography)
  // - Other Stages: Standard quick canvas compression (~800px)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    // ONLY FOR STAGE 4: Upload 100% uncompressed as it is (zero downscaling, zero loss of resolution)
    if (selectedRoundForEdit === 4) {
      if (file.size > 4.2 * 1024 * 1024) {
        alert(
          `Notice: File size is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Uncompressed original image will be uploaded directly. For best performance, keep below 4.2MB.`
        );
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        setPuzzleImagePath(rawDataUrl);
        setUploadingImage(false);
      };
      reader.onerror = () => {
        alert("Error loading original high-resolution image.");
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
      return;
    }

    // FOR ALL OTHER STAGES: Standard canvas compression for quick transmission
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setPuzzleImagePath(compressedDataUrl);
          setUploadingImage(false);
        };
        img.onerror = () => {
          alert("Invalid image file. Please choose a valid PNG or JPEG image.");
          setUploadingImage(false);
        };
        img.src = event.target?.result as string;
      } catch {
        alert("Error processing image file.");
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
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
          <a
            href="/projector"
            target="_blank"
            rel="noopener noreferrer"
            title="Open Live Projector Board in new tab"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-mono text-xs font-bold rounded-xl uppercase transition cursor-pointer shadow-sm"
          >
            <span>📺 Projector Board</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => {
              setLoadingOverview(true);
              fetchOverview();
            }}
            title="Refresh Live Data"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loadingOverview ? "animate-spin text-amber-400" : ""}`} />
          </button>
          <button
            onClick={() => setIsChangeCredsModalOpen(true)}
            title="Change Admin Credentials"
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 font-mono text-xs rounded-xl uppercase transition cursor-pointer"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Credentials</span>
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
              href="/projector"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs rounded-xl uppercase transition shadow-md"
            >
              <span>📺 Open Projector</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
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
        <div className="flex border-b border-slate-800 gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("teams")}
            className={`pb-3 font-mono text-sm font-bold uppercase transition border-b-2 whitespace-nowrap ${
              activeTab === "teams"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Live Teams Monitor ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab("puzzles")}
            className={`pb-3 font-mono text-sm font-bold uppercase transition border-b-2 whitespace-nowrap ${
              activeTab === "puzzles"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Puzzle & Clue Editor
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`pb-3 font-mono text-sm font-bold uppercase transition border-b-2 flex items-center gap-2 whitespace-nowrap ${
              activeTab === "photos"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Photo Queue ({photoSubmissions.filter((p) => p.status === "PENDING").length})</span>
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 font-mono text-sm font-bold uppercase transition border-b-2 whitespace-nowrap ${
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
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-slate-400 text-[11px] truncate max-w-[160px]" title={t.teamName}>
                              {t.teamName}
                            </span>
                            <button
                              onClick={() => handleOpenEditTeam(t)}
                              title="Edit Team Name & PIN"
                              className="p-1 rounded text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
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
                            onClick={() => handleOpenEditTeam(t)}
                            title="Edit Team Name & PIN"
                            className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
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



              {/* Morse Code / Cipher Text Input (R3) — optional fallback */}
              {selectedRoundForEdit === 3 && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                    OPTIONAL MORSE CODE / CIPHER TRANSMISSION
                  </label>
                  <p className="text-[10px] font-mono text-slate-500 mb-2">
                    Fallback cipher (e.g. <span className="text-amber-500/80">-.-. .- -- .--. ..- ...</span>). If a Malayalam riddle or image is set in Step 1 below, that riddle is displayed on the participant screen.
                  </p>
                  <textarea
                    rows={2}
                    value={puzzleEncodedNumbers}
                    onChange={(e) => setPuzzleEncodedNumbers(e.target.value)}
                    placeholder="Leave empty or enter morse cipher..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm font-mono text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-400 tracking-wider"
                  />
                </div>
              )}

              {/* ================= STEP 1: PHYSICAL LOCATION TARGET (RIDDLE + ANSWERS) ================= */}
              {[1, 2, 3, 4, 5].includes(selectedRoundForEdit) && (
                <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <MapPin className="w-4 h-4" />
                    <span>STEP 1: PHYSICAL LOCATION TARGET (1ST QUESTION & ANSWERS)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-amber-300 font-bold uppercase mb-1">
                      1ST QUESTION: PHYSICAL LOCATION TARGET CLUE (MALAYALAM RIDDLE)
                    </label>
                    <p className="text-[10px] font-mono text-slate-400 mb-2">
                      Riddle shown to participants under Step 1 to locate their physical destination.
                    </p>
                    <textarea
                      rows={3}
                      value={puzzleLocation}
                      onChange={(e) => setPuzzleLocation(e.target.value)}
                      placeholder="e.g. Raavile varunnavar enne kaanum, Vaikunneram..."
                      className="w-full bg-slate-950 border border-amber-500/40 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-amber-400 font-bold uppercase mb-1">
                      1ST QUESTION ANSWERS: ACCEPTED TARGET LOCATIONS (COMMA SEPARATED)
                    </label>
                    <p className="text-[10px] font-mono text-slate-400 mb-1.5">
                      Teams enter one of these correctly to verify location and unlock Step 2.
                    </p>
                    <input
                      type="text"
                      value={puzzleLocationAnswers}
                      onChange={(e) => setPuzzleLocationAnswers(e.target.value)}
                      placeholder="e.g. main gate, mb, gate"
                      className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              {/* ================= STEP 2: OBJECT RECONNAISSANCE / 2ND QUESTION & ANSWERS ================= */}
              <div className="p-5 bg-slate-900/80 border border-slate-750 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Search className="w-4 h-4" />
                  <span>STEP 2: OBJECT RECONNAISSANCE (2ND QUESTION & ANSWERS)</span>
                </div>

                {selectedRoundForEdit === 3 ? (
                  /* Sub-Questions Editor for Round 3 */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-mono text-slate-400">
                        Configure the 4 physical location questions and accepted answers shown after verifying Morse location.
                      </p>
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
                  /* Standard 2nd Question Textarea & Answers Input for Rounds 0, 1, 2, 4, 5 */
                  <div className="space-y-4">
                    {/* Optional Object Clue Image */}
                    <div className="space-y-2 p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <label className="block text-xs font-mono text-amber-400 font-bold uppercase">
                        🖼️ OPTIONAL OBJECT CLUE IMAGE (SHOWN IN STEP 2 TO PARTICIPANTS)
                      </label>
                      
                      {puzzleImagePath ? (
                        <div className="p-3 bg-slate-950 border border-amber-500/50 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                          <img
                            src={puzzleImagePath}
                            alt="Object Clue Preview"
                            className="h-32 w-auto object-contain rounded-xl border border-slate-800 bg-slate-900"
                          />
                          <div className="flex-1 space-y-2 text-center sm:text-left">
                            <span className="inline-block px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-bold rounded-full">
                              ✓ OBJECT CLUE IMAGE LOADED
                            </span>
                            <p className="text-[10px] font-mono text-slate-400">
                              Participants will see this image under Step 2 (Object Clue) once they confirm their physical location.
                            </p>
                            <button
                              type="button"
                              onClick={() => setPuzzleImagePath("")}
                              className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono text-xs rounded-lg transition cursor-pointer"
                            >
                              ✕ Remove Image
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={puzzleImagePath}
                              onChange={(e) => setPuzzleImagePath(e.target.value)}
                              placeholder="Paste image URL or click Upload File..."
                              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                            />
                            <label className="px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-mono text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {uploadingImage
                                  ? "Processing..."
                                  : selectedRoundForEdit === 4
                                  ? "Upload Full-Res Image (Uncompressed)"
                                  : "Upload Object Image"}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                          </div>
                          {selectedRoundForEdit === 4 && (
                            <p className="mt-2 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 font-semibold">
                              <span>🛡️ Stage 4 Lossless Mode Active: Uploads 100% uncompressed (original full resolution preserved so hidden letters stay clear).</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 font-bold uppercase mb-1">
                        2ND QUESTION: OBJECT RECONNAISSANCE CLUE / QUESTION TEXT
                      </label>
                      <p className="text-[10px] font-mono text-slate-400 mb-2">
                        Unlocked ONLY after verifying Step 1 location. (Leave blank if you haven't received this question yet).
                      </p>
                      <textarea
                        rows={3}
                        value={puzzleClue}
                        onChange={(e) => setPuzzleClue(e.target.value)}
                        placeholder="Type the object riddle / 2nd question here..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-300 font-bold uppercase mb-1">
                        2ND QUESTION ANSWERS: OBJECT / FINAL ACCEPTED ANSWERS (COMMA SEPARATED)
                      </label>
                      <input
                        type="text"
                        value={puzzleAcceptedAnswers}
                        onChange={(e) => setPuzzleAcceptedAnswers(e.target.value)}
                        placeholder="e.g. key, code, valid"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: PHOTO VERIFICATION QUEUE ================= */}
        {activeTab === "photos" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-mono font-black text-white uppercase tracking-tight flex items-center gap-2">
                  <Camera className="w-5 h-5 text-amber-400" />
                  <span>LIVE PHOTO SUBMISSION VERIFICATION QUEUE</span>
                </h2>
                <p className="text-xs font-mono text-slate-400 mt-1">
                  Review participant photos live. Approving advances the team to Round 3 immediately.
                </p>
              </div>

              <button
                onClick={fetchPhotoSubmissions}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queue</span>
              </button>
            </div>

            {photoSubmissions.filter((p) => p.status === "PENDING").length === 0 ? (
              <div className="bg-[#0F172A] border border-slate-750 rounded-3xl p-12 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider">
                  ALL PHOTO SUBMISSIONS CLEARED!
                </h3>
                <p className="text-xs font-mono text-slate-400 max-w-sm mx-auto">
                  No pending photo submissions right now. Incoming team photo uploads will appear here automatically in real-time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {photoSubmissions
                  .filter((p) => p.status === "PENDING")
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-[#0F172A] border-2 border-amber-500/50 rounded-3xl p-5 space-y-4 shadow-xl glow-gold flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/50 text-amber-400 font-mono text-xs font-black rounded-lg">
                            {sub.teamId}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(sub.submittedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h3 className="text-sm font-mono font-bold text-white truncate">
                          {sub.team.teamName}
                        </h3>
                        <span className="text-[10px] font-mono text-amber-400/80 block mt-0.5 font-bold">
                          ROUND {sub.roundNumber} SUBMISSION
                        </span>
                      </div>

                      {/* Photo Preview Thumbnail — lazy loaded on click to avoid egress */}
                      <div
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/admin/photo-submissions/${sub.id}`);
                            const data = await res.json();
                            if (data.success) setSelectedPreviewImage(data.submission.imageUrl);
                          } catch {}
                        }}
                        className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer group h-48 flex items-center justify-center"
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                          <Eye className="w-8 h-8 text-amber-400/60" />
                          <span className="text-xs font-mono text-amber-400/80">Click to Load Photo</span>
                        </div>
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <span className="px-3 py-1 bg-slate-900/90 text-white font-mono text-xs rounded-lg border border-slate-700 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-amber-400" /> Click to View
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <button
                          onClick={() => handleVerifyPhoto(sub.id, "REJECT")}
                          className="py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-mono font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4 text-rose-400" />
                          <span>REJECT</span>
                        </button>
                        <button
                          onClick={() => handleVerifyPhoto(sub.id, "APPROVE")}
                          className="py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-300 font-mono font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 glow-emerald"
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>APPROVE</span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Reviewed History */}
            <div className="bg-[#0F172A] border border-slate-750 rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                📜 REVIEWED PHOTO HISTORY ({photoSubmissions.filter((p) => p.status !== "PENDING").length})
              </h3>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {photoSubmissions
                  .filter((p) => p.status !== "PENDING")
                  .map((sub) => (
                    <div
                      key={sub.id}
                      className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-3">
                        {sub.imageUrl && sub.imageUrl.startsWith("data:image") ? (
                          <img
                            src={sub.imageUrl}
                            alt="Thumb"
                            onClick={() => setSelectedPreviewImage(sub.imageUrl)}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-700 cursor-pointer"
                          />
                        ) : (
                          <div
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/admin/photo-submissions?id=${sub.id}`);
                                const data = await res.json();
                                if (data.success) setSelectedPreviewImage(data.submission.imageUrl);
                              } catch {}
                            }}
                            className="w-10 h-10 bg-slate-800 rounded-lg border border-slate-700 cursor-pointer flex items-center justify-center flex-shrink-0"
                            title="Click to view photo"
                          >
                            <Eye className="w-4 h-4 text-amber-400/70" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-amber-400">{sub.teamId}</span>
                            <span className="text-slate-400">• {sub.team.teamName}</span>
                          </div>
                          {sub.rejectReason && (
                            <span className="text-[10px] text-rose-400 block">
                              Reason: "{sub.rejectReason}"
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === "APPROVED"
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                              : "bg-rose-500/20 text-rose-400 border border-rose-500/50"
                          }`}
                        >
                          {sub.status}
                        </span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {new Date(sub.submittedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal for Full Resolution Photo Preview */}
        {selectedPreviewImage && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedPreviewImage(null)}
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  <Camera className="w-4 h-4" /> FULL RESOLUTION SUBMISSION INSPECTION
                </span>
                <button
                  onClick={() => setSelectedPreviewImage(null)}
                  className="text-slate-400 hover:text-white font-mono text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition"
                >
                  ✕ Close
                </button>
              </div>
              <img
                src={selectedPreviewImage}
                alt="Enlarged Submission"
                className="w-full max-h-[75vh] object-contain rounded-2xl bg-black border border-slate-800"
              />
            </div>
          </div>
        )}

        {/* ================= TAB 4: AUDIT STREAM ================= */}
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

      {/* ================= MODAL: EDIT TEAM ================= */}
      {isEditTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F172A] border border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl glow-gold">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold uppercase">
                <Edit2 className="w-4 h-4" />
                <span>Edit Team Details</span>
              </div>
              <button
                onClick={() => setIsEditTeamModalOpen(false)}
                className="text-slate-400 hover:text-white font-mono text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  TEAM ID
                </label>
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-amber-400 font-bold tracking-wider">
                  {editingTeamId}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  TEAM NAME <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter team name..."
                  value={editingTeamName}
                  onChange={(e) => setEditingTeamName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  NEW TEAM PIN <span className="text-slate-600 font-normal">(Leave blank to keep current)</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave empty or enter new PIN..."
                  value={editingTeamPin}
                  onChange={(e) => setEditingTeamPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditTeamModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEditTeam || !editingTeamName.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer disabled:opacity-40"
                >
                  {savingEditTeam ? "Saving..." : "Save Changes"}
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

      {/* ================= MODAL: CHANGE ADMIN CREDENTIALS ================= */}
      {isChangeCredsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0F172A] border border-amber-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl glow-gold">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono text-sm font-bold uppercase">
                <Key className="w-4 h-4" />
                <span>Change Admin Credentials</span>
              </div>
              <button
                onClick={() => setIsChangeCredsModalOpen(false)}
                className="text-slate-400 hover:text-white font-mono text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangeCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  CURRENT PASSWORD <span className="text-slate-600 font-normal">(Optional if default)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter current password..."
                  value={currentAdminPassword}
                  onChange={(e) => setCurrentAdminPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  NEW ADMIN USERNAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. game_admin"
                  value={newAdminUsername}
                  onChange={(e) => setNewAdminUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase mb-1">
                  NEW ADMIN PASSWORD
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters..."
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangeCredsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-mono text-xs rounded-xl hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingCreds || !newAdminUsername.trim() || !newAdminPassword.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-bold text-xs uppercase rounded-xl transition cursor-pointer disabled:opacity-40"
                >
                  {updatingCreds ? "Updating..." : "Save Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
