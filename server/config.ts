import { randomBytes } from "crypto";

const nodeEnv = process.env.NODE_ENV ?? "development";
process.env.NODE_ENV = nodeEnv;
const isProduction = nodeEnv === "production";

function exitWithConfigError(message: string): never {
  console.error(message);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (isProduction && !databaseUrl) {
  exitWithConfigError(
    "DATABASE_URL must be set in production. Set the connection string to your PostgreSQL instance before starting the server."
  );
}

let sessionSecret = process.env.SESSION_SECRET;
if (isProduction && !sessionSecret) {
  exitWithConfigError(
    "SESSION_SECRET must be provided in production and remain stable across restarts."
  );
}

if (!sessionSecret) {
  sessionSecret = randomBytes(32).toString("hex");
  console.warn(
    "SESSION_SECRET was not provided. A temporary value was generated for this development run."
  );
}

process.env.SESSION_SECRET = sessionSecret;
if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

export const config = {
  nodeEnv,
  isProduction,
  databaseUrl: databaseUrl ?? null,
  sessionSecret,
};
