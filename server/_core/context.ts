import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { getAuth } from "@clerk/express";
import { getUserByOpenId, upsertUser } from "../db";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const { userId } = getAuth(opts.req);
    if (userId) {
      user = await getUserByOpenId(userId) ?? null;
      if (!user) {
        await upsertUser({ openId: userId, lastSignedIn: new Date() });
        user = await getUserByOpenId(userId) ?? null;
      }
    }
  } catch {
    user = null;
  }
  return { req: opts.req, res: opts.res, user };
}
