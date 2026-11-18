import { AccessToken } from "livekit-server-sdk";
import { env } from "../config/env";

export interface MediaTokenInput {
  roomName: string;
  identity: string;
  name?: string;
}

export async function createMediaToken({
  roomName,
  identity,
  name,
  ttlSeconds = env.livekit.tokenTtlSeconds,
}: MediaTokenInput & { ttlSeconds?: number }): Promise<string> {
  const normalizedRoomName = roomName.trim();
  const normalizedIdentity = identity.trim();
  if (!normalizedRoomName || !normalizedIdentity) {
    throw new TypeError("Room name and participant identity are required");
  }

  if (!env.livekit.apiKey || !env.livekit.apiSecret) {
    throw new Error("LiveKit API credentials are not configured");
  }

  const displayName = name?.trim();
  const token = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity: normalizedIdentity,
    ttl: Math.min(900, Math.max(60, ttlSeconds)),
    ...(displayName ? { name: displayName } : {}),
  });
  token.addGrant({
    roomJoin: true,
    room: normalizedRoomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}
