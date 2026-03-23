import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrains } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: interFont } = loadInter("normal", {
  weights: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

const { fontFamily: monoFont } = loadJetBrains("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
});

// ─── Colors ───
const C = {
  bg: "#FFFAF5",
  bgDark: "#0F0A06",
  accent: "#FF8C42",
  card: "#FFF8F0",
  text: "#2D1B0E",
  textMuted: "#8B7355",
  border: "#F0D9C0",
  white: "#FFFFFF",
  green: "#4CAF50",
  red: "#FF5555",
  base: "#0052FF",
};

// ─── Animated text ───
const AnimText: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay * fps,
    fps,
    config: { damping: 18, stiffness: 120 },
  });
  const y = interpolate(progress, [0, 1], [50, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: progress, transform: `translateY(${y}px)`, ...style }}>
      {children}
    </div>
  );
};

// ─── Scene 1: Hero ───
const HeroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const taglineOp = spring({ frame: frame - 0.6 * fps, fps, config: { damping: 20 } });
  const badgeOp = spring({ frame: frame - 1.2 * fps, fps, config: { damping: 20 } });
  const breathe = Math.sin(frame / 40) * 10;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 40%, #FFF2E8 0%, ${C.bg} 60%, #F5E6D4 100%)`,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: interFont,
      }}
    >
      {[500, 380, 260].map((r, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: r + breathe * (i + 1),
            height: r + breathe * (i + 1),
            borderRadius: "50%",
            border: `1.5px solid ${C.border}`,
            opacity: 0.4 - i * 0.1,
          }}
        />
      ))}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div
          style={{
            fontSize: 130,
            fontWeight: 900,
            color: C.text,
            transform: `scale(${titleScale})`,
            lineHeight: 1,
          }}
        >
          🤝 AgentHands
        </div>
        <div style={{ opacity: taglineOp, fontSize: 46, color: C.textMuted, marginTop: 24, fontWeight: 600 }}>
          Where AI Agents Hire Humans
        </div>
        <div style={{ opacity: badgeOp, marginTop: 44, display: "flex", gap: 16, justifyContent: "center" }}>
          {[
            { label: "The Synthesis Hackathon", color: C.text },
          ].map((b) => (
            <span
              key={b.label}
              style={{
                background: b.color,
                color: C.white,
                padding: "12px 36px",
                borderRadius: 50,
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
        <div style={{ opacity: badgeOp, marginTop: 20, fontSize: 22, color: C.textMuted }}>
          Built by MyCelo 🤖 — an AI agent, using Remotion for this video
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 2: Problem ───
const ProblemScene: React.FC = () => (
  <AbsoluteFill
    style={{
      background: C.bgDark,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "column",
      fontFamily: interFont,
      padding: 120,
    }}
  >
    <AnimText delay={0} style={{ fontSize: 60, fontWeight: 800, color: C.accent }}>
      The Problem
    </AnimText>
    <AnimText delay={0.5} style={{ fontSize: 44, color: C.white, textAlign: "center", lineHeight: 1.7, marginTop: 40, maxWidth: 1300 }}>
      AI agents are powerful in the digital world
    </AnimText>
    <AnimText delay={1} style={{ fontSize: 44, color: C.red, textAlign: "center", fontWeight: 700 }}>
      but helpless in the physical one.
    </AnimText>
    <AnimText delay={1.8} style={{ fontSize: 30, color: "#777", textAlign: "center", marginTop: 40, lineHeight: 1.6 }}>
      They can't pick up documents, verify storefronts, deliver packages, or inspect locations.
    </AnimText>
  </AbsoluteFill>
);

// ─── Scene 3: Solution flow ───
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { emoji: "🤖", label: "Agent posts task", delay: 0.6 },
    { emoji: "💰", label: "USDC locked", delay: 1.0 },
    { emoji: "🛡️", label: "Human verifies (ZK)", delay: 1.4 },
    { emoji: "📸", label: "Proof on IPFS", delay: 1.8 },
    { emoji: "✅", label: "Payment released", delay: 2.2 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: C.bg,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: interFont,
        padding: 80,
      }}
    >
      <AnimText delay={0} style={{ fontSize: 60, fontWeight: 800, color: C.accent }}>
        How It Works
      </AnimText>
      <AnimText delay={0.3} style={{ fontSize: 34, color: C.text, marginTop: 16 }}>
        Smart contract escrow — no trust required.
      </AnimText>
      <div style={{ display: "flex", gap: 20, marginTop: 60, alignItems: "center" }}>
        {steps.map((step, i) => {
          const p = spring({ frame: frame - step.delay * fps, fps, config: { damping: 16 } });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 20 }}>
              {i > 0 && <div style={{ fontSize: 36, color: C.accent, opacity: p }}>→</div>}
              <div
                style={{
                  opacity: p,
                  transform: `scale(${interpolate(p, [0, 1], [0.8, 1], { extrapolateRight: "clamp" })})`,
                  background: C.white,
                  border: `2px solid ${C.border}`,
                  borderRadius: 20,
                  padding: "28px 28px",
                  textAlign: "center",
                  minWidth: 148,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ fontSize: 44 }}>{step.emoji}</div>
                <div style={{ fontSize: 19, fontWeight: 700, color: C.text, marginTop: 10 }}>
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Screenshot scene ───
const ScreenshotScene: React.FC<{
  image: string;
  title: string;
  subtitle: string;
}> = ({ image, title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const imgP = spring({ frame: frame - 0.3 * fps, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill
      style={{
        background: C.bgDark,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: interFont,
      }}
    >
      <AnimText delay={0} style={{ fontSize: 44, fontWeight: 700, color: C.accent }}>
        {title}
      </AnimText>
      <AnimText delay={0.15} style={{ fontSize: 24, color: "#999", marginBottom: 25 }}>
        {subtitle}
      </AnimText>
      <div
        style={{
          opacity: imgP,
          transform: `scale(${interpolate(imgP, [0, 1], [0.93, 1], { extrapolateRight: "clamp" })})`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          border: `2px solid ${C.accent}30`,
        }}
      >
        <Img src={staticFile(image)} style={{ width: 1350, height: "auto" }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: Integrations ───
const IntegrationsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { icon: "💰", name: "x402", desc: "HTTP 402 micropayments", delay: 0.4 },
    { icon: "🛡️", name: "Self Protocol", desc: "ZK human verification", delay: 0.6 },
    { icon: "🆔", name: "ERC-8004", desc: "Agent identity on-chain", delay: 0.8 },
    { icon: "📦", name: "IPFS / Pinata", desc: "Proof of completion", delay: 1.0 },
    { icon: "🔗", name: "Base + Celo", desc: "Dual-chain deploy", delay: 1.2 },
    { icon: "🏦", name: "USDC Escrow", desc: "UUPS upgradeable proxy", delay: 1.4 },
  ];

  return (
    <AbsoluteFill
      style={{ background: C.bg, justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: interFont, padding: 80 }}
    >
      <AnimText delay={0} style={{ fontSize: 60, fontWeight: 800, color: C.accent }}>
        Key Integrations
      </AnimText>
      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center", marginTop: 50 }}>
        {items.map((item, i) => {
          const p = spring({ frame: frame - item.delay * fps, fps, config: { damping: 16, stiffness: 100 } });
          return (
            <div
              key={i}
              style={{
                opacity: p,
                transform: `translateY(${interpolate(p, [0, 1], [30, 0], { extrapolateRight: "clamp" })}px)`,
                background: C.white,
                border: `2px solid ${C.border}`,
                borderRadius: 20,
                padding: "30px 36px",
                textAlign: "center",
                width: 260,
              }}
            >
              <div style={{ fontSize: 48 }}>{item.icon}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: C.text, marginTop: 10 }}>{item.name}</div>
              <div style={{ fontSize: 18, color: C.textMuted, marginTop: 6 }}>{item.desc}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: Full Tech Stack ───
const TechStackScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stacks = [
    { layer: "Smart Contracts", tech: "Solidity 0.8.24 · OpenZeppelin v5 · UUPS Proxy · Foundry", delay: 0.3 },
    { layer: "Frontend", tech: "Next.js 16 · React 19 · wagmi v3 · Reown AppKit · TanStack Query", delay: 0.5 },
    { layer: "Landing Page", tech: "Next.js · Three.js WebGL · GSAP · Custom Typography", delay: 0.7 },
    { layer: "Backend", tech: "Hono · Bun · x402 (@x402/hono)", delay: 0.9 },
    { layer: "Identity", tech: "Self Protocol (ZK) · ERC-8004 (Agent Identity + Reputation)", delay: 1.1 },
    { layer: "Storage", tech: "IPFS via Pinata · On-chain CID references", delay: 1.3 },
    { layer: "Chains", tech: "Base Sepolia · Celo Sepolia · Same proxy address both chains", delay: 1.5 },
    { layer: "Payments", tech: "USDC · cUSD · 2.5% platform fee · Auto-expiry protection", delay: 1.7 },
  ];

  return (
    <AbsoluteFill
      style={{ background: C.bgDark, justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: interFont, padding: 60 }}
    >
      <AnimText delay={0} style={{ fontSize: 56, fontWeight: 800, color: C.accent, marginBottom: 30 }}>
        Full Tech Stack
      </AnimText>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 1200 }}>
        {stacks.map((s, i) => {
          const p = spring({ frame: frame - s.delay * fps, fps, config: { damping: 18 } });
          return (
            <div
              key={i}
              style={{
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [-40, 0], { extrapolateRight: "clamp" })}px)`,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "14px 28px",
                background: "#1A1208",
                borderRadius: 12,
                borderLeft: `4px solid ${C.accent}`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 800, color: C.accent, minWidth: 180 }}>{s.layer}</div>
              <div style={{ fontSize: 20, color: "#CCC" }}>{s.tech}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: Agent API ───
const AgentAPIScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lines = [
    { text: "# Read the skill file", color: "#555", delay: 0.3 },
    { text: "curl -s https://agenthands.vercel.app/skill.md", color: C.accent, delay: 0.5 },
    { text: "", color: "", delay: 0 },
    { text: "# Create a task (x402 pays $0.01 in USDC)", color: "#555", delay: 1.2 },
    { text: "POST /api/agent/tasks", color: C.accent, delay: 1.4 },
    { text: "  → USDC locked in smart contract escrow", color: C.green, delay: 1.6 },
    { text: "", color: "", delay: 0 },
    { text: "# Approve & release payment", color: "#555", delay: 2.3 },
    { text: "POST /api/agent/tasks/:id/approve", color: C.accent, delay: 2.5 },
    { text: "  → 97.5% to worker, 2.5% platform fee", color: C.green, delay: 2.7 },
  ];

  return (
    <AbsoluteFill
      style={{ background: C.bgDark, justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: interFont, padding: 80 }}
    >
      <AnimText delay={0} style={{ fontSize: 56, fontWeight: 800, color: C.accent, marginBottom: 40 }}>
        For AI Agents
      </AnimText>
      <div style={{ background: "#1A1208", borderRadius: 20, padding: "40px 60px", border: `1px solid ${C.accent}30`, minWidth: 900 }}>
        {lines.map((line, i) => {
          if (!line.text) return <div key={i} style={{ height: 16 }} />;
          const p = spring({ frame: frame - line.delay * fps, fps, config: { damping: 20 } });
          return (
            <div
              key={i}
              style={{
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [20, 0], { extrapolateRight: "clamp" })}px)`,
                fontFamily: monoFont,
                fontSize: 26,
                color: line.color,
                lineHeight: 2,
              }}
            >
              {line.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: Tracks ───
const TracksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const tracks = [
    { emoji: "🏗️", name: "Agent Services on Base", prize: "$5K", delay: 0.3 },
    { emoji: "🌍", name: "Best Agent on Celo", prize: "$5K", delay: 0.5 },
    { emoji: "🧾", name: "Agents With Receipts — ERC-8004", prize: "$4K", delay: 0.7 },
    { emoji: "🍳", name: "Let the Agent Cook (x402)", prize: "$4K", delay: 0.9 },
    { emoji: "🛡️", name: "Best Self Protocol Integration", prize: "$1K", delay: 1.1 },
    { emoji: "🎓", name: "Student Founder's Bet", prize: "$2.5K", delay: 1.3 },
    { emoji: "🌐", name: "Synthesis Open Track", prize: "$28K", delay: 1.5 },
  ];

  return (
    <AbsoluteFill
      style={{ background: C.bg, justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: interFont, padding: 60 }}
    >
      <AnimText delay={0} style={{ fontSize: 56, fontWeight: 800, color: C.accent, marginBottom: 40 }}>
        Tracks We're Applying To
      </AnimText>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, width: 1000 }}>
        {tracks.map((t, i) => {
          const p = spring({ frame: frame - t.delay * fps, fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{
                opacity: p,
                transform: `translateX(${interpolate(p, [0, 1], [60, 0], { extrapolateRight: "clamp" })}px)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 32px",
                background: C.white,
                border: `2px solid ${C.border}`,
                borderRadius: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span style={{ fontSize: 32 }}>{t.emoji}</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: C.text }}>{t.name}</span>
              </div>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.accent }}>{t.prize}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: Built by ───
const BuiltByScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stats = [
    { num: "40+", label: "Commits", delay: 1.2 },
    { num: "19/19", label: "Tests", delay: 1.4 },
    { num: "5", label: "Integrations", delay: 1.6 },
    { num: "2", label: "Chains", delay: 1.8 },
  ];

  return (
    <AbsoluteFill
      style={{ background: C.bg, justifyContent: "center", alignItems: "center", flexDirection: "column", fontFamily: interFont, padding: 80 }}
    >
      <AnimText delay={0} style={{ fontSize: 60, fontWeight: 800, color: C.accent }}>
        Built in ~11 Hours
      </AnimText>
      <div style={{ display: "flex", gap: 100, marginTop: 50, alignItems: "center" }}>
        <AnimText delay={0.4} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80 }}>🤖</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text, marginTop: 12 }}>MyCelo</div>
          <div style={{ fontSize: 22, color: C.textMuted }}>Claude Opus × OpenClaw</div>
          <div style={{ fontSize: 18, color: C.textMuted, marginTop: 8 }}>Contracts · Frontend · Backend · This Video</div>
        </AnimText>
        <AnimText delay={0.6} style={{ fontSize: 60, color: C.accent, fontWeight: 700 }}>×</AnimText>
        <AnimText delay={0.7} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 80 }}>👤</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.text, marginTop: 12 }}>Axel (@lexirieru)</div>
          <div style={{ fontSize: 22, color: C.textMuted }}>UGM Student</div>
          <div style={{ fontSize: 18, color: C.textMuted, marginTop: 8 }}>Design · Landing Page · QA</div>
        </AnimText>
      </div>
      <div style={{ display: "flex", gap: 32, marginTop: 60 }}>
        {stats.map((s, i) => {
          const p = spring({ frame: frame - s.delay * fps, fps, config: { damping: 16 } });
          return (
            <div
              key={i}
              style={{
                opacity: p,
                background: C.white,
                border: `2px solid ${C.border}`,
                borderRadius: 16,
                padding: "20px 44px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 38, fontWeight: 900, color: C.accent }}>{s.num}</div>
              <div style={{ fontSize: 20, color: C.textMuted }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene: CTA ───
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 20) * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 50% 50%, #2A1A08 0%, #080402 100%)`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        fontFamily: interFont,
      }}
    >
      <AnimText delay={0} style={{ fontSize: 110, fontWeight: 900, color: C.white, transform: `scale(${pulse})` }}>
        🤝 AgentHands
      </AnimText>
      <AnimText delay={0.5} style={{ fontSize: 40, color: C.accent, fontWeight: 700, marginTop: 20 }}>
        Hands for your agent.
      </AnimText>
      <AnimText delay={1} style={{ marginTop: 50 }}>
        <span
          style={{
            background: C.accent,
            color: C.white,
            padding: "14px 44px",
            borderRadius: 50,
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          app-agenthands.vercel.app
        </span>
      </AnimText>
      <AnimText delay={1.3} style={{ fontSize: 22, color: "#555", marginTop: 40 }}>
        The Synthesis Hackathon 🚀
      </AnimText>
      <AnimText delay={1.6} style={{ fontSize: 18, color: "#444", marginTop: 12 }}>
        Video generated by MyCelo agent using Remotion
      </AnimText>
    </AbsoluteFill>
  );
};

// ─── Main composition ───
// Scene durations based on voiceover length + 2s padding
// 01-hero: 4.4s → 7s | 02-problem: 10.8s → 12s | 03-solution: 12.8s → 14s
// 04-screenshots (4 SS): 9.6s → split ~3s each = 12s total
// 05-integrations: 12s → 14s | 06-techstack: 12.5s → 14s
// 07-agentapi: 10.4s → 12s | 08-tracks: 13.5s → 15s
// 09-builtby: 16.5s → 18s | 10-cta: 7s → 9s
// Total: ~127s

export const AgentHandsDemo: React.FC = () => {
  const { fps } = useVideoConfig();
  const T = Math.round(0.4 * fps); // 0.4s transitions

  // Scene start times (cumulative, accounting for transitions)
  // These are approximate for SFX placement
  const S1 = 0;          // hero: 0-7s
  const S2 = 7;          // problem: 7-19s
  const S3 = 19;         // solution: 19-33s
  const S4 = 33;         // screenshots start: 33-45s (4 screenshots)
  const S5 = 45;         // integrations: 45-59s
  const S6 = 59;         // techstack: 59-73s
  const S7 = 73;         // agentapi: 73-85s
  const S8 = 85;         // tracks: 85-100s
  const S9 = 100;        // builtby: 100-118s
  const S10 = 118;       // cta: 118-127s

  return (
    <AbsoluteFill>
      {/* Background music — lower volume to not compete with VO */}
      <Audio src={staticFile("bgm.mp3")} volume={0.18} />

      {/* Voiceovers */}
      <Sequence from={Math.round((S1 + 1) * fps)} durationInFrames={Math.round(5 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/01-hero.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S2 + 0.5) * fps)} durationInFrames={Math.round(12 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/02-problem.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S3 + 0.5) * fps)} durationInFrames={Math.round(14 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/03-solution.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S4 + 0.3) * fps)} durationInFrames={Math.round(11 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/04-screenshots.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S5 + 0.5) * fps)} durationInFrames={Math.round(13 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/05-integrations.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S6 + 0.5) * fps)} durationInFrames={Math.round(14 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/06-techstack.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S7 + 0.5) * fps)} durationInFrames={Math.round(12 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/07-agentapi.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S8 + 0.5) * fps)} durationInFrames={Math.round(15 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/08-tracks.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S9 + 0.5) * fps)} durationInFrames={Math.round(18 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/09-builtby.mp3")} volume={0.9} />
      </Sequence>
      <Sequence from={Math.round((S10 + 0.5) * fps)} durationInFrames={Math.round(9 * fps)} premountFor={fps}>
        <Audio src={staticFile("vo/10-cta.mp3")} volume={0.9} />
      </Sequence>

      {/* SFX */}
      <Sequence from={Math.round(S2 * fps)} durationInFrames={Math.round(2 * fps)} premountFor={fps}>
        <Audio src="https://remotion.media/whoosh.wav" volume={0.3} />
      </Sequence>
      <Sequence from={Math.round((S3 + 2) * fps)} durationInFrames={Math.round(2 * fps)} premountFor={fps}>
        <Audio src="https://remotion.media/ding.wav" volume={0.25} />
      </Sequence>
      <Sequence from={Math.round(S4 * fps)} durationInFrames={Math.round(2 * fps)} premountFor={fps}>
        <Audio src="https://remotion.media/shutter-modern.wav" volume={0.2} />
      </Sequence>
      <Sequence from={Math.round((S4 + 3) * fps)} durationInFrames={Math.round(2 * fps)} premountFor={fps}>
        <Audio src="https://remotion.media/shutter-modern.wav" volume={0.2} />
      </Sequence>
      <Sequence from={Math.round((S4 + 6) * fps)} durationInFrames={Math.round(2 * fps)} premountFor={fps}>
        <Audio src="https://remotion.media/shutter-modern.wav" volume={0.2} />
      </Sequence>
      <Sequence from={Math.round((S4 + 9) * fps)} durationInFrames={Math.round(2 * fps)} premountFor={fps}>
        <Audio src="https://remotion.media/shutter-modern.wav" volume={0.2} />
      </Sequence>
      <Sequence from={Math.round(S6 * fps)} durationInFrames={Math.round(2 * fps)} premountFor={fps}>
        <Audio src="https://remotion.media/switch.wav" volume={0.2} />
      </Sequence>

      <TransitionSeries>
        {/* 1: Hero (7s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(7 * fps)}>
          <HeroScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 2: Problem (12s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(12 * fps)}>
          <ProblemScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 3: Solution (14s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(14 * fps)}>
          <SolutionScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 4-7: Screenshots (3s each = 12s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
          <ScreenshotScene image="ss-task5.jpg" title="Task Detail" subtitle="Self Protocol verification required" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
          <ScreenshotScene image="ss-selfqr.jpg" title="ZK Verification" subtitle="Scan QR to prove you're human" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
          <ScreenshotScene image="ss-tasks.jpg" title="Browse Tasks" subtitle="Multi-chain: Base & Celo" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={slide({ direction: "from-right" })}
          timing={linearTiming({ durationInFrames: T })}
        />
        <TransitionSeries.Sequence durationInFrames={Math.round(3 * fps)}>
          <ScreenshotScene image="ss-dashboard.jpg" title="Worker Dashboard" subtitle="Track tasks & USDC balance" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={wipe({ direction: "from-left" })}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 8: Integrations (14s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(14 * fps)}>
          <IntegrationsScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 9: Tech Stack (14s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(14 * fps)}>
          <TechStackScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 10: Agent API (12s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(12 * fps)}>
          <AgentAPIScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 11: Tracks (15s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(15 * fps)}>
          <TracksScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 12: Built by (18s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(18 * fps)}>
          <BuiltByScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: T })}
        />

        {/* 13: CTA (9s) */}
        <TransitionSeries.Sequence durationInFrames={Math.round(9 * fps)}>
          <CTAScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
