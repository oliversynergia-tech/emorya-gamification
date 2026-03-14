import { NextResponse } from "next/server";

import { handleReviewerRoleUpdateRequest, handleRoleDirectoryRequest } from "@/server/http/admin-handlers";
import { getRoleDirectory, updateReviewerRole } from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await handleRoleDirectoryRequest(getRoleDirectory);

  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    userId?: string;
    reviewerEnabled?: boolean;
  };
  const result = await handleReviewerRoleUpdateRequest(body, updateReviewerRole);

  return NextResponse.json(result.body, { status: result.status });
}
