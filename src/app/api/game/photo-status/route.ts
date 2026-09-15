import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { getTeamFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const session = getTeamFromRequest(req);
    if (!session) {
      return jsonError("Unauthorized.", 401);
    }

    const { searchParams } = new URL(req.url);
    const roundNumber = Number(searchParams.get("roundNumber") || 2);

    const submission = await prisma.photoSubmission.findFirst({
      where: {
        teamId: session.teamId,
        roundNumber,
      },
      orderBy: { submittedAt: "desc" },
    });

    if (!submission) {
      return jsonSuccess({ hasSubmission: false });
    }

    return jsonSuccess({
      hasSubmission: true,
      submissionId: submission.id,
      status: submission.status,
      rejectReason: submission.rejectReason,
      submittedAt: submission.submittedAt,
    });
  } catch (error) {
    console.error("Photo status error:", error);
    return jsonError("Server error checking photo status.", 500);
  }
}
