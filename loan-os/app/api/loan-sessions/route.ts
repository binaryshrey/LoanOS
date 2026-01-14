import { NextResponse } from "next/server";
import { getSupabaseServerClient, LoanSession } from "@/lib/supabase";

/**
 * POST /api/loan-sessions
 * Create a new loan session in Supabase
 */
export async function POST(req: Request) {
  try {
    const data: LoanSession = await req.json();

    // Validate required fields
    if (
      !data.user_id ||
      !data.user_email ||
      !data.loan_name ||
      !data.user_role
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: user_id, user_email, loan_name, user_role",
        },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = getSupabaseServerClient();

    // Prepare data for insertion
    const loanSessionData = {
      user_id: data.user_id,
      user_email: data.user_email,
      loan_name: data.loan_name,
      user_role: data.user_role,
      institution: data.institution || "",
      ai_focus: data.ai_focus || "",
      duration_seconds: data.duration_seconds || 180,
      language: data.language || "en",
      region: data.region || "EMEA",
      gcp_buckets: data.gcp_buckets || [],
      gcp_object_paths: data.gcp_object_paths || [],
      gcp_file_urls: data.gcp_file_urls || [],
      gcp_bucket: data.gcp_bucket || "",
      gcp_object_path: data.gcp_object_path || "",
      gcp_file_url: data.gcp_file_url || "",
      documents: data.documents || [],
      conversations: data.conversations || [],
      status: data.status || "Pending",
    };

    console.log("Saving loan session to Supabase:", {
      user_id: loanSessionData.user_id,
      loan_name: loanSessionData.loan_name,
      file_count: loanSessionData.documents.length,
    });

    // Insert into Supabase
    const { data: insertedData, error } = await supabase
      .from("loan_sessions")
      .insert([loanSessionData])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to save loan session" },
        { status: 500 }
      );
    }

    console.log("✅ Loan session saved successfully:", insertedData.id);

    return NextResponse.json({
      success: true,
      data: insertedData,
      message: "Loan session created successfully",
    });
  } catch (err: any) {
    console.error("Error in loan-sessions API:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/loan-sessions?user_id=xxx
 * Get all loan sessions for a user
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from("loan_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase query error:", error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch loan sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (err: any) {
    console.error("Error in loan-sessions GET API:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
