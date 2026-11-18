import { afterEach, describe, expect, test } from "bun:test";
import type { Request, Response } from "express";
import {
  configureLiveKitWebhookVerifier,
  receiveLiveKitWebhook,
} from "../src/controllers/webhooks.controller";

describe("LiveKit webhook verification", () => {
  afterEach(() => configureLiveKitWebhookVerifier({
    receive: () => {
      throw new Error("Unconfigured webhook test verifier");
    },
  }));

  test("verifies the raw body and acknowledges an unrelated room", async () => {
    let received: { body: string; authorization: string } | undefined;
    configureLiveKitWebhookVerifier({
      receive(body, authorization) {
        received = { body, authorization };
        return { event: "room_started", room: { name: "unrelated-room" } };
      },
    });

    const response = {
      statusCode: 0,
      ended: false,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      end() {
        this.ended = true;
        return this;
      },
    };
    const request = {
      rawBody: Buffer.from('{"event":"room_started"}'),
      get: (name: string) => (name === "Authorization" ? "signed-token" : undefined),
    };

    await receiveLiveKitWebhook(
      request as unknown as Request,
      response as unknown as Response,
    );

    expect(received).toEqual({
      body: '{"event":"room_started"}',
      authorization: "signed-token",
    });
    expect(response.statusCode).toBe(204);
    expect(response.ended).toBe(true);
  });

  test("rejects a signature that fails verification", async () => {
    configureLiveKitWebhookVerifier({
      receive() {
        throw new Error("invalid signature");
      },
    });
    const request = {
      rawBody: Buffer.from("{}"),
      get: () => "invalid",
    };

    await expect(
      receiveLiveKitWebhook(
        request as unknown as Request,
        {} as Response,
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});
