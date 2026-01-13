// app/profile/page.tsx
import { withAuth, signOut } from "@workos-inc/authkit-nextjs";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Camera } from "lucide-react";

export default async function ProfilePage() {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        {/* Header Background */}
        <div className="relative h-32 sm:h-48 bg-linear-to-r from-neutral-700 to-neutral-900"></div>

        {/* Profile Content */}
        <div className="relative px-4 sm:px-8 pb-8 max-w-7xl mx-auto">
          {/* Profile Image */}
          <div className="absolute -top-16 sm:-top-20 left-4 sm:left-8">
            <div className="relative">
              <Image
                className="rounded-full border-4 border-white shadow-lg"
                src={user?.profilePictureUrl || "/default-avatar.png"}
                alt="Profile"
                width={128}
                height={128}
              />
              <button className="absolute bottom-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 transition-colors">
                <Camera className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-20 sm:pt-24">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {user.email}
            </p>
          </div>

          {/* Profile Details */}
          <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Account Information
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">Full Name</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.firstName} {user.lastName}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">Email</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.email}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-sm text-gray-600">User ID</span>
                <span className="text-sm font-medium text-gray-900 font-mono">
                  {user.id}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-gray-600">Email Verified</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.emailVerified ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button
                type="submit"
                className="w-full px-4 py-3 bg-neutral-800 text-white rounded-md hover:bg-neutral-700 transition-colors font-medium cursor-pointer"
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
