import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import {
  errorHandler,
  notFoundHandler,
} from "../src/middleware/error.middleware";
import { AppError } from "../src/lib/errors";
import { logger } from "../src/lib/logger";

describe("error middleware", () => {
  const app = express();
  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;

  app.get("/app-error", () => {
    throw new AppError(422, "INVALID_INPUT", "Invalid input");
  });
  app.get("/zod-error", () => {
    z.object({ name: z.string() }).parse({ name: 1 });
  });
  app.get("/validation-error", () => {
    const error = new mongoose.Error.ValidationError();
    error.addError(
      "name",
      new mongoose.Error.ValidatorError({
        path: "name",
        message: "Name is required",
      }),
    );
    throw error;
  });
  app.get("/cast-error", () => {
    throw new mongoose.Error.CastError("ObjectId", "not-an-id", "_id");
  });
  app.get("/duplicate-error", () => {
    throw Object.assign(new Error("duplicate"), { code: 11000 });
  });
  app.use(notFoundHandler);
  app.use(errorHandler);

  beforeAll(async () => {
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not determine test server address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  test("normalizes AppError, Zod, Mongoose, duplicate-key, and 404 responses", async () => {
    const appErrorResponse = await fetch(`${baseUrl}/app-error`);
    expect(appErrorResponse.status).toBe(422);
    expect(await appErrorResponse.json()).toEqual({
      error: { code: "INVALID_INPUT", message: "Invalid input" },
    });

    const zodResponse = await fetch(`${baseUrl}/zod-error`);
    expect(zodResponse.status).toBe(400);
    expect(await zodResponse.json()).toMatchObject({
      error: { code: "VALIDATION_ERROR", message: "Validation failed" },
    });

    const validationResponse = await fetch(`${baseUrl}/validation-error`);
    expect(validationResponse.status).toBe(400);
    expect(await validationResponse.json()).toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [{ path: "name", message: "Name is required" }],
      },
    });

    const castResponse = await fetch(`${baseUrl}/cast-error`);
    expect(castResponse.status).toBe(400);
    expect(await castResponse.json()).toEqual({
      error: { code: "INVALID_VALUE", message: "Invalid value for _id" },
    });

    const duplicateResponse = await fetch(`${baseUrl}/duplicate-error`);
    expect(duplicateResponse.status).toBe(409);
    expect(await duplicateResponse.json()).toEqual({
      error: {
        code: "DUPLICATE_KEY",
        message: "A record with that value already exists",
      },
    });

    const notFoundResponse = await fetch(`${baseUrl}/missing`);
    expect(notFoundResponse.status).toBe(404);
    expect(await notFoundResponse.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  test("redacts only sensitive values and JWTs in logs", () => {
    const consoleSpy = spyOn(console, "error");
    try {
      logger.error(
        {
          password: "hidden-password",
          token: "hidden-token",
          secret: "hidden-secret",
          authorization: "hidden-authorization",
          cookie: "hidden-cookie",
          apiKey: "hidden-api-key",
          ip: "127.0.0.1",
          package: "mongoose@8.x.x",
          count: 12345,
        },
        "password=hidden-string-password, token=hidden-string-token, " +
          "IP 127.0.0.1, package mongoose@8.x.x, count 12345, " +
          "JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature123",
      );
      const output = JSON.stringify(consoleSpy.mock.calls);
      expect(output).not.toContain("hidden-password");
      expect(output).not.toContain("hidden-token");
      expect(output).not.toContain("hidden-secret");
      expect(output).not.toContain("hidden-authorization");
      expect(output).not.toContain("hidden-cookie");
      expect(output).not.toContain("hidden-api-key");
      expect(output).not.toContain("hidden-string-password");
      expect(output).not.toContain("hidden-string-token");
      expect(output).toContain("127.0.0.1");
      expect(output).toContain("mongoose@8.x.x");
      expect(output).toContain("12345");
      expect(output).toContain("[REDACTED]");
      expect(output).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
