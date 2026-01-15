// app/loan-sessions/page.tsx
import { withAuth } from "@workos-inc/authkit-nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { redirect } from "next/navigation";
import LoanSessionsList from "@/components/LoanSessionsList";

export default async function LoanSessionsPage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <DashboardLayout user={user} currentPage="files">
      <div className="px-4 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Loan Sessions</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all your loan intelligence sessions and documents.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <LoanSessionsList userId={user.id} />
        </div>
      </div>
    </DashboardLayout>
  );
}
