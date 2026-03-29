import type { CompletionStatus } from "@/lib/types";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export type ApiQuestVerificationConfig = {
  endpointUrl: string;
  method: "GET" | "POST";
  authHeaderName?: string;
  authHeaderValue?: string;
  failureMode: "reject" | "pending-review";
  callbackToken?: string;
};

export function parseApiQuestVerificationConfig(metadata: Record<string, unknown>): ApiQuestVerificationConfig | null {
  const rawConfig = metadata.apiVerification;
  if (!rawConfig || typeof rawConfig !== "object") {
    return null;
  }

  const config = rawConfig as Record<string, unknown>;
  const endpointUrl = normalizeText(config.endpointUrl);
  if (!endpointUrl) {
    return null;
  }

  const method = normalizeText(config.method).toUpperCase() === "GET" ? "GET" : "POST";
  const failureMode = normalizeText(config.failureMode) === "pending-review" ? "pending-review" : "reject";
  const authHeaderName = normalizeText(config.authHeaderName);
  const authHeaderValue = normalizeText(config.authHeaderValue);
  const callbackToken = normalizeText(config.callbackToken);

  return {
    endpointUrl,
    method,
    authHeaderName: authHeaderName || undefined,
    authHeaderValue: authHeaderValue || undefined,
    failureMode,
    callbackToken: callbackToken || undefined,
  };
}

export function mergeApiVerificationCallbackSubmission({
  submissionData,
  approved,
  callbackAt,
  verifierResponse,
  callbackMessage,
}: {
  submissionData: Record<string, unknown>;
  approved: boolean;
  callbackAt: string;
  verifierResponse?: Record<string, unknown> | null;
  callbackMessage?: string;
}) {
  const rawVerification =
    submissionData.apiVerification && typeof submissionData.apiVerification === "object"
      ? (submissionData.apiVerification as Record<string, unknown>)
      : {};

  return {
    ...submissionData,
    apiVerification: {
      ...rawVerification,
      approved,
      message:
        callbackMessage && callbackMessage.trim()
          ? callbackMessage.trim()
          : typeof rawVerification.message === "string"
            ? rawVerification.message
            : approved
              ? "Verification passed."
              : "Verification did not pass.",
      callbackReceivedAt: callbackAt,
      callbackResponse: verifierResponse ?? null,
    },
    moderatedAt: callbackAt,
    moderationNote:
      callbackMessage && callbackMessage.trim()
        ? callbackMessage.trim()
        : typeof submissionData.moderationNote === "string"
          ? submissionData.moderationNote
          : null,
  };
}

export async function executeApiQuestVerification({
  config,
  quest,
  user,
  payload,
  submittedAt,
  fetcher = fetch,
}: {
  config: ApiQuestVerificationConfig;
  quest: {
    id: string;
    title: string;
    verificationType: string;
  };
  user: {
    id: string;
    email: string | null;
    displayName: string;
  };
  payload: Record<string, unknown>;
  submittedAt: string;
  fetcher?: typeof fetch;
}): Promise<{
  status: CompletionStatus;
  message: string;
  submissionData: Record<string, unknown>;
}> {
  const platform = normalizeText(payload.platform);
  const contentUrl = normalizeText(payload.contentUrl);
  const note = normalizeText(payload.note);

  const headers = new Headers();
  if (config.authHeaderName && config.authHeaderValue) {
    headers.set(config.authHeaderName, config.authHeaderValue);
  }

  const requestBody = {
    submittedAt,
    quest: {
      id: quest.id,
      title: quest.title,
      verificationType: quest.verificationType,
    },
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
    submission: {
      platform: platform || null,
      contentUrl: contentUrl || null,
      note: note || null,
    },
  };

  let response: Response;
  if (config.method === "GET") {
    const url = new URL(config.endpointUrl);
    url.searchParams.set("submittedAt", submittedAt);
    url.searchParams.set("questId", quest.id);
    url.searchParams.set("questTitle", quest.title);
    url.searchParams.set("verificationType", quest.verificationType);
    url.searchParams.set("userId", user.id);
    url.searchParams.set("userDisplayName", user.displayName);
    if (user.email) {
      url.searchParams.set("userEmail", user.email);
    }
    if (platform) {
      url.searchParams.set("platform", platform);
    }
    if (contentUrl) {
      url.searchParams.set("contentUrl", contentUrl);
    }
    if (note) {
      url.searchParams.set("note", note);
    }
    response = await fetcher(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });
  } else {
    headers.set("Content-Type", "application/json");
    response = await fetcher(config.endpointUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
  }

  const responseText = await response.text();
  let parsedBody: Record<string, unknown> | null = null;
  if (responseText) {
    try {
      parsedBody = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    throw new Error(
      typeof parsedBody?.error === "string"
        ? parsedBody.error
        : `Verification endpoint returned ${response.status}.`,
    );
  }

  if (parsedBody && parsedBody.ok === false) {
    throw new Error(
      typeof parsedBody.error === "string"
        ? parsedBody.error
        : typeof parsedBody.message === "string"
          ? parsedBody.message
          : "Verification endpoint reported an error.",
    );
  }

  const approved = parsedBody?.approved === true;
  const status: CompletionStatus = approved
    ? "approved"
    : config.failureMode === "pending-review"
      ? "pending"
      : "rejected";

  const message =
    typeof parsedBody?.message === "string" && parsedBody.message.trim()
      ? parsedBody.message
      : approved
        ? "Verification passed."
        : status === "pending"
          ? "Verification sent for follow-up review."
          : "Verification did not pass.";

  return {
    status,
    message,
    submissionData: {
      submittedAt,
      platform: platform || null,
      contentUrl: contentUrl || null,
      note: note || null,
      apiVerification: {
        endpointUrl: config.endpointUrl,
        method: config.method,
        failureMode: config.failureMode,
        approved,
        message,
        response: parsedBody,
      },
    },
  };
}
