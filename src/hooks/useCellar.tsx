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
  Cellar,
} from "@/lib/supabase/types";

type CellarContextType = {
  cellar: Cellar | null;
  wines: Wine[];
  fridges: Fridge[];
  wishlist: WishlistItem[];
  dossiers: Record<string, Dossier>;
  loading: boolean;
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
};

const CellarContext = createContext<CellarContextType | null>(null);

export function CellarProvider({ children }: { children: ReactNode }) {
  const [cellar, setCellar] = useState<Cellar | null>(null);
  const [wines, setWines] = useState<Wine[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [dossiers, setDossiers] = useState<Record<string, Dossier>>({});
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

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
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          display_name:
            user.user_metadata?.full_name || user.email?.split("@")[0],
        },
        { onConflict: "id" }
      );

      // Get user's cellar membership
      let { data: membership } = await supabase
        .from("cellar_members")
        .select("cellar_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      // Auto-create cellar if none exists
      if (!membership) {
        const { data: newCellar } = await supabase
          .from("cellars")
          .insert({ owner_id: user.id, name: "My Cellar" })
          .select("id")
          .single();

        if (newCellar) {
          await supabase.from("cellar_members").insert({
            cellar_id: newCellar.id,
            user_id: user.id,
            role: "owner",
            accepted_at: new Date().toISOString(),
          });
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

      // Load dossiers for wines (separate query to avoid nested async)
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
        const { error } = await supabase.storage
          .from("wine-labels")
          .upload(path, photoFile, { contentType: "image/jpeg" });

        if (!error) {
          photo_path = path;
          const {
            data: { publicUrl },
          } = supabase.storage.from("wine-labels").getPublicUrl(path);
          photo_url = publicUrl;
        }
      }

      const { data, error } = await supabase
        .from("wines")
        .insert({
          ...wine,
          cellar_id: cellar.id,
          photo_url,
          photo_path,
        })
        .select()
        .single();

      if (data) {
        setWines((prev) => [data, ...prev]);
        return data;
      }
      if (error) console.error("addWine error:", error);
      return null;
    },
    [cellar]
  );

  const updateWine = useCallback(
    async (id: string, updates: Partial<Wine>) => {
      const { error } = await supabase
        .from("wines")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        setWines((prev) =>
          prev.map((w) => (w.id === id ? { ...w, ...updates } : w))
        );
      }
    },
    []
  );

  const addFridge = useCallback(
    async (fridge: Partial<Fridge>) => {
      if (!cellar) return;
      const { data } = await supabase
        .from("fridges")
        .insert({ ...fridge, cellar_id: cellar.id })
        .select()
        .single();
      if (data) setFridges((prev) => [...prev, data]);
    },
    [cellar]
  );

  const updateFridge = useCallback(
    async (id: string, updates: Partial<Fridge>) => {
      const { error } = await supabase
        .from("fridges")
        .update(updates)
        .eq("id", id);
      if (!error) {
        setFridges((prev) =>
          prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
      }
    },
    []
  );

  const deleteFridge = useCallback(
    async (id: string) => {
      await supabase
        .from("wines")
        .update({ fridge_id: null })
        .eq("fridge_id", id);
      await supabase.from("fridges").delete().eq("id", id);
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
      const { data } = await supabase
        .from("wishlist")
        .insert({ ...item, cellar_id: cellar.id })
        .select()
        .single();
      if (data) setWishlist((prev) => [data, ...prev]);
    },
    [cellar]
  );

  const removeWishlistItem = useCallback(async (id: string) => {
    await supabase.from("wishlist").delete().eq("id", id);
    setWishlist((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const saveDossier = useCallback(
    async (wineId: string, dossier: Partial<Dossier>) => {
      const { data } = await supabase
        .from("dossiers")
        .upsert({ ...dossier, wine_id: wineId }, { onConflict: "wine_id" })
        .select()
        .single();
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

  return (
    <CellarContext.Provider
      value={{
        cellar,
        wines,
        fridges,
        wishlist,
        dossiers,
        loading,
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
