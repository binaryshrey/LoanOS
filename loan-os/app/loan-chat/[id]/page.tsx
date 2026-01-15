import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import ProfileMenu from "@/components/ProfileMenu";
import LoanOSChat from "@/components/LoanOSChat";
import { getSupabaseServerClient } from "@/lib/supabase";

interface Params {
  params: { id: string };
}

export default async function LoanChatPage({ params }: Params) {
  const { user } = await withAuth();

  if (!user) {
    redirect("/sign-in");
  }

  const resolvedParams = await params;
  const sessionId = resolvedParams.id;

  // Fetch session data from Supabase
  const supabase = getSupabaseServerClient();
  const { data: session, error } = await supabase
    .from("loan_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Session Not Found
          </h1>
          <p className="text-gray-600 mb-4">
            The loan session you're looking for doesn't exist.
          </p>
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // Verify user has access to this session
  if (session.user_id !== user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this session.
          </p>
          <a
            href="/dashboard"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative z-10 min-h-screen"
      style={{ backgroundColor: "#d8dbdf" }}
    >
      {/* Header */}
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

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {session.loan_name}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span>Role: {session.user_role}</span>
            {session.institution && <span>• {session.institution}</span>}
            <span>• {session.region}</span>
            <span>• {session.documents?.length || 0} documents</span>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="h-[calc(100vh-16rem)]">
          <LoanOSChat
            sessionId={sessionId}
            userId={user.id}
            loanName={session.loan_name}
            backendUrl={process.env.NEXT_PUBLIC_LOANOS_BACKEND_URL}
          />
        </div>

        {/* Info Section */}
        <div className="mt-6 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Session Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">AI Focus:</span>
              <p className="font-medium">
                {session.ai_focus || "General Analysis"}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Language:</span>
              <p className="font-medium">{session.language || "en"}</p>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <p className="font-medium">{session.status || "Active"}</p>
            </div>
          </div>

          {session.documents && session.documents.length > 0 && (
            <div className="mt-4">
              <span className="text-gray-600 text-sm">Uploaded Documents:</span>
              <ul className="mt-2 space-y-1">
                {session.documents.map((doc: any, idx: number) => (
                  <li key={idx} className="text-sm text-gray-700">
                    📄 {doc.filename}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
