import { NextRequest } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return jsonError("Unauthorized admin access.", 401);
    }

    const submissions = await withRetry(() =>
      prisma.photoSubmission.findMany({
        orderBy: { submittedAt: "desc" },
        include: {
          team: {
            select: {
              teamId: true,
              teamName: true,
            },
          },
        },
      })
    );

    return jsonSuccess({ submissions });
  } catch (error) {
    console.error("Fetch photo submissions error:", error);
    return jsonError("Server error fetching photo submissions.", 500);
  }
}
