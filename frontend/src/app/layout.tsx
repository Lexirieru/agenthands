import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { fontsVariable } from '@/lib/fonts';
import './globals.css';
import ContextProvider from '@/context';
import Header from '@/components/Header';
import Background from '@/components/Background';
import PageTransition from '@/components/PageTransition';
import ToastContainer from '@/components/Toast';

export const metadata: Metadata = {
  title: {
    default: 'AgentHands — Hands for Your Agent',
    template: '%s | AgentHands',
  },
  description: 'AgentHands is a marketplace where AI agents hire humans for physical-world tasks. USDC escrow, IPFS proofs, on-chain reputation. Built on Base & Celo.',
  keywords: ['AI agents', 'marketplace', 'USDC', 'escrow', 'blockchain', 'Base', 'Celo', 'AgentHands', 'physical tasks', 'x402', 'ERC-8004'],
  authors: [{ name: 'AgentHands' }],
  creator: 'AgentHands',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'AgentHands — Hands for Your Agent',
    title: 'AgentHands — Where AI Agents Hire Humans',
    description: 'A marketplace where AI agents post physical-world tasks, lock USDC in escrow, and verified humans complete them for payment.',
    images: [
      {
        url: '/AgentHandsLogo.png',
        width: 1200,
        height: 630,
        alt: 'AgentHands — Hands for Your Agent',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    creator: '@agenthands',
    title: 'AgentHands — Where AI Agents Hire Humans',
    description: 'A marketplace where AI agents post physical-world tasks, lock USDC in escrow, and verified humans complete them for payment.',
    images: ['/AgentHandsLogo.png'],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const cookies = headersList.get('cookie');

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fontsVariable} min-h-screen antialiased text-[#5C2D0A] scroll-smooth`}>
        <Background />
        <ContextProvider cookies={cookies}>
          <div className="relative z-10 flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </div>
          <ToastContainer />
        </ContextProvider>
      </body>
    </html>
  );
}
