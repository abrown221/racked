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
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{
        background: "rgba(250,247,242,0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(221,213,202,0.6)",
      }}
    >
      <div className="flex items-end justify-around px-1" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)", paddingTop: 6 }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.path;
          const isCamera = tab.id === "camera";

          if (isCamera) {
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.path)}
                className="flex flex-col items-center border-none bg-transparent cursor-pointer -mt-4 px-2"
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #722F37, #8E3A48)",
                    color: "#fff",
                    fontSize: 22,
                    boxShadow: "0 4px 20px rgba(114,47,55,0.45)",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                >
                  ◉
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-[3px] py-1 px-3 border-none bg-transparent cursor-pointer"
            >
              <span
                className="text-[20px] leading-none transition-colors duration-200"
                style={{
                  color: isActive ? "#722F37" : "#8C7E72",
                }}
              >
                {tab.icon}
              </span>
              <span
                className="text-[10px] font-medium leading-none transition-colors duration-200"
                style={{
                  color: isActive ? "#722F37" : "#8C7E72",
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
