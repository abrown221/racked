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
      <div className="flex items-center justify-center min-h-screen text-[var(--color-text-muted)]">
        <div className="animate-pulse-slow">Loading...</div>
      </div>
    );
  }

  return (
    <div className="fade-in px-5 pt-5 pb-24">
      <h1 className="font-serif text-[30px] font-bold mb-6">Profile</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-8">
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
            className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 text-center"
          >
            <div className="text-2xl font-bold text-[var(--color-gold)] font-serif">
              {stat.value}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)] mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Fridges */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-text-muted)]">
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
            className="text-xs text-[var(--color-gold)] bg-transparent border-none cursor-pointer"
          >
            + Add Fridge
          </button>
        </div>

        {fridges.length > 0 ? (
          <div className="flex flex-col gap-2">
            {fridges.map((fridge) => {
              const count = activeWines.filter(
                (w) => w.fridge_id === fridge.id
              ).length;
              const pct =
                fridge.capacity > 0 ? (count / fridge.capacity) * 100 : 0;
              const barColor =
                pct > 90
                  ? "var(--color-status-red)"
                  : pct > 70
                    ? "var(--color-status-amber)"
                    : "var(--color-status-green)";

              return (
                <div
                  key={fridge.id}
                  className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold text-sm">{fridge.name}</div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">
                        {FRIDGE_TYPES.find((t) => t.value === fridge.type)
                          ?.label || fridge.type}
                        {fridge.capacity > 0 &&
                          ` · ${fridge.capacity} bottle capacity`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditFridge(fridge)}
                        className="text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer text-sm"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDeleteFridge(fridge.id)}
                        className="text-[var(--color-text-muted)] bg-transparent border-none cursor-pointer text-sm hover:text-[var(--color-status-red)]"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-[var(--color-gold)] font-serif">
                      {count}
                    </div>
                    {fridge.capacity > 0 && (
                      <div className="flex-1">
                        <div className="h-2 bg-[var(--color-surface)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(pct, 100)}%`,
                              background: barColor,
                            }}
                          />
                        </div>
                        <div className="text-[10px] text-[var(--color-text-muted)] mt-1">
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
            className="text-center py-10 text-[var(--color-text-muted)] cursor-pointer border border-dashed border-[var(--color-border)] rounded-xl"
          >
            <div className="text-3xl mb-2">🧊</div>
            No fridges yet — Tap to add your first wine fridge
          </div>
        )}
      </div>

      {/* Varietal breakdown */}
      {activeWines.length > 0 && (
        <div className="mb-8">
          <div className="text-[11px] uppercase tracking-[1.5px] text-[var(--color-text-muted)] mb-4">
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
                  className="flex justify-between items-center bg-[var(--color-surface)] rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{varietal}</span>
                  <span className="text-sm font-semibold text-[var(--color-gold)]">
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
        className="w-full py-3 bg-transparent border border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] text-sm cursor-pointer"
      >
        Sign Out
      </button>

      {/* Add/Edit Fridge Modal */}
      {showAddFridge && (
        <div className="fixed inset-0 z-[200] bg-[var(--color-overlay)] backdrop-blur-[20px] flex flex-col justify-end max-w-[430px] mx-auto">
          <div className="bg-[var(--color-surface)] rounded-t-3xl px-6 pt-7 pb-10">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-5" />

            <h2 className="font-serif text-[22px] font-bold mb-6">
              {editingFridge ? "Edit Fridge" : "Add Fridge"}
            </h2>

            <div className="mb-5">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">
                Name
              </div>
              <input
                value={fridgeName}
                onChange={(e) => setFridgeName(e.target.value)}
                placeholder="e.g. Kitchen, Basement Left"
                className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm"
              />
            </div>

            <div className="mb-5">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">
                Bottle Capacity (optional)
              </div>
              <input
                type="number"
                value={fridgeCapacity}
                onChange={(e) => setFridgeCapacity(e.target.value)}
                placeholder="Leave blank if you don't want to track"
                className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] text-sm"
              />
            </div>

            <div className="mb-7">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">
                Type
              </div>
              <div className="flex gap-2">
                {FRIDGE_TYPES.map((t) => {
                  const active = fridgeType === t.value;
                  return (
                    <button
                      key={t.value}
                      onClick={() => setFridgeType(t.value)}
                      className="flex-1 py-3 px-2 rounded-xl text-xs cursor-pointer border text-center"
                      style={{
                        background: active
                          ? "rgba(114,47,55,0.22)"
                          : "transparent",
                        borderColor: active
                          ? "var(--color-accent)"
                          : "var(--color-border)",
                        color: active
                          ? "var(--color-accent-light)"
                          : "var(--color-text-muted)",
                      }}
                    >
                      <div className="font-medium">{t.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">
                        {t.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={() => {
                  setShowAddFridge(false);
                  setEditingFridge(null);
                }}
                className="flex-1 py-3.5 bg-transparent border border-[var(--color-border)] rounded-xl text-[var(--color-text-muted)] text-[15px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFridge}
                className="flex-[2] py-3.5 bg-[var(--color-accent)] border-none rounded-xl text-white text-[15px] font-semibold cursor-pointer"
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
