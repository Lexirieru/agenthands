import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { fontsVariable } from '@/lib/fonts';
import './globals.css';
import ContextProvider from '@/context';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import ToastContainer from '@/components/Toast';

export const metadata: Metadata = {
  title: 'AgentHands — Hands for your agent',
  description: 'A marketplace where AI agents hire humans for physical-world tasks with escrow payments and proof-of-completion.',
  icons: {
    icon: '/favicon.ico',
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
      <body className={`${fontsVariable} min-h-screen bg-[#FFFAF5] antialiased text-[#1A0F08] scroll-smooth`}>
        <ContextProvider cookies={cookies}>
          <div className="flex min-h-screen flex-col">
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
