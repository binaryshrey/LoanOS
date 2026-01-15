"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import {
  ArrowLeft,
  FileText,
  User,
  Building,
  Globe,
  Clock,
  Calendar,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface SummaryClientProps {
  sessionId: string;
  userId: string;
}

interface LoanSession {
  id: string;
  user_id: string;
  user_email: string;
  loan_name: string;
  user_role: string;
  institution?: string;
  ai_focus?: string;
  duration_seconds?: number;
  language?: string;
  region?: string;
  documents?: Array<{
    filename: string;
    gcs_bucket: string;
    gcs_object_path: string;
    public_url?: string;
    size?: number;
    contentType?: string;
  }>;
  conversations?: Array<{
    id?: string;
    timestamp?: string;
    role?: string;
    message?: string;
    metadata?: any;
  }>;
  analysis?: any;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export default function SummaryClient({
  sessionId,
  userId,
}: SummaryClientProps) {
  const router = useRouter();
  const [session, setSession] = useState<LoanSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      console.log("[SummaryClient] Starting fetch for session:", sessionId);
      setIsLoading(true);
      setError(null);

      try {
        // Try FastAPI backend first, fall back to Next.js API
        let response;
        let usedBackend = false;

        try {
          const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
          const url = `${backendUrl}/api/loan-sessions/${sessionId}`;
          console.log("[SummaryClient] Trying FastAPI backend:", url);

          response = await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });
          usedBackend = true;
          console.log(
            "[SummaryClient] FastAPI response status:",
            response.status
          );
        } catch (backendError) {
          console.warn(
            "[SummaryClient] FastAPI backend unavailable, falling back to Next.js API:",
            backendError
          );
          const fallbackUrl = `/api/loan-sessions?id=${sessionId}`;
          console.log("[SummaryClient] Trying Next.js API:", fallbackUrl);
          response = await fetch(fallbackUrl);
          console.log(
            "[SummaryClient] Next.js API response status:",
            response.status
          );
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "[SummaryClient] Response not OK:",
            response.status,
            errorText
          );
          throw new Error(`Failed to fetch loan session: ${response.status}`);
        }

        const data = await response.json();
        console.log("[SummaryClient] Received data:", data);

        if (!data.data) {
          console.error("[SummaryClient] No data in response:", data);
          throw new Error("No session data received");
        }

        setSession(data.data);
        console.log("[SummaryClient] Session loaded successfully");
      } catch (err) {
        console.error("[SummaryClient] Error fetching loan session:", err);
        setError("Failed to load loan session details");
      } finally {
        setIsLoading(false);
        console.log("[SummaryClient] Fetch complete");
      }
    };

    if (sessionId) {
      fetchSession();
    } else {
      console.error("[SummaryClient] No sessionId provided");
      setError("No session ID provided");
      setIsLoading(false);
    }
  }, [sessionId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "-";
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} minutes`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case "Completed":
        return "px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-green-100 text-green-800";
      case "Pending":
      case "Processing":
      case "Active":
        return "px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800";
      case "Error":
        return "px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-red-100 text-red-800";
      default:
        return "px-3 py-1 inline-flex text-sm font-semibold rounded-full bg-gray-100 text-gray-800";
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "-";
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-neutral-800 animate-spin" />
          <p className="text-sm text-gray-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            {error || "Session not found"}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Unable to load the loan session details. Please try again.
          </p>
          <Button
            onClick={() => router.push("/dashboard")}
            variant="outline"
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={() => router.push("/dashboard")}
          variant="ghost"
          className="gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
        <Button
          onClick={() => router.push(`/loan-chat/${sessionId}`)}
          className="bg-neutral-800 hover:bg-neutral-700 text-white"
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Open Chat
        </Button>
      </div>

      {/* Title and Status */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            {session.loan_name}
          </h1>
          <span className={getStatusBadgeClass(session.status)}>
            {session.status || "Unknown"}
          </span>
        </div>
        <p className="text-sm text-gray-500">Session ID: {session.id}</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Basic Information Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">User Role</p>
                <p className="text-sm text-gray-900">{session.user_role}</p>
              </div>
            </div>

            {session.institution && (
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">
                    Institution
                  </p>
                  <p className="text-sm text-gray-900">{session.institution}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Globe className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Region</p>
                <p className="text-sm text-gray-900">
                  {session.region || "Not specified"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Duration</p>
                <p className="text-sm text-gray-900">
                  {formatDuration(session.duration_seconds)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Created</p>
                <p className="text-sm text-gray-900">
                  {formatDate(session.created_at)}
                </p>
              </div>
            </div>

            {session.updated_at &&
              session.updated_at !== session.created_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">
                      Last Updated
                    </p>
                    <p className="text-sm text-gray-900">
                      {formatDate(session.updated_at)}
                    </p>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* AI Configuration Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            AI Configuration
          </h2>
          <div className="space-y-3">
            {session.ai_focus && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  AI Focus
                </p>
                <p className="text-sm text-gray-900">{session.ai_focus}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Language</p>
              <p className="text-sm text-gray-900">
                {session.language === "en"
                  ? "English"
                  : session.language || "Not specified"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                User Email
              </p>
              <p className="text-sm text-gray-900">{session.user_email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      {session.documents && session.documents.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Documents ({session.documents.length})
            </h2>
          </div>
          <div className="space-y-2">
            {session.documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {doc.contentType || "Unknown type"} •{" "}
                      {formatFileSize(doc.size)}
                    </p>
                  </div>
                </div>
                {doc.public_url && (
                  <a
                    href={doc.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                  >
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversations Section */}
      {session.conversations && session.conversations.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Conversation History ({session.conversations.length})
            </h2>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {session.conversations.map((conv, index) => (
              <div
                key={conv.id || index}
                className={`p-4 rounded-lg ${
                  conv.role === "user"
                    ? "bg-blue-50 ml-8"
                    : conv.role === "assistant"
                    ? "bg-gray-50 mr-8"
                    : "bg-yellow-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">
                    {conv.role || "Unknown"}
                  </span>
                  {conv.timestamp && (
                    <span className="text-xs text-gray-500">
                      {formatDate(conv.timestamp)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {conv.message || "No message content"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis Section */}
      {session.analysis && Object.keys(session.analysis).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            AI Analysis
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(session.analysis, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
