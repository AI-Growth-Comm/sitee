export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Legacy shim — sign-in is now handled by Clerk modal via useAuth().openSignIn()
export const getLoginUrl = () => "#";
