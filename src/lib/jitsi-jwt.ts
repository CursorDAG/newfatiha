import jwt from "jsonwebtoken";
import { logger } from "./logger";

/**
 * Jitsi JWT configuration
 */
interface JitsiConfig {
  domain: string;
  appId: string;
  secret: string;
}

/**
 * User context for Jitsi JWT
 */
interface JitsiUserContext {
  id: string;
  name: string;
  email: string;
  role: "moderator" | "participant";
}

/**
 * Generate a JWT token for Jitsi Meet
 *
 * @param roomName - The Jitsi room name (typically stream.id)
 * @param user - User information to embed in the token
 * @param config - Jitsi configuration (domain, appId, secret)
 * @returns Signed JWT token
 */
export function generateJitsiToken(
  roomName: string,
  user: JitsiUserContext,
  config: JitsiConfig
): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24; // Token valid for 24 hours

  const payload = {
    // Standard JWT claims
    iss: config.appId,
    aud: "jitsi",
    sub: config.domain,
    exp,
    nbf: now,

    // Jitsi-specific claims
    room: roomName,
    context: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        moderator: user.role === "moderator",
      },
      features: {
        livestreaming: user.role === "moderator",
        recording: user.role === "moderator",
        transcription: false,
      },
    },
  };

  try {
    const token = jwt.sign(payload, config.secret, {
      algorithm: "HS256",
    });

    logger.debug({
      msg: "Generated Jitsi JWT token",
      roomName,
      userId: user.id,
      role: user.role,
    });

    return token;
  } catch (error) {
    logger.error({
      msg: "Failed to generate Jitsi JWT token",
      error,
      roomName,
      userId: user.id,
    });
    throw new Error("Failed to generate Jitsi token");
  }
}

/**
 * Get Jitsi configuration from environment variables
 * Returns null if Jitsi JWT is not configured (falls back to public Jitsi)
 */
export function getJitsiConfig(): JitsiConfig | null {
  const domain = process.env.JITSI_DOMAIN;
  const appId = process.env.JITSI_JWT_APP_ID;
  const secret = process.env.JITSI_JWT_SECRET;

  // If any of the required variables are missing, return null
  // This allows the app to fall back to public meet.jit.si
  if (!domain || !appId || !secret) {
    return null;
  }

  return { domain, appId, secret };
}

/**
 * Check if Jitsi JWT authentication is enabled
 */
export function isJitsiJwtEnabled(): boolean {
  return getJitsiConfig() !== null;
}
