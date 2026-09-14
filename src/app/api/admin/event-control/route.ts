import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";
import { broadcastEvent } from "@/lib/sse";

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const body = await req.json();
    const action = body.action; // "PAUSE", "RESUME", "LOCK", "UNLOCK", "START_FINAL_NOW", "RESET_EVENT"

    let event = await prisma.event.findFirst();
    if (!event) {
      event = await prisma.event.create({
        data: { name: "Anveshipin Kandethum 2026", status: "ACTIVE" },
      });
    }

    if (action === "PAUSE") {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: "PAUSED" },
      });
      await logAuditEvent("EVENT_STATE_CHANGE", "Admin PAUSED the event. All submissions are temporarily frozen.");
      broadcastEvent("EVENT_STATUS", { status: "PAUSED" });
      return jsonSuccess({ message: "Event paused. Submissions frozen." });
    }

    if (action === "RESUME") {
      await prisma.event.update({
        where: { id: event.id },
        data: { status: "ACTIVE" },
      });
      await logAuditEvent("EVENT_STATE_CHANGE", "Admin RESUMED the event.");
      broadcastEvent("EVENT_STATUS", { status: "ACTIVE" });
      return jsonSuccess({ message: "Event resumed." });
    }

    if (action === "LOCK") {
      await prisma.event.update({
        where: { id: event.id },
        data: { isLocked: true },
      });
      await logAuditEvent("EVENT_STATE_CHANGE", "Admin LOCKED the game.");
      broadcastEvent("EVENT_STATUS", { isLocked: true });
      return jsonSuccess({ message: "Game locked." });
    }

    if (action === "UNLOCK") {
      await prisma.event.update({
        where: { id: event.id },
        data: { isLocked: false },
      });
      await logAuditEvent("EVENT_STATE_CHANGE", "Admin UNLOCKED the game.");
      broadcastEvent("EVENT_STATUS", { isLocked: false });
      return jsonSuccess({ message: "Game unlocked." });
    }

    if (action === "START_FINAL_NOW") {
      const now = new Date();
      await prisma.event.update({
        where: { id: event.id },
        data: { finalStartedAt: now },
      });
      await logAuditEvent("FINAL_STARTED", "Admin triggered immediate start for the Final Round!");
      broadcastEvent("FINAL_COUNTDOWN", {
        finalStartAt: now.toISOString(),
        message: "Final Round is LIVE NOW!",
      });
      return jsonSuccess({ message: "Final round started immediately." });
    }

    if (action === "RESET_EVENT") {
      if (body.confirmation !== "CONFIRM_RESET_ALL_DATA") {
        return jsonError("Confirmation string mismatch. Provide 'CONFIRM_RESET_ALL_DATA'.", 400);
      }

      // Reset all team progress, submissions, finalists, and winner
      await prisma.winner.deleteMany();
      await prisma.finalist.deleteMany();
      await prisma.submissionAttempt.deleteMany();
      await prisma.teamProgress.updateMany({
        data: {
          state: "QUALIFIER_ACTIVE",
          currentRound: 0,
          currentStep: 0,
          totalAttempts: 0,
          qualifierCompletedAt: null,
          round1CompletedAt: null,
          round2CompletedAt: null,
          round3CompletedAt: null,
          round4CompletedAt: null,
          finalStartedAt: null,
          completedAt: null,
          metadata: null,
        },
      });
      await prisma.team.updateMany({
        data: { isDisqualified: false, isActive: true },
      });
      await prisma.event.update({
        where: { id: event.id },
        data: { status: "ACTIVE", isLocked: false, finalStartedAt: null, winnerTeamId: null },
      });

      await logAuditEvent("EVENT_STATE_CHANGE", "Admin performed a complete EVENT RESET.");
      broadcastEvent("EVENT_RESET", { message: "The event has been reset by organizers." });

      return jsonSuccess({ message: "Event successfully reset to initial state." });
    }

    return jsonError("Invalid event control action.", 400);
  } catch (error) {
    console.error("Event control error:", error);
    return jsonError("Server error executing event control.", 500);
  }
}
