"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Wine,
  Fridge,
  WishlistItem,
  Dossier,
  TastingNote,
  Cellar,
} from "@/lib/supabase/types";

type TastingNoteInput = {
  rating: number;
  tags: string[];
  buyAgain: string | null;
  notes: string;
};

type CellarContextType = {
  cellar: Cellar | null;
  wines: Wine[];
  fridges: Fridge[];
  wishlist: WishlistItem[];
  dossiers: Record<string, Dossier>;
  tastingNotes: Record<string, TastingNote[]>;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refreshWines: () => Promise<void>;
  refreshFridges: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  addWine: (wine: Partial<Wine>, photoFile?: File) => Promise<Wine | null>;
  updateWine: (id: string, updates: Partial<Wine>) => Promise<void>;
  addFridge: (fridge: Partial<Fridge>) => Promise<void>;
  updateFridge: (id: string, updates: Partial<Fridge>) => Promise<void>;
  deleteFridge: (id: string) => Promise<void>;
  addWishlistItem: (item: Partial<WishlistItem>) => Promise<void>;
  removeWishlistItem: (id: string) => Promise<void>;
  saveDossier: (wineId: string, dossier: Partial<Dossier>) => Promise<void>;
  getDossier: (wineId: string) => Dossier | undefined;
  saveTastingNote: (wineId: string, data: TastingNoteInput) => Promise<void>;
  loadTastingNotes: (wineId: string) => Promise<void>;
};

const CellarContext = createContext<CellarContextType | null>(null);

