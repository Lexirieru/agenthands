"use client";

import Link from "next/link";
import { useAppKitAccount } from "@reown/appkit/react";

export default function Navbar() {
  const { isConnected } = useAppKitAccount();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-2xl">🤝</span>
        <span className="text-xl font-bold text-white">AgentHands</span>
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/tasks"
          className="text-gray-400 hover:text-white transition text-sm"
        >
          Browse Tasks
        </Link>
        {isConnected && (
          <>
            <Link
              href="/tasks/new"
              className="text-gray-400 hover:text-white transition text-sm"
            >
              Post Task
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition text-sm"
            >
              Dashboard
            </Link>
          </>
        )}
        <appkit-button />
      </div>
    </nav>
  );
}
