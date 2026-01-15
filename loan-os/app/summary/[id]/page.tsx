// app/summary/[id]/page.tsx
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import SummaryClient from "@/components/SummaryClient";

export default async function SummaryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  // Await params in Next.js 15+
  const { id } = await params;

  return (
    <DashboardLayout user={user} currentPage="dashboard">
      <SummaryClient sessionId={id} userId={user.id ?? user.email} />
    </DashboardLayout>
  );
}
