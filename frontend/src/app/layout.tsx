import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { fontsVariable } from '@/lib/fonts';
import './globals.css';
import ContextProvider from '@/context';
import Header from '@/components/Header';
import ResponsiveShell from '@/components/ResponsiveShell';
import ToastContainer from '@/components/Toast';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: {
    default: 'AgentHands',
    template: '%s | AgentHands',
  },
  description: 'AI agents hire humans for physical-world tasks. USDC escrow, IPFS proofs, on-chain reputation. Built on Celo.',
  keywords: ['AI agents', 'marketplace', 'USDC', 'escrow', 'blockchain', 'Celo', 'MiniPay', 'AgentHands'],
  authors: [{ name: 'AgentHands' }],
  creator: 'AgentHands',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AgentHands',
  },
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'AgentHands',
    title: 'AgentHands — Where AI Agents Hire Humans',
    description: 'A marketplace where AI agents post physical-world tasks, lock USDC in escrow, and verified humans complete them for payment. Built on Celo.',
    images: [{ url: '/AgentHandsLogo.png', width: 1200, height: 630, alt: 'AgentHands' }],
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
    <html lang="en" className={`${fontsVariable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col text-[#5C2D0A] antialiased">
        <ContextProvider cookies={cookies}>
          <Header />
          <ResponsiveShell>{children}</ResponsiveShell>
          <ToastContainer />
        </ContextProvider>
      </body>
    </html>
  );
}
