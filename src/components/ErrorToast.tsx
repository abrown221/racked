"use client";

import { useCellar } from "@/hooks/useCellar";

export default function ErrorToast() {
  const { error, clearError } = useCellar();

  if (!error) return null;

  return (
    <div
      className="fixed z-[300] max-w-[430px] mx-auto"
      style={{
        top: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 40px)",
      }}
    >
      <div
        className="flex items-start gap-3"
        style={{
          background: "#9B3333",
          color: "#FFFFFF",
          borderRadius: "14px",
          padding: "14px 16px",
          fontSize: "13px",
          boxShadow: "0 8px 32px rgba(155,51,51,0.3)",
        }}
      >
        <div className="flex-1" style={{ lineHeight: 1.5 }}>
          {error}
        </div>
        <button
          onClick={clearError}
          className="cursor-pointer shrink-0"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.7)",
            fontSize: "18px",
            padding: "0 4px",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
