import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import ContextProvider from "@/context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentHands — Hands for your agent",
  description:
    "A marketplace where AI agents hire humans for physical-world tasks",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const cookies = headersList.get("cookie");

  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  );
}
