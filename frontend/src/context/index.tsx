"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { config } from "@/config";
import { useAutoConnect } from "@/hooks/useAutoConnect";
import { useTaskEventWatcher } from "@/hooks/useTaskEventWatcher";

/** Shared TanStack Query client — staleTime of 4 s balances freshness with RPC cost on Celo. */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 4000,
      retry: 2,
    },
  },
});

/**
 * Inner component that runs global side-effect hooks once the Wagmi and
 * Query providers are in scope: auto-connects injected wallets (MiniPay/Valora)
 * and starts the AgentHands event watcher.
 */
function AppBoot({ children }: { children: ReactNode }) {
  useAutoConnect();
  useTaskEventWatcher();
  return <>{children}</>;
}

/**
 * Root provider that wraps the Next.js app with Wagmi (Celo mainnet) and
 * TanStack Query. Accepts SSR cookies so wagmi can rehydrate wallet state
 * on the server without a hydration mismatch.
 */
export default function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(config, cookies);

  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <AppBoot>{children}</AppBoot>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
