import { redirect } from "next/navigation";

/**
 * Root entry point — immediately redirects to `/tasks`.
 * @since 1.0.0
 * Next.js renders this Server Component at `/` on Celo mainnet; the redirect
 * keeps the canonical task feed URL at `/tasks` while `/` stays bookmarkable.
 * @see {@link /tasks} — AgentHands Celo task marketplace feed
 */
export default function HomePage() {
  redirect("/tasks");
}
