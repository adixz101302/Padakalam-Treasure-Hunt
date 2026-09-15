"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  MapPin,
  HelpCircle,
  Radio,
  Binary,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Sparkles,
  Key,
  Flame,
  Search,
  Camera,
  UploadCloud,
  Clock3,
  XCircle,
} from "lucide-react";
import { ConnectionStatusBadge } from "@/components/participant/ConnectionStatusBadge";
import { CountdownTimer } from "@/components/participant/CountdownTimer";
import { VictoryModal } from "@/components/participant/VictoryModal";

interface SubQuestionItem {
  id: number;
  question: string;
}

interface CurrentRoundData {
  state: string;
  roundNumber: number;
  currentStep?: number;
  isLocationVerified?: boolean;
  title: string;
  clueType: string;
  locationText?: string;
  clueText?: string;
  clueTransform?: string;
  encodedNumbers?: string;
  imagePath?: string;
  subQuestions?: SubQuestionItem[];
  attemptLimit?: number;
  totalAttempts?: number;
  penaltySeconds?: number;
  serverTime?: string;
  // Final round fields
  isFinalist?: boolean;
  position?: number;
  totalFinalists?: number;
  finalStartAt?: string;
  instructions?: string;
  isLive?: boolean;
}

interface TeamSession {
  teamId: string;
  teamName: string;
  currentRound: number;
}

