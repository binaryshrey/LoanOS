"use client";

import { useEffect, useState } from "react";
import { FileText, Calendar, User, Building2, Globe } from "lucide-react";
import { LoanSession } from "@/lib/supabase";
import {
  getUserLoanSessions,
  formatDate,
  formatFileSize,
  getStatusColor,
} from "@/lib/loanSessions";

interface LoanSessionsListProps {
  userId: string;
}

export default function LoanSessionsList({ userId }: LoanSessionsListProps) {
  const [sessions, setSessions] = useState<LoanSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        setLoading(true);
        const data = await getUserLoanSessions(userId);
        setSessions(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching sessions:", err);
        setError("Failed to load loan sessions");
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      fetchSessions();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-800"></div>
        <span className="ml-3 text-gray-600">Loading loan sessions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No loan sessions yet
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first loan intelligence session.
        </p>
        <div className="mt-6">
          <a
            href="/onboard"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-neutral-800 hover:bg-neutral-700"
          >
            Create Loan Session
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Your Loan Sessions ({sessions.length})
        </h2>
        <a
          href="/onboard"
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-neutral-800 hover:bg-neutral-700"
        >
          New Session
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 truncate flex-1">
                {session.loan_name}
              </h3>
              <span
                className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                  session.status
                )}`}
              >
                {session.status}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm text-gray-600">
              {session.institution && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="truncate">{session.institution}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="capitalize">{session.user_role}</span>
              </div>

              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <span>
                  {session.region} • {session.language.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(session.created_at)}</span>
              </div>
            </div>

            {/* Documents */}
            {session.documents && session.documents.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Documents ({session.documents.length})
                </p>
                <div className="space-y-1">
                  {session.documents.slice(0, 3).map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <FileText className="h-3 w-3 text-gray-400 shrink-0" />
                        <a
                          href={doc.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate"
                        >
                          {doc.filename}
                        </a>
                      </div>
                      <span className="text-gray-500 ml-2 shrink-0">
                        {formatFileSize(doc.size)}
                      </span>
                    </div>
                  ))}
                  {session.documents.length > 3 && (
                    <p className="text-xs text-gray-500">
                      +{session.documents.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* AI Focus */}
            {session.ai_focus && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">
                  AI Focus
                </p>
                <p className="text-xs text-gray-600 line-clamp-2">
                  {session.ai_focus}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
