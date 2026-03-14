const requiredEnvKeys = [
  "APP_URL",
  "DATABASE_URL",
  "SESSION_SECRET",
  "NEXT_PUBLIC_MULTIVERSX_CHAIN",
] as const;

type RequiredEnvKey = (typeof requiredEnvKeys)[number];

type AppConfig = {
  appUrl: string;
  databaseUrl: string;
  sessionSecret: string;
  multiversxChain: string;
  multiversxWalletConnectProjectId?: string;
  multiversxApiUrl: string;
};

function readNumberEnv(key: string, fallback: number) {
  const raw = process.env[key];

  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readEnv(key: RequiredEnvKey): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function getConfig(): AppConfig {
  return {
    appUrl: readEnv("APP_URL"),
    databaseUrl: readEnv("DATABASE_URL"),
    sessionSecret: readEnv("SESSION_SECRET"),
    multiversxChain: readEnv("NEXT_PUBLIC_MULTIVERSX_CHAIN"),
    multiversxWalletConnectProjectId: process.env.NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID,
    multiversxApiUrl: process.env.MULTIVERSX_API_URL ?? "https://api.multiversx.com",
  };
}

export function getMissingRequiredEnv(): RequiredEnvKey[] {
  return requiredEnvKeys.filter((key) => !process.env[key]);
}

export function hasDatabaseConfig(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDeploymentWarnings() {
  const warnings: string[] = [];
  const appUrl = process.env.APP_URL ?? "";
  const sessionSecret = process.env.SESSION_SECRET ?? "";
  const walletConnectProjectId = process.env.NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID ?? "";
  const multiversxApiUrl = process.env.MULTIVERSX_API_URL ?? "";
  const cronSnapshotsEnabled = process.env.CRON_SNAPSHOTS_ENABLED ?? "";

  if (!appUrl.startsWith("https://")) {
    warnings.push("APP_URL should use https:// in deployed environments.");
  }

  if (sessionSecret.length < 32) {
    warnings.push("SESSION_SECRET should be at least 32 characters.");
  }

  if (!walletConnectProjectId) {
    warnings.push("NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID is missing.");
  }

  if (!multiversxApiUrl.startsWith("https://")) {
    warnings.push("MULTIVERSX_API_URL should use https://.");
  }

  if (cronSnapshotsEnabled !== "true") {
    warnings.push("CRON_SNAPSHOTS_ENABLED is not enabled for scheduled leaderboard maintenance.");
  }

  return warnings;
}

export function getQueueAlertThresholds() {
  return {
    staleMinutes: readNumberEnv("MODERATION_ALERT_STALE_MINUTES", 24 * 60),
    oldestWarningMinutes: readNumberEnv("MODERATION_ALERT_OLDEST_WARNING_MINUTES", 6 * 60),
    backlogWarningCount: readNumberEnv("MODERATION_ALERT_BACKLOG_WARNING_COUNT", 8),
    backlogCriticalCount: readNumberEnv("MODERATION_ALERT_BACKLOG_CRITICAL_COUNT", 15),
    averageWarningMinutes: readNumberEnv("MODERATION_ALERT_AVERAGE_WARNING_MINUTES", 90),
  };
}

export function getModerationAlertChannelConfig() {
  return {
    inboxEnabled: process.env.MODERATION_ALERT_INBOX_ENABLED !== "false",
    webhookUrl: process.env.MODERATION_ALERT_WEBHOOK_URL?.trim() || null,
    emailRecipient: process.env.MODERATION_ALERT_EMAIL_TO?.trim() || null,
    slackWebhookUrl: process.env.MODERATION_ALERT_SLACK_WEBHOOK_URL?.trim() || null,
    discordWebhookUrl: process.env.MODERATION_ALERT_DISCORD_WEBHOOK_URL?.trim() || null,
  };
}
