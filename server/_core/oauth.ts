import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Check for a pending audit claim (guest token stored in cookie)
      const guestToken = req.cookies?.sitee_guest_token;
      if (guestToken) {
        try {
          const user = await db.getUserByOpenId(userInfo.openId);
          if (user) {
            // Find the most recent unclaimed audit with this guest token
            const { getDb } = await import("../db");
            const { audits } = await import("../../drizzle/schema");
            const { eq, and, isNull } = await import("drizzle-orm");
            const dbConn = await getDb();
            if (dbConn) {
              const pending = await dbConn.select({ id: audits.id })
                .from(audits)
                .where(and(eq(audits.guestToken, guestToken), isNull(audits.userId)))
                .limit(1);
              if (pending.length > 0) {
                await db.claimAudit(pending[0].id, user.id);
                // Clear the guest token cookie
                res.clearCookie("sitee_guest_token");
                // Redirect to the claimed audit's full results
                res.redirect(302, `/audit/${pending[0].id}`);
                return;
              }
            }
          }
        } catch (claimErr) {
          console.warn("[OAuth] Failed to claim guest audit:", claimErr);
        }
      }

      // Default: redirect to user hub
      res.redirect(302, "/hub");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
