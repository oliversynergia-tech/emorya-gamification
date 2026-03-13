import { NextResponse } from "next/server";

import {
  handleAdminDirectoryRequest,
  handleAdminGrantRequest,
  handleAdminRevokeRequest,
} from "@/server/http/admin-handlers";
import {
  getAdminDirectory,
  grantAdminRole,
  revokeAdminRole,
} from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleAdminDirectoryRequest(getAdminDirectory);

  return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    confirmation?: string;
  };
  const result = await handleAdminGrantRequest(body, grantAdminRole);

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    confirmation?: string;
  };
  const result = await handleAdminRevokeRequest(body, revokeAdminRole);

  return NextResponse.json(result.body, { status: result.status });
}
