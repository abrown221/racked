"use client";

import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { id: "tonight", icon: "◑", label: "Tonight", path: "/tonight" },
  { id: "cellar", icon: "▦", label: "Cellar", path: "/cellar" },
  { id: "camera", icon: "◉", label: "", path: "/camera" },
  { id: "wishlist", icon: "♡", label: "Wish List", path: "/wishlist" },
  { id: "profile", icon: "◎", label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#FAF7F2f0] backdrop-blur-xl border-t border-[var(--color-border)] z-50">
      <div className="flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom,8px)] pt-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          const isCamera = tab.id === "camera";

          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 border-none bg-transparent cursor-pointer transition-colors ${
                isCamera ? "-mt-5" : ""
              }`}
            >
              <span
                className={`${isCamera ? "text-3xl" : "text-xl"} transition-colors`}
                style={{
                  color: isCamera
                    ? "var(--color-accent)"
                    : isActive
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                  ...(isCamera
                    ? {
                        width: 56,
                        height: 56,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, var(--color-accent), var(--color-accent-light))",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(114,47,55,0.4)",
                        fontSize: 24,
                      }
                    : {}),
                }}
              >
                {tab.icon}
              </span>
              {tab.label && (
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: isActive
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                  }}
                >
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
