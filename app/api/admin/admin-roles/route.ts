import { NextResponse } from "next/server";

import {
  getAdminDirectory,
  grantAdminRole,
  revokeAdminRole,
} from "@/server/services/admin-service";

export const dynamic = "force-dynamic";

function getErrorStatus(message: string) {
  return message.includes("signed in")
    ? 401
    : message.includes("Admin access")
      ? 403
      : 400;
}

export async function GET() {
  try {
    const admins = await getAdminDirectory();
    return NextResponse.json({ ok: true, admins });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin directory.";
    return NextResponse.json({ ok: false, error: message }, { status: getErrorStatus(message) });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      confirmation?: string;
    };

    if (!body.email || !body.confirmation) {
      return NextResponse.json(
        { ok: false, error: "email and confirmation are required." },
        { status: 400 },
      );
    }

    const result = await grantAdminRole({
      email: body.email,
      confirmation: body.confirmation,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to grant admin access.";
    return NextResponse.json({ ok: false, error: message }, { status: getErrorStatus(message) });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      confirmation?: string;
    };

    if (!body.userId || !body.confirmation) {
      return NextResponse.json(
        { ok: false, error: "userId and confirmation are required." },
        { status: 400 },
      );
    }

    const result = await revokeAdminRole({
      userId: body.userId,
      confirmation: body.confirmation,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke admin access.";
    return NextResponse.json({ ok: false, error: message }, { status: getErrorStatus(message) });
  }
}
