import { redirect } from "next/navigation";

/**
 * Root entry point — immediately redirects to /tasks.
 * Next.js renders this at `/` on Celo mainnet; the redirect keeps the
 * canonical task feed URL at `/tasks` while `/` stays bookmarkable.
 */
export default function HomePage() {
  redirect("/tasks");
}
