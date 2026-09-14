import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { getAdminFromRequest, signAdminToken } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const adminSession = getAdminFromRequest(req);
    if (!adminSession) {
      return jsonError("Unauthorized", 401);
    }

    const body = await req.json();
    const currentPassword = (body.currentPassword || "").trim();
    const newUsername = (body.newUsername || "").trim();
    const newPassword = (body.newPassword || "").trim();

    if (!newUsername || !newPassword) {
      return jsonError("New username and new password are required.", 400);
    }

    if (newPassword.length < 6) {
      return jsonError("New password must be at least 6 characters long.", 400);
    }

    // Find current admin in DB
    let admin = await prisma.admin.findFirst({
      where: { username: adminSession.username },
    });

    if (!admin) {
      admin = await prisma.admin.findFirst();
    }

    if (admin && currentPassword) {
      const isCurrentMatch = await bcrypt.compare(currentPassword, admin.passwordHash);
      if (!isCurrentMatch) {
        return jsonError("Current password is incorrect.", 400);
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    if (admin) {
      await prisma.admin.update({
        where: { id: admin.id },
        data: {
          username: newUsername,
          passwordHash: newHash,
        },
      });
    } else {
      await prisma.admin.create({
        data: {
          username: newUsername,
          passwordHash: newHash,
        },
      });
    }

    await logAuditEvent("ADMIN_ACTION", `Admin updated username/password to ${newUsername}`);

    const newToken = signAdminToken(newUsername);

    const response = jsonSuccess({
      message: `Admin credentials updated successfully! New username: ${newUsername}`,
      newUsername,
    });

    response.cookies.set("padakalam_admin_token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 86400 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return jsonError("Failed to update admin credentials.", 500);
  }
}
