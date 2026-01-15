import { createClient } from "@supabase/supabase-js";

// Client for browser (uses anon key)
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

// Server-side client (uses service role key)
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// Database types for loan_sessions table
export interface LoanSession {
  id?: string;
  user_id: string;
  user_email: string;
  loan_name: string;
  user_role: string;
  institution?: string;
  ai_focus?: string;
  duration_seconds: number;
  language: string;
  region: string;
  gcp_buckets: string[];
  gcp_object_paths: string[];
  gcp_file_urls: string[];
  gcp_bucket?: string; // Legacy field for backward compatibility
  gcp_object_path?: string; // Legacy field
  gcp_file_url?: string; // Legacy field
  documents?: Array<{
    filename: string;
    gcs_bucket: string;
    gcs_object_path: string;
    public_url: string;
    size?: number;
    contentType?: string;
  }>;
  conversations?: Array<{
    id?: string;
    timestamp?: string;
    role?: string; // 'user' | 'assistant' | 'system'
    message?: string;
    metadata?: any;
  }>;
  analysis?: any; // AI-generated analysis of the loan (JSON)
  status?: string;
  created_at?: string;
  updated_at?: string;
}
