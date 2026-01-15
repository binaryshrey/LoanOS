import { NextResponse } from "next/server";

/**
 * GET /api/loanos
 * Proxy endpoint to fetch loan sessions from FastAPI backend
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const sessionId = searchParams.get("id");

    // Build FastAPI backend URL
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

    let apiUrl: string;
    if (sessionId) {
      // Fetch specific session by ID
      apiUrl = `${backendUrl}/api/loan-sessions/${sessionId}`;
    } else if (userId) {
      // Fetch all sessions for a user
      apiUrl = `${backendUrl}/api/loan-sessions?user_id=${encodeURIComponent(
        userId
      )}`;
    } else {
      // Fetch all sessions
      apiUrl = `${backendUrl}/api/loan-sessions`;
    }

    console.log("Proxying request to FastAPI backend:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("FastAPI backend error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch from backend", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Error in loanos proxy API:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
