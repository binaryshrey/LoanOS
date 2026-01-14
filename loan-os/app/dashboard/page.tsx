// app/dashboard/page.tsx
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import ProfileMenu from "@/components/ProfileMenu";
import LoanSessionsList from "@/components/LoanSessionsList";

export default async function DashboardPage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div
      className="relative z-10 min-h-screen"
      style={{ backgroundColor: "#d8dbdf" }}
    >
      <div className="px-6 pt-6 lg:px-8">
        <nav className="flex items-center justify-between">
          <a href="/dashboard" className="-m-1.5 p-1.5">
            <img className="h-8" src="/logo.svg" alt="LoanOS" />
          </a>
          <div className="lg:flex lg:flex-1 lg:justify-end">
            <ProfileMenu user={user} />
          </div>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.firstName || user.email.split("@")[0]}!
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your loan intelligence sessions and documentation.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <LoanSessionsList userId={user.id} />
        </div>
      </div>
    </div>
  );
}
