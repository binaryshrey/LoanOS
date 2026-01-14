import { withAuth } from "@workos-inc/authkit-nextjs";
import ProfileMenu from "@/components/ProfileMenu";
import OnboardForm from "@/components/OnboardForm";

export default async function Onboard() {
  const { user } = await withAuth();

  if (!user) return null;

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

      <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            LoanOS Intelligence Workspace Setup
          </h1>
          <p className="mt-2 text-md leading-4 text-gray-600">
            Upload your loan documentation to enable a structured, AI-driven
            conversational analysis and monitoring across the full loan
            lifecycle.
          </p>
        </div>

        <OnboardForm user={user} />
      </div>
    </div>
  );
}
