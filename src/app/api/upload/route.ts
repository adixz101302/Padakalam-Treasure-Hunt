import { NextRequest } from "next/server";
import { getAdminFromRequest } from "@/lib/auth";
import { jsonError, jsonSuccess } from "@/lib/security";
import fs from "fs";
import path from "path";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/gif"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  try {
    const admin = getAdminFromRequest(req);
    if (!admin) return jsonError("Unauthorized", 401);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return jsonError("No image file provided.", 400);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError("Image file size exceeds 5MB limit.", 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return jsonError("Invalid file type. Allowed: PNG, JPEG, WEBP, SVG, GIF.", 400);
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Generate safe unique filename
    const extension = path.extname(file.name) || ".png";
    const sanitizedBase = path
      .basename(file.name, extension)
      .replace(/[^a-zA-Z0-9_-]/g, "");
    const filename = `${sanitizedBase}_${Date.now()}${extension}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    return jsonSuccess({
      message: "Image uploaded successfully.",
      url: publicUrl,
      filename,
      size: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return jsonError("Server error saving uploaded file.", 500);
  }
}
