type AppConfig = {
  nodeEnv: string;
  isProduction: boolean;
  databaseUrl?: string;
  sessionSecret: string;
};

function resolveNodeEnv() {
  return process.env.NODE_ENV && process.env.NODE_ENV.trim().length > 0
    ? process.env.NODE_ENV
    : "development";
}

function validateConfig(): AppConfig {
  const nodeEnv = resolveNodeEnv();
  const isProduction = nodeEnv === "production";
  const databaseUrl = process.env.DATABASE_URL;
  const sessionSecretEnv = process.env.SESSION_SECRET;

  if (isProduction && !databaseUrl) {
    throw new Error("DATABASE_URL must be provided in production");
  }

  if (isProduction && !sessionSecretEnv) {
    throw new Error("SESSION_SECRET must be provided in production");
  }

  const sessionSecret = sessionSecretEnv ?? "dev-session-secret";

  if (!sessionSecretEnv && !isProduction) {
    console.warn(
      "SESSION_SECRET is not set. Using a fallback development secret. " +
        "Set SESSION_SECRET to silence this warning.",
    );
  }

  return {
    nodeEnv,
    isProduction,
    databaseUrl,
    sessionSecret,
  };
}

export const config = validateConfig();

// Ensure process.env values align with validated configuration to keep
// downstream consumers consistent.
process.env.NODE_ENV = config.nodeEnv;
process.env.SESSION_SECRET = config.sessionSecret;

export function requireDatabaseUrl() {
  if (!config.databaseUrl) {
    throw new Error("A DATABASE_URL is required for this operation");
  }

  return config.databaseUrl;
}
