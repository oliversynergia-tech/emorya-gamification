type AdminDirectoryResponse = {
  roleDirectory: unknown;
  adminDirectory: unknown;
};

function getErrorStatus(message: string) {
  return message.includes("signed in")
    ? 401
    : message.includes("Super admin access")
      ? 403
      : message.includes("Admin access")
        ? 403
        : 400;
}

export async function handleAdminDirectoryRequest(
  getAdminDirectory: () => Promise<unknown>,
) {
  try {
    const admins = await getAdminDirectory();

    return {
      status: 200,
      body: { ok: true, admins },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load admin directory.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleAdminGrantRequest(
  body: {
    email?: string;
    confirmation?: string;
  },
  grantAdminRole: (input: { email: string; confirmation: string }) => Promise<AdminDirectoryResponse>,
) {
  if (!body.email || !body.confirmation) {
    return {
      status: 400,
      body: { ok: false, error: "email and confirmation are required." },
    };
  }

  try {
    const result = await grantAdminRole({
      email: body.email,
      confirmation: body.confirmation,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to grant admin access.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleAdminRevokeRequest(
  body: {
    userId?: string;
    confirmation?: string;
  },
  revokeAdminRole: (input: { userId: string; confirmation: string }) => Promise<AdminDirectoryResponse>,
) {
  if (!body.userId || !body.confirmation) {
    return {
      status: 400,
      body: { ok: false, error: "userId and confirmation are required." },
    };
  }

  try {
    const result = await revokeAdminRole({
      userId: body.userId,
      confirmation: body.confirmation,
    });

    return {
      status: 200,
      body: { ok: true, ...result },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to revoke admin access.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}
