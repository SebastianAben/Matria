import { Router } from "express";
import { z } from "zod";
import { writeAudit } from "../audit.js";
import { prisma } from "../db/prisma.js";
import { unauthenticated } from "../http/errors.js";
import { sendOk } from "../http/responses.js";
import { requireAuth } from "./middleware.js";
import { verifyPassword } from "./passwords.js";
import { clearSessionCookie, createSession, revokeSession, setSessionCookie } from "./sessions.js";
import { env } from "../config/env.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() }
    });

    if (
      !user ||
      user.status !== "active" ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      await writeAudit({
        actorId: user?.id,
        action: "auth.login",
        targetType: "user",
        targetId: user?.id ?? input.email.toLowerCase(),
        outcome: "failure",
        requestId: req.requestId
      });
      throw unauthenticated();
    }

    const session = await createSession(user.id);
    setSessionCookie(res, session.token, session.expiresAt);
    await writeAudit({
      actorId: user.id,
      action: "auth.login",
      targetType: "user",
      targetId: user.id,
      outcome: "success",
      requestId: req.requestId
    });

    return sendOk(req, res, { user: { id: user.id, email: user.email, fullName: user.fullName } });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[env.SESSION_COOKIE_NAME] as string | undefined;
    await revokeSession(token);
    clearSessionCookie(res);
    await writeAudit({
      actorId: req.currentUser?.id,
      action: "auth.logout",
      targetType: "session",
      outcome: "success",
      requestId: req.requestId
    });
    return sendOk(req, res, { loggedOut: true });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/session", requireAuth, (req, res) => {
  return sendOk(req, res, {
    user: req.currentUser
      ? {
          id: req.currentUser.id,
          email: req.currentUser.email,
          fullName: req.currentUser.fullName,
          permissions: [...req.currentUser.permissions].sort()
        }
      : null
  });
});
