"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { config } from "@/config";
import { useAutoConnect } from "@/hooks/useAutoConnect";
import { useTaskEventWatcher } from "@/hooks/useTaskEventWatcher";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 4000,
      retry: 2,
    },
  },
});

function AppBoot({ children }: { children: ReactNode }) {
  useAutoConnect();
  useTaskEventWatcher();
  return <>{children}</>;
}

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
