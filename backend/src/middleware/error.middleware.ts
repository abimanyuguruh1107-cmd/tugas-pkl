import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { AppError, ApiError } from "../lib/errors";
import { logger } from "../lib/logger";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  if (err instanceof AppError) {
    const details = err instanceof ApiError ? err.details : undefined;
    const responseError = {
      code: err.code,
      message: err.message,
      ...(details !== undefined ? { details } : {}),
    };
    if (err.statusCode >= 500) {
      logger.error(`Application error on ${req.method} ${req.path}:`, err);
    } else {
      logger.warn(`Request error on ${req.method} ${req.path}:`, err.message);
    }
    res.status(err.statusCode).json({ error: responseError });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn(`Request validation failed on ${req.method} ${req.path}`);
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    logger.warn(`Database validation failed on ${req.method} ${req.path}`);
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: Object.values(err.errors).map((e) => ({
          path: e.path,
          message: e.message,
        })),
      },
    });
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    logger.warn(`Invalid database value for ${err.path}`);
    res.status(400).json({
      error: {
        code: "INVALID_VALUE",
        message: `Invalid value for ${err.path}`,
      },
    });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === 11000
  ) {
    logger.warn(`Duplicate database value on ${req.method} ${req.path}`);
    res.status(409).json({
      error: {
        code: "DUPLICATE_KEY",
        message: "A record with that value already exists",
      },
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error(`Unhandled error on ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.isProd ? "Internal server error" : message,
      ...(!env.isProd && err instanceof Error && err.stack
        ? { stack: err.stack }
        : {}),
    },
  });
}
