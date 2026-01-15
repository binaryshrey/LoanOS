// app/settings/page.tsx
import { withAuth } from "@workos-inc/authkit-nextjs";
import DashboardLayout from "@/components/DashboardLayout";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <DashboardLayout user={user} currentPage="settings">
      <div className="px-4 pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account settings and preferences.
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <p className="text-sm text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="text-sm text-gray-900">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Preferences
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Email Notifications
                  </p>
                  <p className="text-xs text-gray-500">
                    Receive updates about your loan sessions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-neutral-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-800"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Auto-save Sessions
                  </p>
                  <p className="text-xs text-gray-500">
                    Automatically save your work
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-neutral-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-800"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
