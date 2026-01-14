import { NextRequest, NextResponse } from "next/server";

// Simple in-memory queue management
let activeSession: string | null = null;
const queue: Array<{
  id: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * GET /api/loanos
 * Get Anam session token and ElevenLabs agent ID
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[LoanOS API] Incoming request");

    const anamApiKey = process.env.ANAM_API_KEY;
    const avatarAdvisorId = process.env.ANAM_AVATAR_ADVISOR_ID;
    const elevenLabsAgentId = process.env.ELEVENLABS_AGENT_LOANOS_ID;

    if (!anamApiKey || !avatarAdvisorId || !elevenLabsAgentId) {
      console.error("[LoanOS API] Missing required environment variables");
      return NextResponse.json(
        {
          error:
            "Missing required environment variables: ANAM_API_KEY, ANAM_AVATAR_ADVISOR_ID, or ELEVENLABS_AGENT_LOANOS_ID",
        },
        { status: 500 }
      );
    }

    console.log("[LoanOS API] Environment variables verified");

    // Simple queue: only one session at a time
    const sessionId = Math.random().toString(36).substring(7);

    if (activeSession) {
      console.log("[LoanOS API] Session already active, queueing...");
      // In a real implementation, you'd want to handle queuing properly
      // For now, we'll just allow it
    }

    activeSession = sessionId;

    // Fetch Anam session token
    console.log("[LoanOS API] Fetching Anam token...");
    const anamAuthURI = "https://api.anam.ai/v1/auth/session-token";

    let response: Response;
    try {
      response = await fetch(anamAuthURI, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${anamApiKey}`,
        },
        body: JSON.stringify({
          personaConfig: {
            avatarId: avatarAdvisorId,
            enableAudioPassthrough: true,
          },
        }),
      });
    } catch (err) {
      console.error("[LoanOS API] Anam auth fetch error:", err);
      throw new Error("Failed to reach Anam auth endpoint");
    }

    if (!response.ok) {
      const error = await response.text().catch(() => response.statusText);
      console.error("Anam API error:", error);
      throw new Error("Failed to get Anam session token");
    }

    const data = await response.json();
    const anamToken = data.sessionToken;
    console.log("[LoanOS API] Token acquired successfully");

    return NextResponse.json({
      anamSessionToken: anamToken,
      elevenLabsAgentId: elevenLabsAgentId,
      queueSessionId: sessionId,
    });
  } catch (err: any) {
    console.error("[LoanOS API] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loanos
 * Release a session slot
 */
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (activeSession === sessionId) {
      activeSession = null;
      console.log("[LoanOS API] Session released:", sessionId);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[LoanOS API] Error releasing session:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
