/**
 * Helper functions for LoanOS session initialization
 * Integrates backend context with ElevenLabs agent
 */

interface BackendContextResponse {
  success: boolean;
  message: string;
  context_summary?: {
    loan_name: string;
    user_role: string;
    document_count: number;
    region: string;
    documents_processed?: number;
    document_summaries?: Array<{
      filename: string;
      summary: string;
      processed: boolean;
      error?: string;
    }>;
  };
}

/**
 * Initialize backend context before starting ElevenLabs session
 * This loads all loan data and documents into memory
 */
export async function initializeBackendContext(
  sessionId: string,
  userId: string,
  backendUrl?: string
): Promise<BackendContextResponse> {
  const baseUrl =
    backendUrl ||
    process.env.NEXT_PUBLIC_LOANOS_BACKEND_URL ||
    "http://localhost:8080";
  const httpUrl = baseUrl
    .replace("ws://", "http://")
    .replace("wss://", "https://");

  try {
    console.log("[Backend] Initializing context for session:", sessionId);

    const response = await fetch(`${httpUrl}/api/session/context`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || errorData.detail || "Failed to initialize context"
      );
    }

    const data: BackendContextResponse = await response.json();
    console.log("[Backend] ✅ Context initialized:", data.context_summary);

    return data;
  } catch (error) {
    console.error("[Backend] ❌ Context initialization failed:", error);
    throw error;
  }
}

/**
 * Query the backend for specific loan information
 * This is what ElevenLabs custom tools call
 */
export async function queryLoanContext(
  sessionId: string,
  question: string,
  backendUrl?: string
): Promise<string> {
  const baseUrl =
    backendUrl ||
    process.env.NEXT_PUBLIC_LOANOS_BACKEND_URL ||
    "http://localhost:8080";
  const httpUrl = baseUrl
    .replace("ws://", "http://")
    .replace("wss://", "https://");

  try {
    console.log("[Backend] Querying:", question);

    const response = await fetch(`${httpUrl}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session_id: sessionId,
        question: question,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || errorData.detail || "Failed to query context"
      );
    }

    const data = await response.json();
    console.log("[Backend] ✅ Answer received");

    return data.answer;
  } catch (error) {
    console.error("[Backend] ❌ Query failed:", error);
    throw error;
  }
}

/**
 * Build initial context message for ElevenLabs agent
 * This provides the agent with session information and document details
 */
export function buildInitialContextMessage(
  sessionId: string,
  loanName: string,
  userRole?: string,
  institution?: string,
  documents?: Array<{
    filename: string;
    gcs_bucket?: string;
    gcs_object_path?: string;
  }>
): string {
  let message = `You are now in a session for the loan: "${loanName}". Session ID: ${sessionId}.`;

  if (userRole) {
    message += ` The user's role is: ${userRole}.`;
  }

  if (institution) {
    message += ` Institution: ${institution}.`;
  }

  if (documents && documents.length > 0) {
    message += ` The following documents have been uploaded and are available for analysis: ${documents
      .map((d) => d.filename)
      .join(", ")}.`;
    message += ` Total documents: ${documents.length}.`;
  }

  message += ` You have access to these loan documents through the query_loan_context tool. Use it to answer specific questions about loan terms, rates, covenants, and other details. Always check the documents when users ask specific questions.`;

  return message;
}

/**
 * Check backend health before initializing
 */
export async function checkBackendHealth(
  backendUrl?: string
): Promise<boolean> {
  const baseUrl =
    backendUrl ||
    process.env.NEXT_PUBLIC_LOANOS_BACKEND_URL ||
    "http://localhost:8080";
  const httpUrl = baseUrl
    .replace("ws://", "http://")
    .replace("wss://", "https://");

  try {
    const response = await fetch(`${httpUrl}/health`, {
      method: "GET",
    });

    return response.ok;
  } catch (error) {
    console.error("[Backend] Health check failed:", error);
    return false;
  }
}