export default function PlayPage() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamSession | null>(null);
  const [roundData, setRoundData] = useState<CurrentRoundData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answerInput, setAnswerInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [subAnswers, setSubAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Photo Verification State (Round 2 Prototype)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{
    hasSubmission: boolean;
    submissionId?: string;
    status?: string;
    rejectReason?: string;
  } | null>(null);

  const fetchPhotoStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/photo-status?roundNumber=2&t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.success && data.hasSubmission) {
        setPhotoStatus(data);
      } else {
        setPhotoStatus({ hasSubmission: false });
      }
    } catch {}
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
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

        const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        setSelectedPhoto(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto) return;

    setUploadingPhoto(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/game/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roundNumber: 2, photoData: selectedPhoto }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: "error",
          message: data.error || "Photo submission failed. Please try again.",
        });
        setUploadingPhoto(false);
        return;
      }

      setPhotoStatus({
        hasSubmission: true,
        submissionId: data.submissionId,
        status: "PENDING",
      });
      setFeedback({
        type: "info",
        message: "📷 PHOTO SUBMITTED! WAITING FOR ORGANIZER VERIFICATION...",
      });
    } catch {
      setFeedback({ type: "error", message: "Network error uploading photo." });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleVerifyLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundData || !locationInput.trim()) return;

    setVerifyingLocation(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/game/verify-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundNumber: roundData.roundNumber,
          locationInput: locationInput.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: "error",
          message: data.error || "Location verification failed. Please try again.",
        });
        setVerifyingLocation(false);
        return;
      }

      if (data.isCorrect) {
        setFeedback({
          type: "success",
          message: "🎯 TARGET LOCATION VERIFIED! OBJECT RECONNAISSANCE CLUE UNLOCKED.",
        });
        setLocationInput("");
        setRoundData((prev) =>
          prev ? { ...prev, isLocationVerified: true, currentStep: 1 } : prev
        );
        fetchCurrentRound();
      } else {
        setFeedback({
          type: "error",
          message: data.message || "INCORRECT TARGET LOCATION. RE-EXAMINE THE CIPHER/CLUE.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Network verification error. Please try again." });
    } finally {
      setVerifyingLocation(false);
    }
  };

  // Round 3: per-question verification state
  const [subChecking, setSubChecking] = useState<Record<number, boolean>>({});
  const [subStatus, setSubStatus] = useState<Record<number, "idle" | "correct" | "wrong">>({});

  const handleCheckSubQuestion = async (questionId: number) => {
    const answer = subAnswers[questionId];
    if (!answer?.trim()) return;

    setSubChecking((prev) => ({ ...prev, [questionId]: true }));
    try {
      const res = await fetch("/api/game/check-sub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundNumber: 3,
          questionId,
          answer: answer.trim(),
        }),
      });
      const data = await res.json();
      setSubStatus((prev) => ({
        ...prev,
        [questionId]: data.isCorrect ? "correct" : "wrong",
      }));
    } catch {
      setSubStatus((prev) => ({ ...prev, [questionId]: "wrong" }));
    } finally {
      setSubChecking((prev) => ({ ...prev, [questionId]: false }));
    }
  };

  // Modals state
  const [winnerData, setWinnerData] = useState<{
    teamId: string;
    teamName: string;
    position?: number;
    declaredAt?: string;
  } | null>(null);
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

  // Fetch current game state
  const fetchCurrentRound = useCallback(async () => {
    try {
      const res = await fetch(`/api/game/current?t=${Date.now()}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          router.push("/");
          return;
        }
        setFeedback({ type: "error", message: data.error || "Unable to load mission data." });
        return;
      }

      if (data.isFinished && data.winner) {
        setWinnerData(data.winner);
        setIsWinnerModalOpen(true);
      }

      setRoundData((prev) => {
        if (!prev || prev.roundNumber !== data.roundNumber) {
          setSelectedPhoto(null);
          setPhotoStatus(null);
          setLocationInput("");
          setAnswerInput("");
          setFeedback(null);
        }
        return data;
      });

      if (data.roundNumber === 2) {
        fetchPhotoStatus();
      } else {
        setSelectedPhoto(null);
        setPhotoStatus(null);
        setFeedback((prev) => (prev?.message?.includes("PHOTO") ? null : prev));
      }
    } catch {
      setFeedback({ type: "error", message: "Connection lost. Reconnecting..." });
    } finally {
      setLoading(false);
    }
  }, [router, fetchPhotoStatus]);

  // Fetch team session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`/api/auth/session?t=${Date.now()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.success && data.role === "team") {
          setTeam({
            teamId: data.team.teamId,
            teamName: data.team.teamName,
            currentRound: data.team.progress?.currentRound ?? 0,
          });
          fetchCurrentRound();
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    };

    fetchSession();
  }, [router, fetchCurrentRound]);

  // Active Background Polling Interval (every 3 seconds for instant lively updates)
  useEffect(() => {
    if (!team) return;
    const interval = setInterval(() => {
      fetchCurrentRound();
    }, 3000);
    return () => clearInterval(interval);
  }, [team, fetchCurrentRound]);

  // Auto-clear photo-related feedback banners when outside Round 2
  useEffect(() => {
    if (roundData && roundData.roundNumber !== 2) {
      setSelectedPhoto(null);
      setPhotoStatus(null);
      setFeedback((prev) => (prev?.message?.includes("PHOTO") ? null : prev));
    }
  }, [roundData?.roundNumber]);

  // Real-time Server-Sent Events Listener
  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.addEventListener("TEAM_PROGRESS", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (team && payload.teamId === team.teamId) {
          fetchCurrentRound();
        }
      } catch {}
    });

    eventSource.addEventListener("PHOTO_VERIFIED", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (team && payload.teamId === team.teamId) {
          if (payload.status === "APPROVED") {
            setFeedback({
              type: "success",
              message: "🎉 PHOTO APPROVED BY ORGANIZERS! ADVANCING TO ROUND 3...",
            });
            setSelectedPhoto(null);
            setPhotoStatus(null);
            fetchCurrentRound();
          } else {
            setPhotoStatus({
              hasSubmission: true,
              status: "REJECTED",
              rejectReason: payload.rejectReason,
            });
            setFeedback({
              type: "error",
              message: `❌ PHOTO REJECTED: ${payload.rejectReason || "Incorrect image. Please try again."}`,
            });
          }
        }
      } catch {}
    });

    eventSource.addEventListener("FINALIST_UPDATE", () => {
      fetchCurrentRound();
    });

    eventSource.addEventListener("FINAL_COUNTDOWN", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.finalStartAt) {
          fetchCurrentRound();
        }
      } catch {}
    });

    eventSource.addEventListener("WINNER_DECLARED", (e) => {
      try {
        const payload = JSON.parse(e.data);
        setWinnerData(payload);
        setIsWinnerModalOpen(true);
      } catch {}
    });

    eventSource.addEventListener("EVENT_STATUS", (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.status === "PAUSED") {
          setFeedback({
            type: "info",
            message: "The hunt has been paused by organizers. Submissions are temporarily frozen.",
          });
        } else {
          fetchCurrentRound();
        }
      } catch {}
    });

    return () => {
      eventSource.close();
    };
  }, [team, fetchCurrentRound]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundData) return;

    // Check if Round 3 (subQuestions) or single answer
    if (roundData.roundNumber === 3 && roundData.subQuestions) {
      const answeredCount = Object.values(subAnswers).filter((v) => v.trim().length > 0).length;
      if (answeredCount < roundData.subQuestions.length) {
        setFeedback({
          type: "error",
          message: "Please answer all 4 physical location questions before submitting.",
        });
        return;
      }
    } else {
      if (!answerInput.trim()) {
        setFeedback({ type: "error", message: "Please enter your answer." });
        return;
      }
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundNumber: roundData.roundNumber,
          answer: answerInput.trim(),
          subAnswers,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setFeedback({
          type: "error",
          message: data.error || "Submission failed. Please try again.",
        });
        setSubmitting(false);
        return;
      }

      if (data.isCorrect) {
        setFeedback({
          type: "success",
          message: "🎉 MISSION ACCOMPLISHED! ADVANCING TO NEXT STAGE...",
        });
        setAnswerInput("");
        setSubAnswers({});
        setLoading(true);

        await fetchCurrentRound();
        setFeedback(null);
      } else {
        setFeedback({
          type: "error",
          message: data.message || "NOT QUITE. CHECK THE CLUE AND SURROUNDINGS CAREFULLY.",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Network submission error. Re-submitting..." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading || !roundData || !team) {
    return (
      <div className="min-h-screen bg-[#070A11] flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
          <Compass className="w-8 h-8 text-amber-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <h2 className="text-lg font-mono font-black text-white uppercase tracking-widest animate-pulse">
          ESTABLISHING SATELLITE LINK...
        </h2>
        <p className="text-xs font-mono text-amber-400/80 mt-2 font-semibold">
          Syncing Padakalam Mission Parameters
        </p>
      </div>
    );
  }

  const isQualifier = roundData.roundNumber === 0;
  const isFinalWaiting = roundData.state === "FINAL_WAITING";
  const isFinalActive = roundData.state === "FINAL_ACTIVE" || roundData.roundNumber === 5;

  return (
    <div className="min-h-screen bg-[#070A11] bg-grid-pattern text-slate-100 flex flex-col justify-between pb-8">
      {/* Top Tactical HUD Header */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-750 px-4 py-3 sm:px-6 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-amber-400 tracking-wider uppercase">
                  {team.teamId}
                </span>
                <span className="text-xs text-slate-500">•</span>
                <span className="text-xs font-mono text-slate-300 font-semibold truncate max-w-[140px] sm:max-w-[200px]">
                  {team.teamName}
                </span>
              </div>
              <span className="text-[10px] font-mono text-amber-400/80 block uppercase font-bold tracking-wider">
                PADAKALAM 2.0 • ANVESHIPIN KANDETHUM
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ConnectionStatusBadge />
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Mission Container */}
      <main className="max-w-xl w-full mx-auto px-4 py-6 flex-1 flex flex-col justify-center">
        {/* Stage Badge & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-mono text-xs uppercase tracking-widest mb-2 font-bold">
            <Flame className="w-3.5 h-3.5" />
            <span>
              {isQualifier
                ? "ENTRY QUALIFIER"
                : isFinalWaiting || isFinalActive
                ? "FINAL FIVE SHOWDOWN"
                : `MISSION 0${roundData.roundNumber} / 05`}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-mono font-black text-white uppercase tracking-tight">
            {roundData.title}
          </h1>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mb-6 p-4 rounded-2xl border font-mono text-xs flex items-start gap-3 animate-in slide-in-from-top-2 duration-200 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 glow-emerald"
                : feedback.type === "info"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-400 glow-gold"
                : "bg-rose-500/10 border-rose-500/40 text-rose-400 glow-crimson"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="font-bold tracking-wide">{feedback.message}</span>
          </div>
        )}

        {/* ================= STAGE 0: QUALIFIER ================= */}
        {isQualifier && (
          <div className="bg-[#0F172A]/90 border border-slate-750 rounded-3xl p-6 sm:p-8 shadow-2xl glow-gold">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
              <HelpCircle className="w-4 h-4" />
              <span>THE GATEKEEPER'S QUESTION</span>
            </div>
            <p className="text-base sm:text-lg font-mono text-white mb-6 leading-relaxed font-semibold bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
              "{roundData.clueText || "Answer the qualifier question to unlock Round 1."}"
            </p>

            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                  YOUR ANSWER
                </label>
                <input
                  type="text"
                  required
                  placeholder="Type answer here..."
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3.5 text-base font-mono text-white placeholder-slate-600 focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-black text-sm tracking-wider uppercase rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "VERIFYING ANSWER..." : "SUBMIT & UNLOCK ROUND 1"}
              </button>
            </form>
          </div>
        )}

        {/* ================= ROUND 1: DIRECT LOCATION ================= */}
        {roundData.roundNumber === 1 && (
          <div className="space-y-4">
            {/* Physical Location Card (Step 1) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 glow-gold">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>STEP 1: PHYSICAL LOCATION TARGET CLUE</span>
                </div>
                {roundData.isLocationVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-bold rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-mono font-semibold text-amber-200/90 tracking-wide mb-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                "{roundData.locationText || "Solve the physical location riddle to find your target location."}"
              </h2>

              {!roundData.isLocationVerified ? (
                <form onSubmit={handleVerifyLocation} className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      ENTER TARGET LOCATION NAME / CODE
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Auditorium..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifyingLocation || !locationInput.trim()}
                    className="w-full py-3.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-mono font-black text-xs tracking-wider uppercase rounded-xl transition cursor-pointer disabled:opacity-40"
                  >
                    {verifyingLocation ? (
                      <span className="flex items-center justify-center gap-2">
                        <Compass className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>VERIFYING LOCATION...</span>
                      </span>
                    ) : (
                      "VERIFY TARGET LOCATION"
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-mono text-xs font-semibold">
                  ✓ Target Location Confirmed! Object Clue Unlocked Below.
                </div>
              )}
            </div>

            {/* Object Clue Card (Step 2 - Revealed ONLY when Location is Verified) */}
            {roundData.isLocationVerified ? (
              <div className="bg-[#0F172A]/90 border border-slate-750 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider mb-3">
                  <Search className="w-4 h-4" />
                  <span>STEP 2: OBJECT RECONNAISSANCE CLUE</span>
                </div>
                <p className="text-sm font-mono text-slate-200 mb-6 bg-slate-950/70 p-4 rounded-2xl border border-slate-800 leading-relaxed whitespace-pre-wrap">
                  {roundData.clueText ? `"${roundData.clueText}"` : "(Object reconnaissance clue will be updated soon)"}
                </p>

                <form onSubmit={handleSubmitAnswer} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                      IDENTIFIED OBJECT NAME / CODE
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter object name..."
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3.5 text-base font-mono text-white placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-black text-sm tracking-wider uppercase rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "VALIDATING CODES..." : "SUBMIT OBJECT ANSWER"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-[#0F172A]/50 border border-slate-800 rounded-3xl p-6 text-center space-y-2 opacity-75">
                <Search className="w-6 h-6 text-slate-600 mx-auto" />
                <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">
                  🔒 OBJECT RECONNAISSANCE CLUE LOCKED
                </h3>
                <p className="text-xs font-mono text-slate-500 max-w-sm mx-auto">
                  Decode and verify the target location above to reveal your object reconnaissance clue!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= ROUND 2: LOCATION VERIFICATION (STEP 1) + PHOTO SUBMISSION (STEP 2) ================= */}
        {roundData.roundNumber === 2 && (
          <div className="space-y-4">
            {/* Physical Location Target (Step 1) */}
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-3xl p-6 glow-gold">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>STEP 1: PHYSICAL LOCATION TARGET CLUE</span>
                </div>
                {roundData.isLocationVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-bold rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-mono font-semibold text-amber-200/90 tracking-wide mb-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                "{roundData.locationText || "Solve the physical location riddle to find your target location."}"
              </h2>

              {!roundData.isLocationVerified ? (
                <form onSubmit={handleVerifyLocation} className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      ENTER TARGET LOCATION NAME / CODE
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Auditorium..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifyingLocation || !locationInput.trim()}
                    className="w-full py-3.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-mono font-black text-xs tracking-wider uppercase rounded-xl transition cursor-pointer disabled:opacity-40"
                  >
                    {verifyingLocation ? (
                      <span className="flex items-center justify-center gap-2">
                        <Compass className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>VERIFYING LOCATION...</span>
                      </span>
                    ) : (
                      "VERIFY TARGET LOCATION"
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-mono text-xs font-semibold">
                  ✓ Target Location Confirmed! Object Photo Proof Upload Unlocked Below.
                </div>
              )}
            </div>

            {/* Photo Proof Submission Card (Step 2 - Revealed ONLY when Location is Verified) */}
            {roundData.isLocationVerified ? (
              <div className="bg-[#0F172A]/90 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl glow-gold animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider mb-4">
                  <Camera className="w-4 h-4" />
                  <span>STEP 2: OBJECT RECONNAISSANCE PHOTO PROOF</span>
                </div>

                {/* 2nd Question / Object Clue Text display */}
                {roundData.clueText && (
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl mb-4">
                    <span className="block text-[10px] font-mono text-amber-400 font-bold uppercase mb-1">
                      2ND QUESTION / OBJECT CLUE
                    </span>
                    <p className="text-sm font-mono font-semibold text-amber-200/90 leading-relaxed whitespace-pre-wrap">
                      "{roundData.clueText}"
                    </p>
                  </div>
                )}

                {photoStatus?.status === "PENDING" ? (
                  /* PENDING APPROVAL LOADING SCREEN */
                  <div className="p-8 bg-slate-950/90 border border-amber-500/40 rounded-2xl text-center space-y-4 animate-pulse">
                    <div className="relative w-16 h-16 mx-auto">
                      <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-400 animate-spin" />
                      <Clock3 className="w-7 h-7 text-amber-400 absolute inset-0 m-auto" />
                    </div>
                    <div>
                      <h3 className="text-base font-mono font-black text-amber-400 uppercase tracking-wider">
                        VERIFYING WITH ORGANIZERS...
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                        Your object photo proof has been transmitted to the Command Center. Please stay on this screen while organizers review your submission.
                      </p>
                    </div>
                    <span className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase">
                      STATUS: PENDING ORGANIZER APPROVAL
                    </span>
                  </div>
                ) : (
                  /* UPLOAD / RE-UPLOAD FORM */
                  <form onSubmit={handleUploadPhotoSubmit} className="space-y-4">
                    {photoStatus?.status === "REJECTED" && (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/40 rounded-2xl text-rose-300 font-mono text-xs space-y-1">
                        <div className="flex items-center gap-2 font-bold text-rose-400 uppercase">
                          <XCircle className="w-4 h-4" />
                          <span>ORGANIZER REJECTED PREVIOUS PHOTO</span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Reason: "{photoStatus.rejectReason || "Incorrect location / Photo unclear."}"
                        </p>
                        <p className="text-[10px] text-rose-400/80 font-bold mt-1">
                          Please capture a clear photo of the physical object/location and re-upload.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-mono text-slate-300 uppercase font-bold">
                        CAPTURE / UPLOAD OBJECT PHOTO
                      </label>

                      {selectedPhoto ? (
                        <div className="relative rounded-2xl overflow-hidden border border-amber-500/50 bg-slate-950 p-2">
                          <img
                            src={selectedPhoto}
                            alt="Captured Object Preview"
                            className="w-full h-56 object-cover rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 right-4 bg-rose-900/80 hover:bg-rose-800 text-white p-1.5 rounded-lg text-xs font-mono transition"
                          >
                            ✕ Change Photo
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-700 hover:border-amber-400/60 bg-slate-950/70 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition">
                          <UploadCloud className="w-10 h-10 text-amber-400/80" />
                          <div className="text-center">
                            <span className="text-xs font-mono font-bold text-slate-200 block uppercase">
                              TAP TO CAPTURE OR CHOOSE OBJECT PHOTO
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 block mt-1">
                              Auto-compresses to ~300KB for instant upload
                            </span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedPhoto || uploadingPhoto}
                      className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-black text-sm tracking-wider uppercase rounded-xl transition shadow-lg disabled:opacity-40 cursor-pointer"
                    >
                      {uploadingPhoto ? (
                        <span className="flex items-center justify-center gap-2">
                          <Compass className="w-4 h-4 text-slate-950 animate-spin" />
                          <span>COMPRESSING & TRANSMITTING...</span>
                        </span>
                      ) : (
                        "SUBMIT OBJECT PHOTO FOR APPROVAL"
                      )}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="bg-[#0F172A]/50 border border-slate-800 rounded-3xl p-6 text-center space-y-2 opacity-75">
                <Camera className="w-6 h-6 text-slate-600 mx-auto" />
                <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">
                  🔒 STEP 2: OBJECT RECONNAISSANCE PHOTO PROOF LOCKED
                </h3>
                <p className="text-xs font-mono text-slate-500 max-w-sm mx-auto">
                  Decode and verify the target location above to unlock your photo proof submission!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= ROUND 3: MORSE CODE + 4 QUESTIONS ================= */}
        {roundData.roundNumber === 3 && (
          <div className="space-y-4">
            {/* Step 1: Morse Location */}
            <div className="bg-[#0F172A]/90 border border-amber-500/40 rounded-3xl p-6 glow-gold">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Radio className="w-4 h-4" />
                  <span>STEP 1: MORSE CODE TRANSMISSION</span>
                </div>
                {roundData.isLocationVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-bold rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                )}
              </div>

              {/* Morse text display */}
              <div className="rounded-2xl bg-slate-950 border border-slate-750 p-4 sm:p-6 mb-4">
                {roundData.imagePath ? (
                  <img
                    src={roundData.imagePath}
                    alt="Morse Code Schematic"
                    className="w-full h-auto object-contain rounded-xl max-h-56"
                  />
                ) : roundData.encodedNumbers ? (
                  <div className="text-center space-y-2">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-3">INCOMING TRANSMISSION</p>
                    <p className="text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-[0.25em] leading-relaxed break-all whitespace-pre-wrap">
                      {roundData.encodedNumbers}
                    </p>
                    <p className="text-[10px] font-mono text-slate-600 mt-3">DECODE TO REVEAL YOUR PHYSICAL DESTINATION</p>
                  </div>
                ) : (
                  <p className="text-sm font-mono text-slate-500 text-center">Awaiting morse transmission...</p>
                )}
              </div>

              {!roundData.isLocationVerified ? (
                <form onSubmit={handleVerifyLocation} className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      ENTER DECODED MORSE LOCATION
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Campus..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifyingLocation || !locationInput.trim()}
                    className="w-full py-3.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-mono font-black text-xs tracking-wider uppercase rounded-xl transition cursor-pointer disabled:opacity-40"
                  >
                    {verifyingLocation ? (
                      <span className="flex items-center justify-center gap-2">
                        <Compass className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>VERIFYING MORSE LOCATION...</span>
                      </span>
                    ) : (
                      "VERIFY MORSE LOCATION"
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-mono text-xs font-semibold text-center">
                  ✓ Morse Location Confirmed! Field Reconnaissance Questions Unlocked.
                </div>
              )}
            </div>

            {/* Step 2: 4 Physical Location Questions (Unlocked ONLY when Location Verified) */}
            {roundData.isLocationVerified ? (
              <div className="bg-[#0F172A]/90 border border-slate-750 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>STEP 2: FOUR PHYSICAL RECONNAISSANCE QUESTIONS</span>
                </div>
                <p className="text-xs font-mono text-slate-400 mb-6">
                  Travel to the verified Morse location. All 4 field questions must be answered correctly.
                </p>

                <form onSubmit={handleSubmitAnswer} className="space-y-5">
                  {roundData.subQuestions?.map((q, idx) => {
                    const status = subStatus[q.id] ?? "idle";
                    const isChecking = subChecking[q.id] ?? false;
                    const inputVal = subAnswers[q.id] ?? "";

                    return (
                      <div
                        key={q.id}
                        className={`relative bg-slate-950/80 border p-4 rounded-2xl transition-all duration-300 ${
                          status === "correct"
                            ? "border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : status === "wrong"
                            ? "border-rose-500/70 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                            : "border-slate-800"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <label className="block text-xs font-mono text-amber-400 font-bold uppercase leading-tight pr-2">
                            QUESTION {idx + 1}: {q.question}
                          </label>
                          {status === "correct" && (
                            <span className="flex items-center gap-1 shrink-0 px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-black rounded-lg">
                              <CheckCircle2 className="w-3 h-3" /> VERIFIED
                            </span>
                          )}
                          {status === "wrong" && (
                            <span className="flex items-center gap-1 shrink-0 px-2.5 py-1 bg-rose-500/20 border border-rose-500/50 text-rose-400 font-mono text-[10px] font-black rounded-lg">
                              <AlertTriangle className="w-3 h-3" /> INCORRECT
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder={`Answer ${idx + 1}...`}
                            value={inputVal}
                            onChange={(e) => {
                              if (subStatus[q.id]) {
                                setSubStatus((prev) => ({ ...prev, [q.id]: "idle" }));
                              }
                              setSubAnswers((prev) => ({ ...prev, [q.id]: e.target.value }));
                            }}
                            disabled={status === "correct"}
                            className={`flex-1 bg-slate-900 border rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none transition ${
                              status === "correct"
                                ? "border-emerald-600/50 text-emerald-300 cursor-not-allowed opacity-75"
                                : status === "wrong"
                                ? "border-rose-600/50 focus:border-rose-400"
                                : "border-slate-700 focus:border-amber-400"
                            }`}
                          />
                          <button
                            type="button"
                            disabled={!inputVal.trim() || isChecking || status === "correct"}
                            onClick={() => handleCheckSubQuestion(q.id)}
                            className={`shrink-0 px-4 py-2 rounded-xl font-mono font-black text-xs uppercase tracking-wider transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              status === "correct"
                                ? "bg-emerald-600/30 text-emerald-400 cursor-default"
                                : "bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-400 cursor-pointer"
                            }`}
                          >
                            {isChecking ? (
                              <span className="animate-pulse">···</span>
                            ) : status === "correct" ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              "CHECK"
                            )}
                          </button>
                        </div>
                        {status === "wrong" && (
                          <p className="mt-2 text-[11px] font-mono text-rose-400">
                            ✗ Not quite. Re-examine the physical location and try again.
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {(() => {
                    const total = roundData.subQuestions?.length ?? 0;
                    const passed = Object.values(subStatus).filter((s) => s === "correct").length;
                    const allPassed = passed === total && total > 0;
                    return (
                      <>
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                              style={{ width: total > 0 ? `${(passed / total) * 100}%` : "0%" }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-400 shrink-0">
                            {passed}/{total} VERIFIED
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={!allPassed || submitting}
                          className={`w-full py-4 font-mono font-black text-sm tracking-wider uppercase rounded-xl transition shadow-lg ${
                            allPassed
                              ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-slate-950 cursor-pointer shadow-emerald-900/40"
                              : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                          }`}
                        >
                          {submitting ? (
                            "FINALIZING ROUND 3..."
                          ) : allPassed ? (
                            "✓ ALL VERIFIED — UNLOCK ROUND 4"
                          ) : (
                            `🔒 LOCKED — ${total - passed} QUESTION${total - passed !== 1 ? "S" : ""} REMAINING`
                          )}
                        </button>
                      </>
                    );
                  })()}
                </form>
              </div>
            ) : (
              <div className="bg-[#0F172A]/50 border border-slate-800 rounded-3xl p-6 text-center space-y-2 opacity-75">
                <Radio className="w-6 h-6 text-slate-600 mx-auto" />
                <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">
                  🔒 FIELD RECONNAISSANCE QUESTIONS LOCKED
                </h3>
                <p className="text-xs font-mono text-slate-500 max-w-sm mx-auto">
                  Decode and verify the morse code location above to unlock the 4 field reconnaissance questions!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= ROUND 4: DECOY IMAGE & ANAGRAM ================= */}
        {roundData.roundNumber === 4 && (
          <div className="space-y-4">
            {/* Step 1: Location Anomaly */}
            <div className="bg-[#0F172A]/90 border border-amber-500/40 rounded-3xl p-6 glow-gold">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>STEP 1: ARTIFACT ANOMALY LOCATION</span>
                </div>
                {roundData.isLocationVerified && (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-mono text-[10px] font-bold rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> VERIFIED
                  </span>
                )}
              </div>

              {/* Physical Location Target Clue (Malayalam Riddle) */}
              {roundData.locationText && (
                <h2 className="text-sm sm:text-base font-mono font-semibold text-amber-200/90 tracking-wide mb-4 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 leading-relaxed whitespace-pre-wrap">
                  "{roundData.locationText}"
                </h2>
              )}

              {roundData.imagePath && (
                <div className="rounded-2xl overflow-hidden border border-slate-750 bg-slate-950 p-2 mb-4">
                  <img
                    src={roundData.imagePath}
                    alt="Artifact Anomaly Schematic"
                    className="w-full h-auto object-contain rounded-xl max-h-64"
                  />
                </div>
              )}

              {!roundData.isLocationVerified ? (
                <form onSubmit={handleVerifyLocation} className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                      ENTER TARGET LOCATION NAME / CODE
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PRP Block, Central Library..."
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none transition"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={verifyingLocation || !locationInput.trim()}
                    className="w-full py-3.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-400 font-mono font-black text-xs tracking-wider uppercase rounded-xl transition cursor-pointer disabled:opacity-40"
                  >
                    {verifyingLocation ? (
                      <span className="flex items-center justify-center gap-2">
                        <Compass className="w-4 h-4 text-amber-400 animate-spin" />
                        <span>VERIFYING TARGET LOCATION...</span>
                      </span>
                    ) : (
                      "VERIFY TARGET LOCATION"
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-mono text-xs font-semibold text-center">
                  ✓ Target Location Confirmed! Master Anagram Clue Unlocked Below.
                </div>
              )}
            </div>

            {/* Step 2: Master Anagram Object Clue (Unlocked ONLY when Location Verified) */}
            {roundData.isLocationVerified ? (
              <div className="bg-[#0F172A]/90 border border-slate-750 rounded-3xl p-6 sm:p-8 shadow-2xl animate-in fade-in duration-300">
                <p className="text-xs font-mono text-slate-300 bg-slate-950/80 p-4 rounded-xl border border-slate-800 mb-4">
                  "{roundData.clueText}"
                </p>

                <form onSubmit={handleSubmitAnswer} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
                      ASSEMBLED MASTER WORD
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter final anagram word..."
                      value={answerInput}
                      onChange={(e) => setAnswerInput(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-4 py-3.5 text-base font-mono font-bold tracking-widest text-white placeholder-slate-600 focus:outline-none transition uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-mono font-black text-sm tracking-wider uppercase rounded-xl transition shadow-lg disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "QUALIFYING WITH SERVER..." : "SUBMIT TO CLAIM FINAL FIVE SLOT"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-[#0F172A]/50 border border-slate-800 rounded-3xl p-6 text-center space-y-2 opacity-75">
                <Sparkles className="w-6 h-6 text-slate-600 mx-auto" />
                <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">
                  🔒 MASTER ANAGRAM CLUE LOCKED
                </h3>
                <p className="text-xs font-mono text-slate-500 max-w-sm mx-auto">
                  Verify the anomaly target sector above to unlock the master anagram clue!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= FINALIST WAITING ROOM ================= */}
        {isFinalWaiting && (
          <div className="bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#090D16] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl glow-gold-lg text-center space-y-6">
            <div className="inline-flex p-4 bg-amber-500/20 rounded-full border border-amber-400/50">
              <Sparkles className="w-10 h-10 text-amber-400 animate-spin-slow" />
            </div>

            <div>
              <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-widest">
                STAGE 4 CLEARED
              </span>
              <h2 className="text-2xl sm:text-3xl font-mono font-black text-white uppercase tracking-tight mt-1">
                YOU MADE THE FINAL FIVE!
              </h2>
            </div>

            <div className="p-6 bg-slate-950/90 border border-amber-500/40 rounded-2xl glow-gold">
              <span className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                OFFICIAL FINALIST POSITION
              </span>
              <div className="font-mono font-black text-4xl sm:text-5xl text-amber-400 tracking-wider">
                0{roundData.position} / 05
              </div>
            </div>

            {/* Synchronized Countdown Clock */}
            <CountdownTimer
              targetDate={roundData.finalStartAt || null}
              onComplete={fetchCurrentRound}
            />
          </div>
        )}

        {/* ================= SYNCHRONIZED FINAL ROUND (LIVE) ================= */}
        {isFinalActive && (
          <div className="bg-gradient-to-b from-[#1E293B] via-[#0F172A] to-[#090D16] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl glow-gold-lg space-y-6">
            <div className="text-center">
              <div className="inline-flex p-3 bg-amber-500/20 rounded-full border border-amber-400/50 mb-3">
                <Key className="w-8 h-8 text-amber-400 animate-bounce" />
              </div>
              <span className="block text-xs font-mono text-amber-400 font-bold uppercase tracking-widest">
                THE FINAL HUNT IS LIVE
              </span>
              <h2 className="text-2xl sm:text-3xl font-mono font-black text-white uppercase tracking-tight mt-1">
                {roundData.title}
              </h2>
            </div>

            {roundData.locationText && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="block text-xs font-mono text-amber-400 uppercase font-bold">
                    PHYSICAL VAULT LOCATION
                  </span>
                  <span className="text-sm font-mono text-white font-bold">
                    {roundData.locationText}
                  </span>
                </div>
              </div>
            )}

            <div className="p-6 bg-slate-950/90 border border-slate-750 rounded-2xl">
              <span className="block text-xs font-mono text-amber-400 uppercase font-bold mb-2">
                FINAL GOLDEN KEY CLUE
              </span>
              <p className="text-base sm:text-lg font-mono font-bold text-white leading-relaxed">
                "{roundData.clueText}"
              </p>
            </div>

            <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-center">
              <p className="text-xs font-mono text-slate-300">
                {roundData.instructions ||
                  "Recover the physical key, unlock the treasure chest, and present the artifact to event organizers!"}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Auxiliary Modals */}
      <VictoryModal
        winner={winnerData}
        isOpen={isWinnerModalOpen}
        onClose={() => setIsWinnerModalOpen(false)}
      />
    </div>
  );
}
