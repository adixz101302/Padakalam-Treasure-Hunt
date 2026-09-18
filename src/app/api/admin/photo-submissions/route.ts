import { NextRequest, NextResponse } from "next/server";
import prisma, { withRetry } from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) {
      return jsonError("Unauthorized admin access.", 401);
    }

    const { searchParams } = new URL(req.url);
    const specificId = searchParams.get("id");
    const includeImages = searchParams.get("includeImages") || "pending"; // "none" | "pending" | "all"
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit") || 50)), 100);

    // 1. Single Image Retrieval (on-demand full payload fetch)
    if (specificId) {
      const submission = await withRetry(() =>
        prisma.photoSubmission.findUnique({
          where: { id: specificId },
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
      if (!submission) {
        return jsonError("Submission not found.", 404);
      }
      return jsonSuccess({ submission });
    }

    // 2. High-Efficiency List View
    // To protect database egress and memory, we separate pending reviews from history:
    // - Pending submissions include imageUrl only if explicitly requested (default: "pending")
    // - Reviewed submissions NEVER include base64 payload in list view (metadata-only)
    let submissions;

    if (includeImages === "all") {
      submissions = await withRetry(() =>
        prisma.photoSubmission.findMany({
          take: limit,
          orderBy: { submittedAt: "desc" },
          include: {
            team: { select: { teamId: true, teamName: true } },
          },
        })
      );
    } else if (includeImages === "pending") {
      // Pending with image, reviewed without heavy image data
      const [pending, reviewed] = await withRetry(() =>
        Promise.all([
          prisma.photoSubmission.findMany({
            where: { status: "PENDING" },
            take: 20,
            orderBy: { submittedAt: "desc" },
            include: {
              team: { select: { teamId: true, teamName: true } },
            },
          }),
          prisma.photoSubmission.findMany({
            where: { status: { not: "PENDING" } },
            take: 30,
            orderBy: { submittedAt: "desc" },
            select: {
              id: true,
              teamId: true,
              roundNumber: true,
              status: true,
              rejectReason: true,
              submittedAt: true,
              reviewedAt: true,
              reviewedBy: true,
              imageUrl: false,
              team: { select: { teamId: true, teamName: true } },
            },
          }),
        ])
      );

      // Reconstitute reviewed items with placeholder to maintain frontend type safety
      const sanitizedReviewed = reviewed.map((r) => ({
        ...r,
        imageUrl: "[METADATA_ONLY]",
      }));

      submissions = [...pending, ...sanitizedReviewed].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
    } else {
      // Metadata-only for all items
      const raw = await withRetry(() =>
        prisma.photoSubmission.findMany({
          take: limit,
          orderBy: { submittedAt: "desc" },
          select: {
            id: true,
            teamId: true,
            roundNumber: true,
            status: true,
            rejectReason: true,
            submittedAt: true,
            reviewedAt: true,
            reviewedBy: true,
            imageUrl: false,
            team: { select: { teamId: true, teamName: true } },
          },
        })
      );
      submissions = raw.map((r) => ({ ...r, imageUrl: "[METADATA_ONLY]" }));
    }

    // 3. ETag & HTTP 304 Caching support
    const latestTimestamp = submissions[0]?.submittedAt ? new Date(submissions[0].submittedAt).getTime() : 0;
    const etag = `W/"photo-subs-${submissions.length}-${latestTimestamp}"`;

    const clientEtag = req.headers.get("if-none-match");
    if (clientEtag && clientEtag === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      });
    }

    const response = jsonSuccess({ submissions });
    response.headers.set("ETag", etag);
    response.headers.set("Cache-Control", "private, no-cache, must-revalidate");
    return response;
  } catch (error) {
    console.error("Fetch photo submissions error:", error);
    return jsonError("Server error fetching photo submissions.", 500);
  }
}
