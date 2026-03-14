type AdminDirectoryResponse = {
  roleDirectory: unknown;
  adminDirectory: unknown;
};

type QuestDefinitionInput = Record<string, unknown>;
type EconomySettingsInput = Record<string, unknown>;

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

export async function handleRoleDirectoryRequest(
  getRoleDirectory: () => Promise<unknown>,
) {
  try {
    const users = await getRoleDirectory();

    return {
      status: 200,
      body: { ok: true, users },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load role directory.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleReviewerRoleUpdateRequest(
  body: {
    userId?: string;
    reviewerEnabled?: boolean;
  },
  updateReviewerRole: (input: { userId: string; enabled: boolean }) => Promise<unknown>,
) {
  if (!body.userId || typeof body.reviewerEnabled !== "boolean") {
    return {
      status: 400,
      body: { ok: false, error: "userId and reviewerEnabled are required." },
    };
  }

  try {
    const users = await updateReviewerRole({
      userId: body.userId,
      enabled: body.reviewerEnabled,
    });

    return {
      status: 200,
      body: { ok: true, users },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update reviewer roles.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleQuestDefinitionDirectoryRequest(
  getQuestDefinitionDirectory: () => Promise<unknown>,
) {
  try {
    const quests = await getQuestDefinitionDirectory();

    return {
      status: 200,
      body: { ok: true, quests },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load quest definitions.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleQuestDefinitionCreateRequest(
  body: QuestDefinitionInput,
  createQuestDefinition: (input: QuestDefinitionInput) => Promise<unknown>,
) {
  try {
    const quests = await createQuestDefinition(body);

    return {
      status: 200,
      body: { ok: true, quests },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create quest definition.";

    return {
      status: message.includes("requires")
        ? 400
        : getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleQuestDefinitionUpdateRequest(
  {
    questId,
    body,
  }: {
    questId: string;
    body: QuestDefinitionInput;
  },
  updateQuestDefinition: (questId: string, input: QuestDefinitionInput) => Promise<unknown>,
) {
  try {
    const quests = await updateQuestDefinition(questId, body);

    return {
      status: 200,
      body: { ok: true, quests },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update quest definition.";

    return {
      status: message.includes("not found")
        ? 404
        : message.includes("requires")
          ? 400
          : getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleQuestDefinitionDeleteRequest(
  questId: string,
  deleteQuestDefinition: (questId: string) => Promise<unknown>,
) {
  try {
    const quests = await deleteQuestDefinition(questId);

    return {
      status: 200,
      body: { ok: true, quests },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete quest definition.";

    return {
      status: message.includes("not found") ? 404 : getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleModerationNotificationAcknowledgeRequest(
  deliveryId: string,
  acknowledgeNotification: (deliveryId: string) => Promise<unknown>,
) {
  if (!deliveryId) {
    return {
      status: 400,
      body: { ok: false, error: "deliveryId is required." },
    };
  }

  try {
    const history = await acknowledgeNotification(deliveryId);

    return {
      status: 200,
      body: { ok: true, history },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to acknowledge moderation notification.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleEconomySettingsRequest(
  getEconomySettings: () => Promise<unknown>,
) {
  try {
    const result = await getEconomySettings();

    return {
      status: 200,
      body: { ok: true, ...((result as Record<string, unknown>) ?? {}) },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load economy settings.";

    return {
      status: getErrorStatus(message),
      body: { ok: false, error: message },
    };
  }
}

export async function handleEconomySettingsUpdateRequest(
  body: EconomySettingsInput,
  saveEconomySettings: (input: EconomySettingsInput) => Promise<unknown>,
) {
  try {
    const result = await saveEconomySettings(body);

    return {
      status: 200,
      body: { ok: true, ...((result as Record<string, unknown>) ?? {}) },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save economy settings.";

    return {
      status: message.includes("Economy settings require")
        ? 400
        : getErrorStatus(message),
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
