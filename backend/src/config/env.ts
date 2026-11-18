import { z } from "zod";

/**
 * Centralized environment configuration.
 * Bun automatically loads `.env` files — do not add dotenv.
 *
 * All configuration is validated at startup to fail fast on misconfiguration.
 * Fallbacks are provided for development; production must explicitly set values.
 */

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in .env or process.env.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string = ""): string {
  return process.env[name] ?? fallback;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["true", "1", "yes"].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Invalid number for ${value}: ${num}`);
  }
  return num;
}

function validateMongoUri(uri: string): void {
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new Error(
      `Invalid MONGODB_URI: must start with mongodb:// or mongodb+srv://`,
    );
  }
}

function validateRedisUrl(url: string): void {
  if (!url.startsWith("redis://") && !url.startsWith("rediss://")) {
    throw new Error(`Invalid REDIS_URL: must start with redis:// or rediss://`);
  }
}

const nodeEnv = process.env.NODE_ENV ?? "development";

const livekitUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => url.startsWith("http://") || url.startsWith("https://"),
    "LIVEKIT_URL must be an HTTP(S) URL",
  );

const livekitTokenTtlSchema = z.coerce.number().int().min(60).max(900);

const mongoUriSchema = z
  .string()
  .url()
  .refine(
    (uri) => uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://"),
    "MONGODB_URI must be a valid MongoDB URI",
  );

