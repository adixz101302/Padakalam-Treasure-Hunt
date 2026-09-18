import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";

// Fetch a single photo submission WITH the image — called only when admin clicks to review
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return jsonError("Unauthorized admin access.", 401);
    }

    const submission = await withRetry(() =>
      prisma.photoSubmission.findUnique({
        where: { id },
        select: {
          id: true,
          teamId: true,
          roundNumber: true,
          status: true,
          rejectReason: true,
          submittedAt: true,
          imageUrl: true, // Only fetched here, not in the list endpoint
          team: {
            select: { teamId: true, teamName: true },
          },
        },
      })
    );

    if (!submission) {
      return jsonError("Submission not found.", 404);
    }

    return jsonSuccess({ submission });
  } catch (error) {
    console.error("Fetch photo submission error:", error);
    return jsonError("Server error fetching submission.", 500);
  }
}
