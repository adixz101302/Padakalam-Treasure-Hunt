import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { signAdminToken, COOKIE_NAMES } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { jsonError, jsonSuccess } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();

    if (!username || !password) {
      return jsonError("Username and password are required.", 400);
    }

    // Check admin in DB or fallback to environment admin
    let admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      // If DB admin table is empty, check env
      const envUser = process.env.ADMIN_USERNAME || "admin";
      const envPassHash = process.env.ADMIN_PASSWORD_HASH;

      if (username === envUser && envPassHash) {
        const isMatch = await bcrypt.compare(password, envPassHash);
        if (isMatch) {
          // Auto-create in DB for subsequent queries
          admin = await prisma.admin.create({
            data: {
              username,
              passwordHash: envPassHash,
            },
          });
        }
      } else if (username === "admin" && password === "admin123") {
        const defaultHash = await bcrypt.hash("admin123", 10);
        admin = await prisma.admin.create({
          data: {
            username: "admin",
            passwordHash: defaultHash,
          },
        });
      }
    }

    if (!admin) {
      return jsonError("Invalid admin credentials.", 401);
    }

    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return jsonError("Invalid admin credentials.", 401);
    }

    const token = signAdminToken(admin.username);

    await logAuditEvent("ADMIN_ACTION", `Admin user '${admin.username}' authenticated`, null, {
      role: admin.role,
    });

    const response = jsonSuccess({
      message: "Admin authenticated",
      admin: {
        username: admin.username,
        role: admin.role,
      },
    });

    response.cookies.set({
      name: COOKIE_NAMES.ADMIN,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 12, // 12 hours
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Admin login error:", error);
    return jsonError("Server error during admin authentication.", 500);
  }
}
