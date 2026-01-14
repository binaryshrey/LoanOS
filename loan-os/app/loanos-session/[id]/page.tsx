import { withAuth } from "@workos-inc/authkit-nextjs";
import LoanOSSessionClient from "@/components/LoanOSSessionClient";

interface Params {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}

export default async function LoanOSSessionPage({
  params,
  searchParams,
}: Params) {
  const { user } = await withAuth();

  if (!user) return null;

  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Always auto-start unless explicitly disabled
  const autoStart = resolvedSearchParams?.autoStart !== "false";

  // Get duration from search params or default to 3 minutes
  let duration = 3; // Default 3 minutes
  if (resolvedSearchParams?.duration) {
    const raw = parseFloat(String(resolvedSearchParams.duration));
    // If the value looks like seconds (>= 30), convert to minutes
    // Otherwise assume it's already minutes (1, 2, 3 etc.)
    duration = raw >= 30 ? raw / 60 : raw;
  }

  return (
    <div className="relative min-h-screen">
      <LoanOSSessionClient
        sessionId={resolvedParams.id}
        autoStart={autoStart}
        duration={duration}
        user={user}
      />
    </div>
  );
}
