import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, boolean> = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    anthropicApiKey: !!process.env.ANTHROPIC_API_KEY,
  };

  return NextResponse.json(checks);
}
