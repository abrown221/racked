"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCellar } from "@/hooks/useCellar";
import { FRIDGE_TYPES } from "@/lib/constants";
import type { Fridge } from "@/lib/supabase/types";

export default function ProfilePage() {
  const {
    wines,
    fridges,
    wishlist,
    loading,
    addFridge,
    updateFridge,
    deleteFridge,
  } = useCellar();
  const router = useRouter();

  const [showAddFridge, setShowAddFridge] = useState(false);
  const [editingFridge, setEditingFridge] = useState<Fridge | null>(null);
  const [fridgeName, setFridgeName] = useState("");
  const [fridgeCapacity, setFridgeCapacity] = useState("");
  const [fridgeType, setFridgeType] = useState<string>("cellar");

  const activeWines = wines.filter((w) => w.status !== "consumed");
  const consumedWines = wines.filter((w) => w.status === "consumed");

  const handleSaveFridge = async () => {
    if (!fridgeName.trim()) return;

    if (editingFridge) {
      await updateFridge(editingFridge.id, {
        name: fridgeName.trim(),
        capacity: parseInt(fridgeCapacity) || 0,
        type: fridgeType as Fridge["type"],
      });
    } else {
      await addFridge({
        name: fridgeName.trim(),
        capacity: parseInt(fridgeCapacity) || 0,
        type: fridgeType as Fridge["type"],
      });
    }

    setShowAddFridge(false);
    setEditingFridge(null);
    setFridgeName("");
    setFridgeCapacity("");
    setFridgeType("cellar");
  };

  const handleEditFridge = (fridge: Fridge) => {
    setEditingFridge(fridge);
    setFridgeName(fridge.name);
    setFridgeCapacity(fridge.capacity > 0 ? String(fridge.capacity) : "");
    setFridgeType(fridge.type);
    setShowAddFridge(true);
  };

  const handleDeleteFridge = async (id: string) => {
    if (confirm("Remove this fridge? Wines assigned to it will become unassigned.")) {
      await deleteFridge(id);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

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
          marginBottom: "28px",
          lineHeight: 1.15,
        }}
      >
        Profile
      </h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3" style={{ marginBottom: "32px" }}>
        {[
          { label: "Total Bottles", value: activeWines.length },
          {
            label: "Capacity",
            value: fridges.reduce((sum, f) => sum + f.capacity, 0) || "—",
          },
          { label: "Wines Drank", value: consumedWines.length },
          { label: "Wish List", value: wishlist.length },
        ].map((stat) => (
          <div
            key={stat.label}
            className="text-center"
            style={{
              background: "#FFFFFF",
              border: "1px solid #DDD5CA",
              borderRadius: "14px",
              padding: "16px",
              boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
            }}
          >
            <div
              className="font-serif font-bold"
              style={{ fontSize: "26px", color: "#A0864E" }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: "11px", color: "#8C7E72", marginTop: "4px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Fridges */}
      <div style={{ marginBottom: "32px" }}>
        <div className="flex justify-between items-center" style={{ marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#8C7E72",
            }}
          >
            Your Fridges
          </div>
          <button
            onClick={() => {
              setEditingFridge(null);
              setFridgeName("");
              setFridgeCapacity("");
              setFridgeType("cellar");
              setShowAddFridge(true);
            }}
            className="cursor-pointer"
            style={{
              fontSize: "12px",
              color: "#A0864E",
              background: "transparent",
              border: "none",
              fontWeight: 600,
            }}
          >
            + Add Fridge
          </button>
        </div>

        {fridges.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {fridges.map((fridge) => {
              const count = activeWines.filter(
                (w) => w.fridge_id === fridge.id
              ).length;
              const pct =
                fridge.capacity > 0 ? (count / fridge.capacity) * 100 : 0;
              const barColor =
                pct > 90
                  ? "#9B3333"
                  : pct > 70
                    ? "#A07830"
                    : "#5A7A4A";

              return (
                <div
                  key={fridge.id}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid #DDD5CA",
                    borderRadius: "16px",
                    padding: "16px",
                    boxShadow: "0 2px 12px rgba(45,36,27,0.06)",
                  }}
                >
                  <div className="flex justify-between items-start" style={{ marginBottom: "10px" }}>
                    <div>
                      <div className="font-semibold" style={{ fontSize: "14px", color: "#2D241B" }}>
                        {fridge.name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#8C7E72", marginTop: "2px" }}>
                        {FRIDGE_TYPES.find((t) => t.value === fridge.type)
                          ?.label || fridge.type}
                        {fridge.capacity > 0 &&
                          ` · ${fridge.capacity} bottle capacity`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditFridge(fridge)}
                        className="cursor-pointer"
                        style={{
                          color: "#8C7E72",
                          background: "transparent",
                          border: "none",
                          fontSize: "14px",
                          padding: "4px",
                        }}
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteFridge(fridge.id)}
                        className="cursor-pointer transition-colors duration-150"
                        style={{
                          color: "#8C7E72",
                          background: "transparent",
                          border: "none",
                          fontSize: "16px",
                          padding: "4px",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "#9B3333";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color = "#8C7E72";
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="font-serif font-bold"
                      style={{ fontSize: "26px", color: "#A0864E" }}
                    >
                      {count}
                    </div>
                    {fridge.capacity > 0 && (
                      <div className="flex-1">
                        <div
                          className="overflow-hidden"
                          style={{
                            height: "8px",
                            background: "#F0EBE3",
                            borderRadius: "100px",
                          }}
                        >
                          <div
                            className="transition-all duration-300"
                            style={{
                              height: "100%",
                              borderRadius: "100px",
                              width: `${Math.min(pct, 100)}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: "10px", color: "#8C7E72", marginTop: "4px" }}>
                          {count} / {fridge.capacity}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            onClick={() => setShowAddFridge(true)}
            className="text-center cursor-pointer"
            style={{
              padding: "40px 20px",
              color: "#8C7E72",
              border: "1px dashed #DDD5CA",
              borderRadius: "16px",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🧊</div>
            No fridges yet — Tap to add your first wine fridge
          </div>
        )}
      </div>

      {/* Varietal breakdown */}
      {activeWines.length > 0 && (
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "1.5px",
              color: "#8C7E72",
              marginBottom: "16px",
            }}
          >
            Cellar by Varietal
          </div>
          <div className="flex flex-col gap-1.5">
            {Object.entries(
              activeWines.reduce(
                (acc, w) => {
                  const v = w.varietal || "Unknown";
                  acc[v] = (acc[v] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              )
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([varietal, count]) => (
                <div
                  key={varietal}
                  className="flex justify-between items-center"
                  style={{
                    background: "#F0EBE3",
                    borderRadius: "10px",
                    padding: "10px 14px",
                  }}
                >
                  <span style={{ fontSize: "14px", color: "#2D241B" }}>{varietal}</span>
                  <span
                    className="font-semibold"
                    style={{ fontSize: "14px", color: "#A0864E" }}
                  >
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full cursor-pointer"
        style={{
          padding: "14px",
          background: "transparent",
          border: "1px solid #DDD5CA",
          borderRadius: "14px",
          color: "#8C7E72",
          fontSize: "14px",
        }}
      >
        Sign Out
      </button>

      {/* Add/Edit Fridge Modal */}
      {showAddFridge && (
        <div
          className="fixed inset-0 z-[200] flex flex-col justify-end max-w-[430px] mx-auto"
          style={{
            background: "rgba(45,36,27,0.5)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <div
            style={{
              background: "#FAF7F2",
              borderRadius: "28px 28px 0 0",
              padding: "28px 24px 40px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "4px",
                background: "#DDD5CA",
                borderRadius: "100px",
                margin: "0 auto 24px",
              }}
            />

            <h2
              className="font-serif font-bold"
              style={{ fontSize: "22px", color: "#2D241B", marginBottom: "24px" }}
            >
              {editingFridge ? "Edit Fridge" : "Add Fridge"}
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
                Name
              </div>
              <input
                value={fridgeName}
                onChange={(e) => setFridgeName(e.target.value)}
                placeholder="e.g. Kitchen, Basement Left"
                style={{
                  width: "100%",
                  background: "#FFFFFF",
                  border: "1px solid #DDD5CA",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  color: "#2D241B",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
                Bottle Capacity (optional)
              </div>
              <input
                type="number"
                value={fridgeCapacity}
                onChange={(e) => setFridgeCapacity(e.target.value)}
                placeholder="Leave blank if you don't want to track"
                style={{
                  width: "100%",
                  background: "#FFFFFF",
                  border: "1px solid #DDD5CA",
                  borderRadius: "14px",
                  padding: "12px 16px",
                  color: "#2D241B",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "28px" }}>
              <div style={{ fontSize: "12px", color: "#8C7E72", marginBottom: "8px" }}>
                Type
              </div>
              <div className="flex gap-2">
                {FRIDGE_TYPES.map((t) => {
                  const active = fridgeType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setFridgeType(t.value)}
                      className="flex-1 text-center cursor-pointer transition-all duration-150"
                      style={{
                        padding: "12px 8px",
                        borderRadius: "14px",
                        fontSize: "12px",
                        border: `1px solid ${active ? "#722F37" : "#DDD5CA"}`,
                        background: active ? "rgba(114,47,55,0.12)" : "transparent",
                        color: active ? "#722F37" : "#8C7E72",
                      }}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div style={{ fontSize: "10px", marginTop: "2px", opacity: 0.7 }}>
                        {t.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddFridge(false);
                  setEditingFridge(null);
                }}
                className="flex-1 cursor-pointer"
                style={{
                  padding: "14px",
                  background: "transparent",
                  border: "1px solid #DDD5CA",
                  borderRadius: "14px",
                  color: "#6B5E52",
                  fontSize: "15px",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFridge}
                className="font-semibold cursor-pointer"
                style={{
                  flex: 2,
                  padding: "14px",
                  background: "#722F37",
                  border: "none",
                  borderRadius: "14px",
                  color: "#FFFFFF",
                  fontSize: "15px",
                  boxShadow: "0 4px 16px rgba(114,47,55,0.25)",
                }}
              >
                {editingFridge ? "Save Changes" : "Add Fridge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
