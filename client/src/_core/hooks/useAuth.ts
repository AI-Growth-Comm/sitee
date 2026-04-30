import { useUser, useClerk } from "@clerk/clerk-react";
import { trpc } from "@/lib/trpc";

export function useAuth() {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut, openSignIn } = useClerk();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isSignedIn === true,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: meQuery.data ?? null,
    loading: !isLoaded || (isSignedIn === true && meQuery.isLoading),
    isAuthenticated: isSignedIn === true,
    logout: () => signOut(),
    openSignIn: () => openSignIn(),
    refresh: () => meQuery.refetch(),
  };
}
