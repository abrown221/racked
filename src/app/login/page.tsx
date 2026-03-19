"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 max-w-[430px] mx-auto"
      style={{ background: "#FAF7F2" }}
    >
      <div className="text-center mb-14">
        <div
          className="text-7xl mb-7"
          style={{
            filter: "drop-shadow(0 4px 12px rgba(114,47,55,0.18))",
          }}
        >
          🍷
        </div>
        <h1
          className="font-serif font-bold mb-3"
          style={{
            fontSize: "42px",
            color: "#2D241B",
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
          }}
        >
          Racked
        </h1>
        <p
          className="text-base leading-relaxed"
          style={{ color: "#8C7E72" }}
        >
          Your personal wine collection,
          <br />
          powered by AI
        </p>
      </div>

      <button
        onClick={handleGoogleLogin}
        className="w-full max-w-xs flex items-center justify-center gap-3 px-6 py-4 font-medium text-base cursor-pointer transition-all duration-200"
        style={{
          background: "#FFFFFF",
          border: "1px solid #DDD5CA",
          borderRadius: "16px",
          color: "#2D241B",
          boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 4px 20px rgba(45,36,27,0.12)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            "0 2px 12px rgba(45,36,27,0.06)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>

      <p
        className="mt-10 text-xs text-center leading-relaxed"
        style={{ color: "#8C7E72" }}
      >
        By signing in, you agree to our Terms of Service
        <br />
        and Privacy Policy
      </p>
    </div>
  );
}
