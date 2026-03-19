import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/tonight";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Ensure profile and default cellar exist
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Upsert profile
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            display_name:
              user.user_metadata?.full_name || user.email?.split("@")[0],
          },
          { onConflict: "id" }
        );

        // Check if user has a cellar
        const { data: membership } = await supabase
          .from("cellar_members")
          .select("cellar_id")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (!membership) {
          // Create default cellar
          const { data: cellar } = await supabase
            .from("cellars")
            .insert({ owner_id: user.id, name: "My Cellar" })
            .select("id")
            .single();

          if (cellar) {
            await supabase.from("cellar_members").insert({
              cellar_id: cellar.id,
              user_id: user.id,
              role: "owner",
              accepted_at: new Date().toISOString(),
            });
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
