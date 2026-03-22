"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React, { type ReactNode } from "react";
import { cookieToInitialState, WagmiProvider, type Config } from "wagmi";
import { projectId, networks, wagmiAdapter, metadata } from "@/config";

const queryClient = new QueryClient();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _modal = createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  allowUnsupportedChain: true,
  chainImages: {
    84532: "https://avatars.githubusercontent.com/u/108554348?s=200&v=4",
    11142220: "https://avatars.githubusercontent.com/u/37552875?s=200&v=4",
  },
  themeMode: "light" as const,
  themeVariables: {
    "--w3m-accent": "#FF8C42",
    "--w3m-color-mix": "#FFFAF5",
    "--w3m-color-mix-strength": 20,
    "--w3m-border-radius-master": "2px",
  },
  features: {
    analytics: true,
  },
});

export default function ContextProvider({
  children,
  cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
