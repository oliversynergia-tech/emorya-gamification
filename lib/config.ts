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
