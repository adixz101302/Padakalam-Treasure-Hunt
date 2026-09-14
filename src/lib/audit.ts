import prisma from "./db";
import { broadcastEvent } from "./sse";

export type AuditEventType =
  | "LOGIN"
  | "LOGOUT"
  | "QUALIFIER_COMPLETE"
  | "ROUND_1_COMPLETE"
  | "ROUND_2_COMPLETE"
  | "ROUND_3_COMPLETE"
  | "ROUND_4_COMPLETE"
  | "FINALIST_QUALIFIED"
  | "FINAL_STARTED"
  | "WINNER_DECLARED"
  | "SUBMISSION_ATTEMPT"
  | "ADMIN_ACTION"
  | "DISQUALIFIED"
  | "RESTORED"
  | "EVENT_STATE_CHANGE";

export async function logAuditEvent(
  eventType: AuditEventType,
  message: string,
  teamId?: string | null,
  details?: Record<string, unknown>
) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        eventType,
        teamId: teamId || null,
        message,
        details: details ? JSON.stringify(details) : null,
      },
    });

    // Broadcast in real-time to active admin dashboards
    broadcastEvent("AUDIT_LOG", {
      id: log.id,
      eventType,
      teamId: teamId || null,
      message,
      details,
      createdAt: log.createdAt.toISOString(),
    });

    return log;
  } catch (error) {
    console.error("Audit log failed:", error);
  }
}
