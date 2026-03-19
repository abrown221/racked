"use client";

import { useCellar } from "@/hooks/useCellar";

export default function WishlistPage() {
  const { wishlist, loading, removeWishlistItem } = useCellar();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-[var(--color-text-muted)]">
        <div className="animate-pulse-slow">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fade-in px-5 pt-5 pb-24">
      <h1 className="font-serif text-[30px] font-bold mb-1">Wish List</h1>
      <div className="text-[13px] text-[var(--color-text-muted)] mb-7">
        {wishlist.length} wine{wishlist.length !== 1 ? "s" : ""} to find
      </div>

      {wishlist.length > 0 ? (
        <div className="flex flex-col gap-2">
          {wishlist.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-[15px] font-semibold">
                    {item.name}
                  </div>
                  {item.vintage && (
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {item.vintage}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeWishlistItem(item.id)}
                  className="text-[var(--color-text-muted)] bg-transparent border-none text-lg cursor-pointer ml-2 hover:text-[var(--color-status-red)]"
                >
                  ×
                </button>
              </div>
              {item.context && (
                <div className="text-[13px] text-[var(--color-text-secondary)] mt-2 leading-relaxed">
                  {item.context}
                </div>
              )}
              <div className="flex items-center gap-2 mt-2.5">
                {item.source && (
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2 py-0.5 rounded-full">
                    {item.source}
                  </span>
                )}
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  Added {item.date_added}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <div className="text-5xl mb-4">♡</div>
          <div className="font-serif text-xl text-[var(--color-text-primary)] mb-2">
            No wish list yet
          </div>
          <div className="text-sm leading-relaxed">
            Scan a wine book page or shop shelf to discover wines you want to
            try
          </div>
        </div>
      )}
    </div>
  );
}
