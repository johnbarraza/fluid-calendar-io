"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider
      refetchInterval={5 * 60} // Refetch every 5 minutes instead of constantly
      refetchOnWindowFocus={false} // Don't refetch on window focus
    >
      {children}
    </NextAuthSessionProvider>
  );
}
