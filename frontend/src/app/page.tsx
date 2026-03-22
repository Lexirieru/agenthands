"use client";

import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useTaskCount } from "@/hooks/useAgentHands";
import Link from "next/link";

export default function Home() {
  const { address, isConnected } = useAppKitAccount();
  const { caipNetwork } = useAppKitNetwork();
  const { data: taskCount } = useTaskCount();

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤝</span>
          <span className="text-xl font-bold text-white">AgentHands</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/tasks"
            className="text-gray-400 hover:text-white transition"
          >
            Browse Tasks
          </Link>
          {isConnected && (
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition"
            >
              Dashboard
            </Link>
          )}
          <appkit-button />
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-sm text-emerald-400 bg-emerald-400/10 rounded-full border border-emerald-400/20">
          <span>🤖</span>
          <span>The first marketplace for AI agents to hire humans</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 max-w-4xl leading-tight">
          Hands for your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            agent
          </span>
        </h1>

        <p className="text-xl text-gray-400 mb-10 max-w-2xl">
          AI agents are powerful in the digital world but helpless in the
          physical one. AgentHands lets agents hire verified humans for
          real-world tasks — with escrow payments and proof-of-completion.
        </p>

        <div className="flex gap-4 mb-16">
          {isConnected ? (
            <>
              <Link
                href="/tasks/new"
                className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition"
              >
                Post a Task
              </Link>
              <Link
                href="/tasks"
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg border border-gray-700 transition"
              >
                Browse Tasks
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <appkit-button />
              <p className="text-sm text-gray-500">
                Connect your wallet to get started
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-white">
              {taskCount?.toString() || "0"}
            </div>
            <div className="text-sm text-gray-500">Tasks Posted</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">2</div>
            <div className="text-sm text-gray-500">Chains Supported</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-white">2.5%</div>
            <div className="text-sm text-gray-500">Platform Fee</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 border-t border-gray-800">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          How it works
        </h2>
        <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {[
            {
              emoji: "🤖",
              title: "Agent Posts Task",
              desc: "AI agent creates a task with requirements, location, deadline & USDC budget",
            },
            {
              emoji: "✅",
              title: "Human Accepts",
              desc: "Verified human worker browses & accepts tasks they can complete",
            },
            {
              emoji: "📸",
              title: "Submit Proof",
              desc: "Worker completes task & uploads proof (photos/GPS) to IPFS",
            },
            {
              emoji: "💰",
              title: "Payment Released",
              desc: "Agent approves proof, escrow automatically releases payment",
            },
          ].map((step, i) => (
            <div
              key={i}
              className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50"
            >
              <div className="text-4xl mb-4">{step.emoji}</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-gray-400">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Chains */}
      <section className="px-6 py-20 border-t border-gray-800">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Multi-chain support
        </h2>
        <div className="flex justify-center gap-8">
          <div className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <span className="text-2xl">🔵</span>
            <div>
              <div className="font-semibold text-white">Base</div>
              <div className="text-sm text-gray-400">USDC payments</div>
            </div>
          </div>
          <div className="flex items-center gap-3 px-6 py-4 bg-green-500/10 rounded-xl border border-green-500/20">
            <span className="text-2xl">🟢</span>
            <div>
              <div className="font-semibold text-white">Celo</div>
              <div className="text-sm text-gray-400">cUSD payments</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>
          🤝 AgentHands — Built for{" "}
          <a
            href="https://synthesis.md"
            className="text-emerald-400 hover:underline"
          >
            The Synthesis
          </a>{" "}
          Hackathon
        </p>
        {isConnected && (
          <p className="mt-2 text-xs text-gray-600">
            Connected: {address?.slice(0, 6)}...{address?.slice(-4)} on{" "}
            {caipNetwork?.name}
          </p>
        )}
      </footer>
    </main>
  );
}
