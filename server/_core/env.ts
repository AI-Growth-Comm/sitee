export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  isProduction: process.env.NODE_ENV === "production",
};
