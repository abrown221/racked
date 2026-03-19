"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

type Check = {
  name: string;
  status: "pending" | "pass" | "fail";
  detail?: string;
};

const TABLES = [
  "profiles",
  "cellars",
  "cellar_members",
  "fridges",
  "wines",
  "tasting_notes",
  "dossiers",
  "wishlist",
];

export default function DebugPage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const updateCheck = (name: string, status: Check["status"], detail?: string) => {
    setChecks((prev) => {
      const existing = prev.find((c) => c.name === name);
      if (existing) {
        return prev.map((c) => (c.name === name ? { ...c, status, detail } : c));
      }
      return [...prev, { name, status, detail }];
    });
  };

  const runChecks = async () => {
    setRunning(true);
    setChecks([]);

    const supabase = createClient();

    // 1. Check env vars via health endpoint
    updateCheck("API Health (env vars)", "pending");
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      const allPresent = data.supabaseUrl && data.supabaseAnonKey && data.anthropicApiKey;
      const missing = Object.entries(data)
        .filter(([, v]) => !v)
        .map(([k]) => k);
      updateCheck(
        "API Health (env vars)",
        allPresent ? "pass" : "fail",
        allPresent ? "All env vars present" : `Missing: ${missing.join(", ")}`
      );
    } catch (e) {
      updateCheck("API Health (env vars)", "fail", `Fetch error: ${e}`);
    }

    // 2. Supabase connection
    updateCheck("Supabase connection", "pending");
    try {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      if (error) {
        updateCheck("Supabase connection", "fail", error.message);
      } else {
        updateCheck("Supabase connection", "pass", "Connected");
      }
    } catch (e) {
      updateCheck("Supabase connection", "fail", `${e}`);
    }

    // 3. Auth status
    updateCheck("Auth session", "pending");
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        updateCheck("Auth session", "fail", error.message);
      } else if (user) {
        updateCheck("Auth session", "pass", `Logged in as ${user.email}`);
      } else {
        updateCheck("Auth session", "fail", "No active session (not logged in)");
      }
    } catch (e) {
      updateCheck("Auth session", "fail", `${e}`);
    }

    // 4. Check each table exists
    for (const table of TABLES) {
      updateCheck(`Table: ${table}`, "pending");
      try {
        const { error } = await supabase.from(table).select("*").limit(0);
        if (error) {
          updateCheck(`Table: ${table}`, "fail", error.message);
        } else {
          updateCheck(`Table: ${table}`, "pass", "Exists");
        }
      } catch (e) {
        updateCheck(`Table: ${table}`, "fail", `${e}`);
      }
    }

    // 5. Storage bucket
    updateCheck("Storage: wine-labels bucket", "pending");
    try {
      const { data, error } = await supabase.storage.from("wine-labels").list("", { limit: 1 });
      if (error) {
        updateCheck("Storage: wine-labels bucket", "fail", error.message);
      } else {
        updateCheck("Storage: wine-labels bucket", "pass", `Bucket exists (${data?.length ?? 0} items sampled)`);
      }
    } catch (e) {
      updateCheck("Storage: wine-labels bucket", "fail", `${e}`);
    }

    // 6. Claude API test
    updateCheck("Anthropic API", "pending");
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data.anthropicApiKey) {
        updateCheck("Anthropic API", "pass", "API key configured (not tested live to save credits)");
      } else {
        updateCheck("Anthropic API", "fail", "ANTHROPIC_API_KEY not set");
      }
    } catch (e) {
      updateCheck("Anthropic API", "fail", `${e}`);
    }

    setRunning(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const pendingCount = checks.filter((c) => c.status === "pending").length;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "32px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px", color: "#2D241B" }}>
        Racked Diagnostics
      </h1>
      <p style={{ fontSize: "14px", color: "#8C7E72", marginBottom: "24px" }}>
        System health checks for database, auth, storage, and API
      </p>

      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
        <div style={{ padding: "12px 20px", borderRadius: "12px", background: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }}>
          {passCount} passed
        </div>
        <div style={{ padding: "12px 20px", borderRadius: "12px", background: failCount > 0 ? "#ffebee" : "#f5f5f5", color: failCount > 0 ? "#c62828" : "#999", fontWeight: 600 }}>
          {failCount} failed
        </div>
        {pendingCount > 0 && (
          <div style={{ padding: "12px 20px", borderRadius: "12px", background: "#fff3e0", color: "#e65100", fontWeight: 600 }}>
            {pendingCount} running...
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {checks.map((check) => (
          <div
            key={check.name}
            style={{
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#fff",
              border: `1px solid ${
                check.status === "pass" ? "#c8e6c9" : check.status === "fail" ? "#ffcdd2" : "#ffe0b2"
              }`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>
                {check.status === "pass" ? "\u2705" : check.status === "fail" ? "\u274c" : "\u23f3"}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "#2D241B" }}>{check.name}</div>
                {check.detail && (
                  <div style={{ fontSize: "12px", color: "#8C7E72", marginTop: "2px", wordBreak: "break-all" }}>
                    {check.detail}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={runChecks}
        disabled={running}
        style={{
          marginTop: "24px",
          padding: "14px 28px",
          background: running ? "#ccc" : "#722F37",
          color: "#fff",
          border: "none",
          borderRadius: "14px",
          fontSize: "15px",
          fontWeight: 600,
          cursor: running ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        {running ? "Running checks..." : "Re-run All Checks"}
      </button>

      <div style={{ marginTop: "32px", padding: "16px", background: "#f5f3ef", borderRadius: "12px" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#2D241B", marginBottom: "8px" }}>
          Setup Checklist
        </h3>
        <ol style={{ fontSize: "13px", color: "#6B5E52", lineHeight: 1.8, paddingLeft: "20px", margin: 0 }}>
          <li>Run <code>supabase/schema.sql</code> in Supabase SQL Editor</li>
          <li>Configure Google OAuth in Supabase Auth settings</li>
          <li>Add env vars to Vercel project settings</li>
          <li>Set Site URL in Supabase Auth to your Vercel domain</li>
          <li>Add Vercel domain to Supabase Auth redirect URLs</li>
        </ol>
      </div>
    </div>
  );
}
