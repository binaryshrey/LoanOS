// app/dashboard/page.tsx
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to LoanOS Dashboard
          </h1>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="text-lg text-gray-900">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">User ID</p>
              <p className="text-lg text-gray-900">{user.id}</p>
            </div>
          </div>
          <div className="mt-6">
            <form
              action={async () => {
                "use server";
                const { signOut } = await import("@workos-inc/authkit-nextjs");
                await signOut();
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
