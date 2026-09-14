import { NextResponse } from "next/server";
import { COOKIE_NAMES } from "@/lib/auth";
import { jsonSuccess } from "@/lib/security";

export async function POST() {
  const response = jsonSuccess({ message: "Logged out successfully" });
  response.cookies.delete(COOKIE_NAMES.TEAM);
  response.cookies.delete(COOKIE_NAMES.ADMIN);
  return response;
}