function secret(name: string, developmentFallback: string): string {
  const value = process.env[name];
  if (nodeEnv === "production" && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (
    nodeEnv === "production" &&
    name === "SEED_ADMIN_PASSWORD" &&
    process.env.SEED_ON_START === "true" &&
    !value
  ) {
    throw new Error("SEED_ADMIN_PASSWORD is required when SEED_ON_START=true");
  }
  return value ?? developmentFallback;
}

export const env = {
  // ===== Server =====
  nodeEnv,
  isProd: nodeEnv === "production",
  isDev: nodeEnv !== "production",
  port: parseNumber(process.env.PORT, 3000),
  appName: optional("APP_NAME", "Meetrix"),

  // ===== Database: MongoDB =====
  mongo: {
    uri: (() => {
      const uri = required(
        "MONGODB_URI",
        "mongodb://localhost:27017/merb-starterpack",
      );
      validateMongoUri(uri);
      return uri;
    })(),
    maxPoolSize: parseNumber(process.env.MONGO_POOL_SIZE, 10),
    serverSelectionTimeoutMS: parseNumber(
      process.env.MONGO_TIMEOUT_MS,
      5000,
    ),
    socketTimeoutMS: parseNumber(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
  },

  // Alias agar `env.mongoUri` tetap bisa dipakai (dipakai di beberapa service)
  mongoUri: mongoUriSchema.parse(
    required("MONGODB_URI", "mongodb://localhost:27017/merb-starterpack"),
  ),

  // ===== Cache & Queues: Redis + BullMQ =====
  redis: {
    url: (() => {
      const url = required("REDIS_URL", "redis://localhost:6379");
      validateRedisUrl(url);
      return url;
    })(),
    maxRetriesPerRequest: null as null, // BullMQ requirement for blocking ops
  },

  // ===== JWT Authentication =====
  jwt: {
    accessSecret: secret("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
    refreshSecret: secret("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
    accessExpiresIn: optional("JWT_ACCESS_EXPIRES_IN", "15m"),
    refreshExpiresInDays: parseNumber(
      process.env.JWT_REFRESH_EXPIRES_DAYS,
      7,
    ),
  },

  // ===== Meeting AI =====
  meetingAi: {
    endpoint: process.env.MEETING_AI_ENDPOINT ?? "",
    apiKey: process.env.MEETING_AI_API_KEY ?? "",
    model: process.env.MEETING_AI_MODEL ?? "",
    timeoutMs: z.coerce
      .number()
      .int()
      .min(1000)
      .max(120000)
      .parse(process.env.MEETING_AI_TIMEOUT_MS ?? "30000"),
  },

  // ===== LiveKit =====
  livekit: {
    url: livekitUrlSchema.parse(
      process.env.LIVEKIT_URL ?? "http://localhost:7880",
    ),
    apiKey: secret("LIVEKIT_API_KEY", ""),
    apiSecret: secret("LIVEKIT_API_SECRET", ""),
    tokenTtlSeconds: livekitTokenTtlSchema.parse(
      process.env.LIVEKIT_TOKEN_TTL_SECONDS ?? "600",
    ),
  },

  // ===== Email Configuration =====
  mail: {
    smtpUrl: optional("SMTP_URL", ""),
    from: optional("MAIL_FROM", "no-reply@example.com"),
    runInlineWorker: parseBoolean(process.env.RUN_INLINE_WORKER, false),
  },

  // ===== Seed Configuration =====
  seed: {
    enabled: parseBoolean(process.env.SEED_ON_START, false),
    adminEmail: optional("SEED_ADMIN_EMAIL", "admin@example.com"),
    adminPassword: secret("SEED_ADMIN_PASSWORD", "Admin123!"),
  },

  // ===== Frontend URL =====
  appUrl: optional("APP_URL", "http://localhost:5173"),

  // ===== Logging =====
  logging: {
    level: optional("LOG_LEVEL", "info").toLowerCase() as
      | "debug"
      | "info"
      | "warn"
      | "error",
  },

  // ===== Rate Limiting =====
  rateLimiting: {
    enabled: parseBoolean(process.env.RATE_LIMIT_ENABLED, true),
    login: {
      max: parseNumber(process.env.RATE_LIMIT_LOGIN_MAX, 5),
      windowMs: parseNumber(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 15 * 60 * 1000),
    },
    refresh: {
      max: parseNumber(process.env.RATE_LIMIT_REFRESH_MAX, 10),
      windowMs: parseNumber(process.env.RATE_LIMIT_REFRESH_WINDOW_MS, 60 * 1000),
    },
    passwordReset: {
      max: parseNumber(process.env.RATE_LIMIT_PASSWORD_RESET_MAX, 3),
      windowMs: parseNumber(
        process.env.RATE_LIMIT_PASSWORD_RESET_WINDOW_MS,
        60 * 60 * 1000,
      ),
    },
  },

  // ===== Pagination Defaults =====
  pagination: {
    defaultLimit: parseNumber(process.env.DEFAULT_PAGE_LIMIT, 20),
    maxLimit: parseNumber(process.env.MAX_PAGE_LIMIT, 100),
  },

  // ===== Multi-Tenant Configuration =====
  multiTenant: {
    enabled: parseBoolean(process.env.MULTI_TENANT_ENABLED, true),
  },

  // ===== Recording & Transcription =====
  recording: {
    enabled: parseBoolean(process.env.RECORDING_ENABLED, false),
    providerKey: optional("RECORDING_PROVIDER", "livekit"),
  },

  transcription: {
    enabled: parseBoolean(process.env.TRANSCRIPTION_ENABLED, false),
    provider: optional("TRANSCRIPTION_PROVIDER", "deepgram"),
    apiKey: optional("TRANSCRIPTION_API_KEY", ""),
  },

  // ===== AI Configuration =====
  ai: {
    enabled: parseBoolean(process.env.AI_ENABLED, false),
    provider: optional("AI_PROVIDER", "openai"),
    apiKey: optional("AI_API_KEY", ""),
    model: optional("AI_MODEL", "gpt-4-turbo"),
  },

  // ===== Object Storage =====
  storage: {
    enabled: parseBoolean(process.env.STORAGE_ENABLED, false),
    provider: optional("STORAGE_PROVIDER", "s3"),
    endpoint: optional("STORAGE_ENDPOINT", ""),
    accessKey: optional("STORAGE_ACCESS_KEY", ""),
    secretKey: optional("STORAGE_SECRET_KEY", ""),
    bucket: optional("STORAGE_BUCKET", "meetrix"),
    region: optional("STORAGE_REGION", "us-east-1"),
  },

  // ===== Retention Policies =====
  retention: {
    recordingRetentionDays: parseNumber(process.env.RECORDING_RETENTION_DAYS, 90),
    transcriptRetentionDays: parseNumber(process.env.TRANSCRIPT_RETENTION_DAYS, 90),
    auditLogRetentionDays: parseNumber(process.env.AUDIT_LOG_RETENTION_DAYS, 365),
  },
} as const;

/**
 * Validate critical configuration at startup.
 * Call this once during application initialization.
 */
export function validateEnv(): void {
  const errors: string[] = [];

  // Production checks
  if (env.isProd) {
    if (env.jwt.accessSecret === "dev-access-secret-change-me") {
      errors.push("JWT_ACCESS_SECRET must be set to a secure value in production");
    }
    if (env.jwt.refreshSecret === "dev-refresh-secret-change-me") {
      errors.push("JWT_REFRESH_SECRET must be set to a secure value in production");
    }
    if (!env.mail.smtpUrl) {
      errors.push("SMTP_URL must be configured for production email sending");
    }
  }

  // Feature validation
  if (env.recording.enabled && !env.recording.providerKey) {
    errors.push("RECORDING_PROVIDER must be set when recording is enabled");
  }
  if (env.transcription.enabled && !env.transcription.apiKey) {
    errors.push("TRANSCRIPTION_API_KEY must be set when transcription is enabled");
  }
  if (env.ai.enabled && !env.ai.apiKey) {
    errors.push("AI_API_KEY must be set when AI is enabled");
  }
  if (env.storage.enabled && !env.storage.endpoint) {
    errors.push("STORAGE_ENDPOINT must be set when storage is enabled");
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`,
    );
  }
}