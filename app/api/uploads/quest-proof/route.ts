import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/server/services/auth-service";

export const dynamic = "force-dynamic";

const maxUploadBytes = 10 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "video/mp4",
  "video/quicktime",
]);

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim().toLowerCase();
  const safe = trimmed.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
  return safe || "proof-upload";
}

function getUploadExtension(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  return ext ? ext : "";
}

export async function POST(request: Request) {
  const currentUser = await getAuthenticatedUser();

  if (!currentUser) {
    return NextResponse.json({ ok: false, error: "You must be signed in to upload proof." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "A proof file is required." }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ ok: false, error: "Uploaded proof file is empty." }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json({ ok: false, error: "Proof files must be 10MB or smaller." }, { status: 400 });
  }

  if (file.type && !allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ ok: false, error: `Unsupported proof file type: ${file.type}` }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", "quest-proofs");
  await mkdir(uploadDir, { recursive: true });

  const safeFileName = sanitizeFileName(file.name);
  const uploadName = `${Date.now()}-${randomUUID()}${getUploadExtension(safeFileName)}`;
  const destination = path.join(uploadDir, uploadName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(destination, buffer);

  return NextResponse.json({
    ok: true,
    file: {
      url: `/uploads/quest-proofs/${uploadName}`,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
    },
  });
}
