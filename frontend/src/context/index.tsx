"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { config } from "@/config";
import { useAutoConnect } from "@/hooks/useAutoConnect";
import { useTaskEventWatcher } from "@/hooks/useTaskEventWatcher";

/**
 * Shared TanStack Query client for the AgentHands frontend on Celo mainnet.
 *
 * `staleTime: 4_000` ms — all task data is considered fresh for 4 s, matching the
 * 8 s refetch interval used in `useTasks` and `useAgentHands` hooks. This means
 * back-to-back navigations within 4 s reuse the cached Celo RPC response rather
 * than firing a redundant multicall. `retry: 2` handles transient Forno outages
 * without hammering the RPC with excessive retries.
 */
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
 *
 * @since 1.0.0
 * @see useAutoConnect — injected wallet auto-connect for Celo MiniPay
 * @see useTaskEventWatcher — live Celo contract event subscription
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
 *
 * @since 1.0.0
 */
export default function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  /** Serialised wagmi cookie from `headers()` — passed from the Next.js Server Component layout. */
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
