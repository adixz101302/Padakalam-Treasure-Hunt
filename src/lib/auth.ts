import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const AUTH_SECRET = process.env.AUTH_SECRET || "anveshipin-kandethum-secret-key-32chars-minimum-prod";
const TEAM_COOKIE_NAME = "ak_team_session";
const ADMIN_COOKIE_NAME = "ak_admin_session";

export interface TeamTokenPayload {
  teamId: string;
  teamName: string;
  role: "team";
  iat?: number;
  exp?: number;
}

export interface AdminTokenPayload {
  username: string;
  role: "admin";
  iat?: number;
  exp?: number;
}

// ================= TEAM AUTH =================
export function signTeamToken(payload: { teamId: string; teamName: string }): string {
  return jwt.sign(
    {
      teamId: payload.teamId,
      teamName: payload.teamName,
      role: "team",
    },
    AUTH_SECRET,
    { expiresIn: "24h" }
  );
}

export function verifyTeamToken(token: string): TeamTokenPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as TeamTokenPayload;
    if (decoded.role !== "team" || !decoded.teamId) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getTeamSession(): Promise<TeamTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TEAM_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyTeamToken(token);
}

export function getTeamFromRequest(req: NextRequest): TeamTokenPayload | null {
  const cookieToken = req.cookies.get(TEAM_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;
  if (!token) return null;
  return verifyTeamToken(token);
}

// ================= ADMIN AUTH =================
export function signAdminToken(username: string): string {
  return jwt.sign(
    {
      username,
      role: "admin",
    },
    AUTH_SECRET,
    { expiresIn: "12h" }
  );
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as AdminTokenPayload;
    if (decoded.role !== "admin" || !decoded.username) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<AdminTokenPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function getAdminFromRequest(req: NextRequest): AdminTokenPayload | null {
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;
  if (!token) return null;
  return verifyAdminToken(token);
}

export const COOKIE_NAMES = {
  TEAM: TEAM_COOKIE_NAME,
  ADMIN: ADMIN_COOKIE_NAME,
};
