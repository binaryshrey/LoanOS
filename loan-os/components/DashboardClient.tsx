"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Search,
  TrendingUp,
  CheckCircle,
  FileText,
  Clock,
  Loader2,
} from "lucide-react";

interface DashboardClientProps {
  greeting: string;
  formattedDate: string;
  userName: string;
  userId: string;
}

export default function DashboardClient({
  greeting,
  formattedDate,
  userName,
  userId,
}: DashboardClientProps) {
  const router = useRouter();

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Helper: format duration seconds to friendly string
  const formatDuration = (secs: number) => {
    if (!secs) return "-";
    const mins = Math.round(secs / 60);
    if (mins < 60) return `${mins} mins`;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Completed":
        return "px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800";
      case "Pending":
      case "Processing":
      case "Active":
        return "px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800";
      case "Error":
        return "px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800";
      default:
        return "px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    const fetchSessions = async () => {
      if (!userId) {
        setError("User ID not found");
        return;
      }

      setIsLoading(true);
      try {
        // Try to fetch from FastAPI backend first, fall back to Next.js API
        let response;
        try {
          // Fetch from FastAPI backend
          const backendUrl =
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
          response = await fetch(
            `${backendUrl}/api/loan-sessions?user_id=${encodeURIComponent(
              userId
            )}`
          );
        } catch (backendError) {
          console.warn(
            "FastAPI backend unavailable, falling back to Next.js API:",
            backendError
          );
          // Fall back to Next.js API route
          response = await fetch(
            `/api/loan-sessions?user_id=${encodeURIComponent(userId)}`
          );
        }

        if (!response.ok) {
          throw new Error("Failed to fetch loan sessions");
        }
        const data = await response.json();
        setSessions(data.data || data.sessions || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching loan sessions:", err);
        setError("Failed to load loan sessions");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, [userId]);

  const handleRowClick = (session: any) => {
    try {
      const id = session.id;
      if (!id) {
        console.warn("[Dashboard] clicked session has no id");
        return;
      }
      // Navigate to loan session summary page
      router.push(`/summary/${encodeURIComponent(String(id))}`);
    } catch (err) {
      console.error("[Dashboard] Failed to navigate to summary:", err);
    }
  };

  const handleNewSessionClick = () => {
    router.push("/onboard");
  };

  // Computed metrics derived from fetched sessions
  const completedCount = sessions.filter(
    (s) => (s.status ?? "") === "Completed"
  ).length;
  const completedPct = sessions.length
    ? ((completedCount / sessions.length) * 100).toFixed(2)
    : "0.00";

  // Average score calculation
  const scoredSessions = sessions
    .map((s) => {
      try {
        if (
          s.score &&
          typeof s.score === "object" &&
          s.score.overall_score != null
        ) {
          return Number(s.score.overall_score);
        }
        if (typeof s.score === "number") {
          return s.score > 10 ? s.score / 10 : s.score;
        }
      } catch (e) {
        // fallthrough
      }
      return null;
    })
    .filter((x) => x != null) as number[];

  const avgScore =
    scoredSessions.length > 0
      ? (
          scoredSessions.reduce((acc, val) => acc + val, 0) /
          scoredSessions.length
        ).toFixed(1)
      : "0.0";

  // Total time on sessions
  const totalSeconds = sessions.reduce(
    (acc, s) => acc + (s.duration_seconds ?? s.duration ?? 0),
    0
  );
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalRemMins = Math.round((totalSeconds % 3600) / 60);

  // Search filter
  const filteredSessions = searchQuery
    ? sessions.filter((s) => {
        const normalizedQuery = searchQuery.toLowerCase();
        const name = (
          s.loan_name ||
          s.loan_type ||
          s.startup_name ||
          ""
        ).toLowerCase();
        const content = (s.content || "").toLowerCase();
        const userRole = (s.user_role || "").toLowerCase();
        const institution = (s.institution || "").toLowerCase();
        const feedback = (
          typeof s.feedback === "string"
            ? s.feedback
            : s.feedback?.summary || s.feedback?.text || ""
        ).toLowerCase();
        return (
          name.includes(normalizedQuery) ||
          content.includes(normalizedQuery) ||
          userRole.includes(normalizedQuery) ||
          institution.includes(normalizedQuery) ||
          feedback.includes(normalizedQuery)
        );
      })
    : sessions;

  return (
    <div>
      {/* Top bar with search and button */}
      <div className="flex items-center justify-between mb-4 mx-4">
        <div className="relative w-64 lg:w-120">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-3 h-3" />
          <Input
            type="text"
            placeholder="Search your loan sessions"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          onClick={handleNewSessionClick}
          className="bg-neutral-800 hover:bg-neutral-700 cursor-pointer text-white px-2 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
        >
          <span className="hidden sm:inline">+ New Loan Session</span>
          <span className="sm:hidden">+ New Session</span>
        </Button>
      </div>

      {/* Horizontal line */}
      <hr className="border-gray-300 mb-3" />

      {/* Date and Greeting */}
      <div className="mb-4 mx-4">
        <p className="text-sm text-gray-500">{formattedDate}</p>
        <h1 className="text-2xl font-medium text-gray-900">
          {greeting}, {userName}!
        </h1>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mx-4 mt-2">
        {/* Total Loan Sessions */}
        <div className="bg-neutral-200 rounded-xl p-6 shadow-lg cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-gray-800 text-sm font-medium">
              Total Loan Sessions
            </h3>
            <div className="bg-neutral-700 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-gray-900 text-3xl font-bold">
            {isLoading ? "..." : sessions.length === 0 ? "0" : sessions.length}
          </p>
        </div>

        {/* Completed Sessions */}
        <div className="bg-neutral-200 rounded-xl p-6 shadow-lg cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-gray-800 text-sm font-medium">
              Completed Sessions
            </h3>
            <div className="bg-neutral-700 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-gray-900 text-3xl font-bold">
            {isLoading ? "..." : sessions.length === 0 ? "0" : completedCount}{" "}
            <span className="text-lg text-gray-700 font-normal">
              (
              {isLoading
                ? "..."
                : sessions.length === 0
                ? "0.00%"
                : `${completedPct}%`}
              )
            </span>
          </p>
        </div>

        {/* Total Loan Documents */}
        <div className="bg-neutral-200 rounded-xl p-6 shadow-lg cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-gray-800 text-sm font-medium">
              Loan Documents Processed
            </h3>
            <div className="bg-neutral-700 p-2 rounded-lg">
              <FileText className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-gray-900 text-3xl font-bold">
            {isLoading ? "..." : sessions.length === 0 ? "0" : sessions.length}
          </p>
        </div>

        {/* Total Time on Sessions */}
        <div className="bg-neutral-200 rounded-xl p-6 shadow-lg cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-gray-800 text-sm font-medium">
              Time on Sessions
            </h3>
            <div className="bg-neutral-700 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-gray-900 text-3xl font-bold">
            {isLoading ? (
              "..."
            ) : sessions.length === 0 ? (
              "0"
            ) : (
              <>
                {totalHours}h{" "}
                <span className="text-lg text-gray-700 font-normal">
                  {totalRemMins}m
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Loan Sessions Table */}
      <div className="mt-6 bg-white rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent Loan Sessions
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    <div className="flex items-center justify-center gap-2 flex-col">
                      <Loader2 className="w-5 h-5 text-neutral-800 animate-spin" />
                      <span>Loading loan sessions</span>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-red-600"
                  >
                    {error}
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-sm text-gray-500"
                  >
                    {searchQuery
                      ? `No loan sessions found matching "${searchQuery}"`
                      : "No loan sessions yet. Click '+ New Loan Session' to get started."}
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s, idx) => (
                  <tr
                    key={s.id || idx}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleRowClick(s)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {s.loan_name ||
                        s.loan_type ||
                        s.startup_name ||
                        s.content ||
                        "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDuration(s.duration_seconds ?? s.duration ?? 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {(() => {
                        if (s.feedback == null) return "Click to view details";
                        if (typeof s.feedback === "object") {
                          const summary =
                            s.feedback?.summary ||
                            s.feedback?.text ||
                            s.feedback?.brief;
                          if (summary) return summary;
                          return Object.keys(s.feedback).length
                            ? "Click to view details"
                            : "Click to view details";
                        }
                        const fb = (s.feedback || "").toString().trim();
                        return fb.length ? fb : "Click to view details";
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={getStatusBadgeClass(s.status ?? "")}>
                        {s.status ?? "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
