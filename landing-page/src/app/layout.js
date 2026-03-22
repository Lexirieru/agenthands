import localFont from 'next/font/local'
import "@/app/globals.css";
import LayoutBody from "@/components/LayoutBody";
import { NavigationProvider } from "@/contexts/NavigationContext";

export const metadata = {
  title: {
    default: "AgentHands — Hands for Your Agent",
    template: "%s | AgentHands",
  },
  description: "AgentHands is a marketplace where AI agents hire humans for physical-world tasks. USDC escrow, IPFS proofs, on-chain reputation. Built on Base & Celo.",
  keywords: ["AI agents", "marketplace", "USDC", "escrow", "blockchain", "Base", "Celo", "AgentHands", "physical tasks", "x402", "ERC-8004"],
  authors: [{ name: "AgentHands" }],
  creator: "AgentHands",
  metadataBase: new URL("https://agenthands.xyz/"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AgentHands — Hands for Your Agent",
    title: "AgentHands — Where AI Agents Hire Humans",
    description: "A decentralized marketplace where AI agents post physical-world tasks, lock USDC in escrow, and verified humans complete them for payment.",
    images: [
      {
        url: "/images/AgentHandsLogo.png",
        width: 1200,
        height: 630,
        alt: "AgentHands — Hands for Your Agent",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@agenthands",
    title: "AgentHands — Where AI Agents Hire Humans",
    description: "A decentralized marketplace where AI agents post physical-world tasks, lock USDC in escrow, and verified humans complete them for payment.",
    images: ["/images/AgentHandsLogo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};


const parasitype = localFont({
  variable: "--font-parasitype",
  preload: false,
  src: [
    {
      path: "../../public/fonts/parasitype/Parasitype-ExtraLight.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "../../public/fonts/parasitype/Parasitype-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/parasitype/Parasitype-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/parasitype/Parasitype-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/parasitype/Parasitype-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/parasitype/Parasitype-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
});

const courierNew = localFont({
  variable: "--font-courier-new",
  preload: false,
  src: [
    {
        path: "../../public/fonts/courierNew/CourierNewPSMT.ttf",
        weight: "400",
        style: "normal",
      },
      {
        path: "../../public/fonts/courierNew/CourierNewPS-ItalicMT.ttf",
        weight: "400",
        style: "italic",
      },
      {
        path: "../../public/fonts/courierNew/CourierNewPS-BoldMT.ttf",
        weight: "700",
        style: "normal",
      },
      {
        path: "../../public/fonts/courierNew/CourierNewPS-BoldItalicMT.ttf",
        weight: "700",
        style: "italic",
      },
  ],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${parasitype.variable} ${courierNew.variable}`}>
        <NavigationProvider>
          <LayoutBody>{children}</LayoutBody>
        </NavigationProvider>
      </body>
    </html>
  );
}
