"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider } from "wagmi";
import { config } from "@/config";
import { useAutoConnect } from "@/hooks/useAutoConnect";

const queryClient = new QueryClient();

function AutoConnect({ children }: { children: ReactNode }) {
  useAutoConnect();
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
        <AutoConnect>{children}</AutoConnect>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
