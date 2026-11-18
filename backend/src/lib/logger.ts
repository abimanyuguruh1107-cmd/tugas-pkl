/** Simple structured logger (swap for pino/winston if needed). */
type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel = process.env.LOG_LEVEL?.toLowerCase() as
  LogLevel | undefined;
const minimumLevel =
  configuredLevel && configuredLevel in levels ? levels[configuredLevel] : 20;
const sensitiveKey = /^(password|token|secret|authorization|cookie|apiKey)$/i;

function redactString(value: string): string {
  return value
    .replace(
      /\b(password|token|secret|authorization|cookie|apiKey)\b(\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^,;\r\n]+)/gi,
      "$1$2[REDACTED]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[REDACTED]",
    );
}

function sanitize(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      ...(value.stack ? { stack: redactString(value.stack) } : {}),
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, seen));
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : sanitize(item, seen),
    ]),
  );
}

function log(kind: LogLevel, args: unknown[]): void {
  if (levels[kind] < minimumLevel) return;

  const ts = new Date().toISOString();
  const method = kind === "debug" ? "log" : kind;
  console[method](
    `[${ts}] [${kind.toUpperCase()}]`,
    ...args.map((arg) => sanitize(arg)),
  );
}

export const logger = {
  info: (...args: unknown[]) => log("info", args),
  warn: (...args: unknown[]) => log("warn", args),
  error: (...args: unknown[]) => log("error", args),
  debug: (...args: unknown[]) => {
    log("debug", args);
  },
};