export function CellarProvider({ children }: { children: ReactNode }) {
  const [cellar, setCellar] = useState<Cellar | null>(null);
  const [wines, setWines] = useState<Wine[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [dossiers, setDossiers] = useState<Record<string, Dossier>>({});
  const [tastingNotes, setTastingNotes] = useState<Record<string, TastingNote[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const showError = (msg: string) => {
    console.error(msg);
    setError(msg);
    // Auto-clear after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Ensure profile exists
      const { error: profileErr } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          display_name:
            user.user_metadata?.full_name || user.email?.split("@")[0],
        },
        { onConflict: "id" }
      );
      if (profileErr) showError(`Profile setup failed: ${profileErr.message}`);

      // Get user's cellar membership
      let { data: membership } = await supabase
        .from("cellar_members")
        .select("cellar_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      // Auto-create cellar if none exists
      if (!membership) {
        const { data: newCellar, error: cellarErr } = await supabase
          .from("cellars")
          .insert({ owner_id: user.id, name: "My Cellar" })
          .select("id")
          .single();

        if (cellarErr) {
          showError(`Cellar creation failed: ${cellarErr.message}`);
          setLoading(false);
          return;
        }

        if (newCellar) {
          const { error: memberErr } = await supabase.from("cellar_members").insert({
            cellar_id: newCellar.id,
            user_id: user.id,
            role: "owner",
            accepted_at: new Date().toISOString(),
          });
          if (memberErr) showError(`Membership setup failed: ${memberErr.message}`);
          membership = { cellar_id: newCellar.id };
        }
      }

      if (!membership) {
        setLoading(false);
        return;
      }

      const cellarId = membership.cellar_id;

      // Load cellar
      const { data: cellarData } = await supabase
        .from("cellars")
        .select("*")
        .eq("id", cellarId)
        .single();

      if (cellarData) setCellar(cellarData);

      // Load wines, fridges, wishlist in parallel
      const [winesRes, fridgesRes, wishlistRes] = await Promise.all([
        supabase
          .from("wines")
          .select("*")
          .eq("cellar_id", cellarId)
          .order("created_at", { ascending: false }),
        supabase
          .from("fridges")
          .select("*")
          .eq("cellar_id", cellarId)
          .order("sort_order"),
        supabase
          .from("wishlist")
          .select("*")
          .eq("cellar_id", cellarId)
          .order("created_at", { ascending: false }),
      ]);

      const loadedWines = winesRes.data || [];
      if (loadedWines.length > 0) setWines(loadedWines);
      if (fridgesRes.data) setFridges(fridgesRes.data);
      if (wishlistRes.data) setWishlist(wishlistRes.data);

      // Load dossiers for wines
      if (loadedWines.length > 0) {
        const wineIds = loadedWines.map((w) => w.id);
        const { data: dossiersData } = await supabase
          .from("dossiers")
          .select("*")
          .in("wine_id", wineIds);

        if (dossiersData) {
          const map: Record<string, Dossier> = {};
          dossiersData.forEach((d) => (map[d.wine_id] = d));
          setDossiers(map);
        }
      }

      setLoading(false);
    }
    load();
  }, []);

  const refreshWines = useCallback(async () => {
    if (!cellar) return;
    const { data } = await supabase
      .from("wines")
      .select("*")
      .eq("cellar_id", cellar.id)
      .order("created_at", { ascending: false });
    if (data) setWines(data);
  }, [cellar]);

  const refreshFridges = useCallback(async () => {
    if (!cellar) return;
    const { data } = await supabase
      .from("fridges")
      .select("*")
      .eq("cellar_id", cellar.id)
      .order("sort_order");
    if (data) setFridges(data);
  }, [cellar]);

  const refreshWishlist = useCallback(async () => {
    if (!cellar) return;
    const { data } = await supabase
      .from("wishlist")
      .select("*")
      .eq("cellar_id", cellar.id)
      .order("created_at", { ascending: false });
    if (data) setWishlist(data);
  }, [cellar]);

  const addWine = useCallback(
    async (wine: Partial<Wine>, photoFile?: File): Promise<Wine | null> => {
      if (!cellar) return null;

      let photo_url: string | null = null;
      let photo_path: string | null = null;

      if (photoFile) {
        const path = `${cellar.id}/${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("wine-labels")
          .upload(path, photoFile, { contentType: "image/jpeg" });

        if (uploadErr) {
          showError(`Photo upload failed: ${uploadErr.message}`);
        } else {
          photo_path = path;
          const {
            data: { publicUrl },
          } = supabase.storage.from("wine-labels").getPublicUrl(path);
          photo_url = publicUrl;
        }
      }

      const { data, error: insertErr } = await supabase
        .from("wines")
        .insert({
          ...wine,
          cellar_id: cellar.id,
          photo_url,
          photo_path,
        })
        .select()
        .single();

      if (insertErr) {
        showError(`Failed to add wine: ${insertErr.message}`);
        return null;
      }
      if (data) {
        setWines((prev) => [data, ...prev]);
        return data;
      }
      return null;
    },
    [cellar]
  );

  const updateWine = useCallback(
    async (id: string, updates: Partial<Wine>) => {
      const { error: updateErr } = await supabase
        .from("wines")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateErr) {
        showError(`Failed to update wine: ${updateErr.message}`);
        return;
      }
      setWines((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
      );
    },
    []
  );

  const addFridge = useCallback(
    async (fridge: Partial<Fridge>) => {
      if (!cellar) return;
      const { data, error: insertErr } = await supabase
        .from("fridges")
        .insert({ ...fridge, cellar_id: cellar.id })
        .select()
        .single();
      if (insertErr) {
        showError(`Failed to add fridge: ${insertErr.message}`);
        return;
      }
      if (data) setFridges((prev) => [...prev, data]);
    },
    [cellar]
  );

  const updateFridge = useCallback(
    async (id: string, updates: Partial<Fridge>) => {
      const { error: updateErr } = await supabase
        .from("fridges")
        .update(updates)
        .eq("id", id);
      if (updateErr) {
        showError(`Failed to update fridge: ${updateErr.message}`);
        return;
      }
      setFridges((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const deleteFridge = useCallback(
    async (id: string) => {
      const { error: unassignErr } = await supabase
        .from("wines")
        .update({ fridge_id: null })
        .eq("fridge_id", id);
      if (unassignErr) showError(`Failed to unassign wines: ${unassignErr.message}`);

      const { error: deleteErr } = await supabase.from("fridges").delete().eq("id", id);
      if (deleteErr) {
        showError(`Failed to delete fridge: ${deleteErr.message}`);
        return;
      }
      setFridges((prev) => prev.filter((f) => f.id !== id));
      setWines((prev) =>
        prev.map((w) => (w.fridge_id === id ? { ...w, fridge_id: null } : w))
      );
    },
    []
  );

  const addWishlistItem = useCallback(
    async (item: Partial<WishlistItem>) => {
      if (!cellar) return;
      const { data, error: insertErr } = await supabase
        .from("wishlist")
        .insert({ ...item, cellar_id: cellar.id })
        .select()
        .single();
      if (insertErr) {
        showError(`Failed to add to wishlist: ${insertErr.message}`);
        return;
      }
      if (data) setWishlist((prev) => [data, ...prev]);
    },
    [cellar]
  );

  const removeWishlistItem = useCallback(async (id: string) => {
    const { error: deleteErr } = await supabase.from("wishlist").delete().eq("id", id);
    if (deleteErr) {
      showError(`Failed to remove from wishlist: ${deleteErr.message}`);
      return;
    }
    setWishlist((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const saveDossier = useCallback(
    async (wineId: string, dossier: Partial<Dossier>) => {
      const { data, error: upsertErr } = await supabase
        .from("dossiers")
        .upsert({ ...dossier, wine_id: wineId }, { onConflict: "wine_id" })
        .select()
        .single();
      if (upsertErr) {
        showError(`Failed to save dossier: ${upsertErr.message}`);
        return;
      }
      if (data) {
        setDossiers((prev) => ({ ...prev, [wineId]: data }));
      }
    },
    []
  );

  const getDossier = useCallback(
    (wineId: string) => dossiers[wineId],
    [dossiers]
  );

  const saveTastingNote = useCallback(
    async (wineId: string, data: TastingNoteInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        showError("Must be logged in to save tasting notes");
        return;
      }

      const { data: note, error: insertErr } = await supabase
        .from("tasting_notes")
        .upsert(
          {
            wine_id: wineId,
            user_id: user.id,
            rating: data.rating || null,
            tags: data.tags.length > 0 ? data.tags : null,
            buy_again: data.buyAgain,
            notes: data.notes || null,
            tasted_date: new Date().toISOString().split("T")[0],
          },
          { onConflict: "wine_id,user_id,tasted_date" }
        )
        .select()
        .single();

      if (insertErr) {
        showError(`Failed to save tasting note: ${insertErr.message}`);
        return;
      }
      if (note) {
        setTastingNotes((prev) => ({
          ...prev,
          [wineId]: [...(prev[wineId] || []).filter((n) => n.id !== note.id), note],
        }));
      }
    },
    []
  );

  const loadTastingNotes = useCallback(
    async (wineId: string) => {
      const { data, error: fetchErr } = await supabase
        .from("tasting_notes")
        .select("*")
        .eq("wine_id", wineId)
        .order("tasted_date", { ascending: false });

      if (fetchErr) {
        showError(`Failed to load tasting notes: ${fetchErr.message}`);
        return;
      }
      if (data) {
        setTastingNotes((prev) => ({ ...prev, [wineId]: data }));
      }
    },
    []
  );

  return (
    <CellarContext.Provider
      value={{
        cellar,
        wines,
        fridges,
        wishlist,
        dossiers,
        tastingNotes,
        loading,
        error,
        clearError,
        refreshWines,
        refreshFridges,
        refreshWishlist,
        addWine,
        updateWine,
        addFridge,
        updateFridge,
        deleteFridge,
        addWishlistItem,
        removeWishlistItem,
        saveDossier,
        getDossier,
        saveTastingNote,
        loadTastingNotes,
      }}
    >
      {children}
    </CellarContext.Provider>
  );
}

export function useCellar() {
  const ctx = useContext(CellarContext);
  if (!ctx) throw new Error("useCellar must be used within CellarProvider");
  return ctx;
}
