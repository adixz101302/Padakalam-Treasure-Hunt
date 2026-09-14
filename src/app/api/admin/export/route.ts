import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError } from "@/lib/security";

export async function GET(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const teams = await prisma.team.findMany({
      include: {
        progress: true,
        finalist: true,
        winner: true,
        submissions: true,
      },
    });

    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
    });

    const event = await prisma.event.findFirst();

    if (format === "csv") {
      const headers = [
        "Team ID",
        "Team Name",
        "Status",
        "Current Round",
        "State",
        "Total Attempts",
        "Is Finalist",
        "Finalist Rank",
        "Is Winner",
        "Qualifier Completed",
        "Round 1 Completed",
        "Round 2 Completed",
        "Round 3 Completed",
        "Round 4 Completed",
      ].join(",");

      const rows = teams.map((t) =>
        [
          `"${t.teamId}"`,
          `"${t.teamName.replace(/"/g, '""')}"`,
          t.isDisqualified ? "Disqualified" : t.isActive ? "Active" : "Inactive",
          t.progress?.currentRound ?? 0,
          t.progress?.state ?? "QUALIFIER_ACTIVE",
          t.progress?.totalAttempts ?? 0,
          t.finalist ? "YES" : "NO",
          t.finalist?.position ?? "",
          t.winner ? "YES" : "NO",
          t.progress?.qualifierCompletedAt ? t.progress.qualifierCompletedAt.toISOString() : "",
          t.progress?.round1CompletedAt ? t.progress.round1CompletedAt.toISOString() : "",
          t.progress?.round2CompletedAt ? t.progress.round2CompletedAt.toISOString() : "",
          t.progress?.round3CompletedAt ? t.progress.round3CompletedAt.toISOString() : "",
          t.progress?.round4CompletedAt ? t.progress.round4CompletedAt.toISOString() : "",
        ].join(",")
      );

      const csvContent = [headers, ...rows].join("\n");

      return new Response(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="anveshipin_kandethum_teams_${Date.now()}.csv"`,
        },
      });
    }

    // JSON Dump format
    const exportData = {
      exportedAt: new Date().toISOString(),
      event,
      teams,
      auditLogs,
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="anveshipin_kandethum_backup_${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return jsonError("Server error during data export.", 500);
  }
}
