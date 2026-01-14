/**
 * Example utility functions for working with loan sessions
 */

import { LoanSession } from "./supabase";

/**
 * Save a loan session after files are uploaded to GCP
 */
export async function saveLoanSession(data: LoanSession) {
  try {
    const response = await fetch("/api/loan-sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to save loan session");
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error("Error saving loan session:", error);
    throw error;
  }
}

/**
 * Fetch all loan sessions for a user
 */
export async function getUserLoanSessions(userId: string) {
  try {
    const response = await fetch(`/api/loan-sessions?user_id=${userId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to fetch loan sessions");
    }

    const result = await response.json();
    return result.data as LoanSession[];
  } catch (error) {
    console.error("Error fetching loan sessions:", error);
    throw error;
  }
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date for display
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return "Unknown date";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get status badge color
 */
export function getStatusColor(status?: string): string {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800";
    case "Processing":
      return "bg-blue-100 text-blue-800";
    case "Completed":
      return "bg-gray-100 text-gray-800";
    case "Error":
      return "bg-red-100 text-red-800";
    case "Pending":
    default:
      return "bg-yellow-100 text-yellow-800";
  }
}
