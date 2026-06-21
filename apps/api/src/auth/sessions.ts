import { createHash, randomBytes } from "node:crypto";
import type { Response } from "express";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";

const sessionDays = 7;

export function hashToken(token: string) {
  return createHash("sha256").update(`${env.SESSION_SECRET}:${token}`).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt
    }
  });
  return { token, expiresAt };
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/"
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });
}

export async function revokeSession(token: string | undefined) {
  if (!token) return;
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() }
  });
}
