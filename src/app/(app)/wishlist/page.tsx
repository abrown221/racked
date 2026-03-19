"use client";

import { useCellar } from "@/hooks/useCellar";

export default function WishlistPage() {
  const { wishlist, loading, removeWishlistItem } = useCellar();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ color: "#8C7E72" }}
      >
        <div className="animate-pulse-slow">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "24px 20px 112px" }}>
      <h1
        className="font-serif font-bold"
        style={{
          fontSize: "32px",
          color: "#2D241B",
          letterSpacing: "-0.3px",
          marginBottom: "4px",
          lineHeight: 1.15,
        }}
      >
        Wish List
      </h1>
      <div style={{ fontSize: "13px", color: "#8C7E72", marginBottom: "32px" }}>
        {wishlist.length} wine{wishlist.length !== 1 ? "s" : ""} to find
      </div>

      {wishlist.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {wishlist.map((item) => (
            <div
              key={item.id}
              style={{
                padding: "16px",
                background: "#FFFFFF",
                border: "1px solid #DDD5CA",
                borderRadius: "16px",
                boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div
                    className="font-serif font-semibold"
                    style={{ fontSize: "15px", color: "#2D241B" }}
                  >
                    {item.name}
                  </div>
                  {item.vintage && (
                    <div style={{ fontSize: "12px", color: "#8C7E72", marginTop: "2px" }}>
                      {item.vintage}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeWishlistItem(item.id)}
                  className="cursor-pointer transition-colors duration-150"
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "18px",
                    color: "#8C7E72",
                    marginLeft: "8px",
                    padding: "2px 6px",
                    borderRadius: "8px",
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#9B3333";
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(155,51,51,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#8C7E72";
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  ×
                </button>
              </div>
              {item.context && (
                <div
                  className="leading-relaxed"
                  style={{ fontSize: "13px", color: "#6B5E52", marginTop: "8px" }}
                >
                  {item.context}
                </div>
              )}
              <div className="flex items-center gap-2" style={{ marginTop: "10px" }}>
                {item.source && (
                  <span
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "#8C7E72",
                      background: "#F0EBE3",
                      padding: "3px 10px",
                      borderRadius: "100px",
                      fontWeight: 500,
                    }}
                  >
                    {item.source}
                  </span>
                )}
                <span style={{ fontSize: "11px", color: "#8C7E72" }}>
                  Added {item.date_added}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center" style={{ padding: "64px 20px", color: "#8C7E72" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.7 }}>♡</div>
          <div
            className="font-serif"
            style={{
              fontSize: "22px",
              color: "#2D241B",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            No wish list yet
          </div>
          <div
            className="leading-relaxed"
            style={{ fontSize: "14px", color: "#6B5E52" }}
          >
            Scan a wine book page or shop shelf to discover wines you want to
            try
          </div>
        </div>
      )}
    </div>
  );
}
