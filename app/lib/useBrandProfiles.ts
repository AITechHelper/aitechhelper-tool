"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "@clerk/nextjs";

// Safely parse JSON from a fetch response — returns null if the response is not JSON (e.g. HTML error page)
async function safeJson(res: Response): Promise<any> {
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export type BrandProfile = {
  id: string;
  name: string;
  niche: string;
  audience: string;
  tone: string;
  captionLength: "Short" | "Medium" | "Long";
  hashtagCount: number;
  imageStyle: string;
  primaryColor: string;
  secondaryColor: string;
  createdAt: string;
};

const PROFILES_KEY = "ath_profiles";
const ACTIVE_BRAND_KEY = "ath_active_brand_profile";
const MIGRATED_KEY = "ath_profiles_migrated";

export type UseBrandProfilesReturn = {
  profiles: BrandProfile[];
  activeProfileId: string | null;
  isLoading: boolean;
  error?: string;
  createProfile: (
    data: Omit<BrandProfile, "id" | "createdAt">
  ) => Promise<BrandProfile | null>;
  updateProfile: (
    id: string,
    data: Partial<BrandProfile>
  ) => Promise<BrandProfile | null>;
  deleteProfile: (id: string) => Promise<boolean>;
  setActiveProfile: (id: string) => Promise<boolean>;
  clearActiveProfile: () => Promise<boolean>;
  refetch: () => Promise<void>;
};

// Sync profiles list to localStorage
function syncProfilesToLocal(profiles: BrandProfile[]) {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {}
}

// Sync active profile to localStorage (full profile data for other pages)
function syncActiveToLocal(
  profile: BrandProfile | null,
  profiles: BrandProfile[]
) {
  try {
    if (!profile) {
      localStorage.removeItem(ACTIVE_BRAND_KEY);
      return;
    }
    const activeBrandData = {
      profileId: profile.id,
      profileName: profile.name,
      niche: profile.niche,
      audience: profile.audience,
      tone: profile.tone,
      captionLength: profile.captionLength,
      hashtagCount: profile.hashtagCount,
      imageStyle: profile.imageStyle,
      primaryColor: profile.primaryColor,
      secondaryColor: profile.secondaryColor,
    };
    localStorage.setItem(ACTIVE_BRAND_KEY, JSON.stringify(activeBrandData));
  } catch {}
}

// Sync ath_form with active profile data (generator reads this)
function syncFormWithProfile(profile: BrandProfile) {
  try {
    const formData = {
      niche: profile.niche,
      audience: profile.audience,
      tone: profile.tone,
      captionLength: profile.captionLength,
      hashtagCount: profile.hashtagCount,
      imageStyle: profile.imageStyle,
      primaryColor: profile.primaryColor,
      secondaryColor: profile.secondaryColor,
      postType: "Basic Post",
      specificRequest: "",
    };
    localStorage.setItem("ath_form", JSON.stringify(formData));
  } catch {}
}

export function useBrandProfiles(): UseBrandProfilesReturn {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const hasFetched = useRef(false);

  // Load from localStorage immediately for instant UI, then fetch from DB
  useEffect(() => {
    // Load cached profiles from localStorage for instant display
    try {
      const cached = localStorage.getItem(PROFILES_KEY);
      if (cached) {
        setProfiles(JSON.parse(cached));
      }
      const cachedActive = localStorage.getItem(ACTIVE_BRAND_KEY);
      if (cachedActive) {
        const data = JSON.parse(cachedActive);
        setActiveProfileId(data.profileId || null);
      }
    } catch {}
  }, []);

  // Fetch from DB once Clerk user is loaded
  useEffect(() => {
    if (!isUserLoaded) return;
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function fetchFromDB() {
      try {
        const res = await fetch("/api/brand-profiles");
        if (!res.ok) throw new Error("Failed to fetch profiles");
        const data = await safeJson(res);
        if (!data) throw new Error("Failed to fetch profiles");

        const dbProfiles: BrandProfile[] = data.profiles || [];
        const dbActiveId: string | null = data.activeProfileId || null;

        // Check if migration needed (DB empty, localStorage has profiles)
        if (dbProfiles.length === 0) {
          const migrated = localStorage.getItem(MIGRATED_KEY);
          if (!migrated) {
            const localProfiles = localStorage.getItem(PROFILES_KEY);
            if (localProfiles) {
              const parsed = JSON.parse(localProfiles) as BrandProfile[];
              if (parsed.length > 0) {
                await migrateProfiles(parsed);
                return; // migrateProfiles calls refetch
              }
            }
            // Mark migrated even if no local profiles (nothing to migrate)
            localStorage.setItem(MIGRATED_KEY, "1");
          }
        }

        // Update state with DB data
        setProfiles(dbProfiles);
        setActiveProfileId(dbActiveId);

        // Sync back to localStorage
        syncProfilesToLocal(dbProfiles);
        if (dbActiveId) {
          const activeProfile = dbProfiles.find((p) => p.id === dbActiveId);
          syncActiveToLocal(activeProfile || null, dbProfiles);
        } else {
          syncActiveToLocal(null, dbProfiles);
        }
      } catch (err) {
        console.error("Error fetching brand profiles:", err);
        setError("Failed to load profiles");
        // localStorage data remains as fallback
      } finally {
        setIsLoading(false);
      }
    }

    fetchFromDB();
  }, [user?.id, isUserLoaded]);

  // Migration: push localStorage profiles to DB
  async function migrateProfiles(localProfiles: BrandProfile[]) {
    try {
      for (const profile of localProfiles.slice(0, 5)) {
        await fetch("/api/brand-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
      }

      // Migrate active profile
      const localActive = localStorage.getItem(ACTIVE_BRAND_KEY);
      if (localActive) {
        const activeData = JSON.parse(localActive);
        if (activeData.profileId) {
          await fetch("/api/brand-profiles/active", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profileId: activeData.profileId }),
          });
        }
      }

      localStorage.setItem(MIGRATED_KEY, "1");

      // Refetch from DB to get canonical data
      hasFetched.current = false;
      const res = await fetch("/api/brand-profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data.profiles || []);
        setActiveProfileId(data.activeProfileId || null);
        syncProfilesToLocal(data.profiles || []);

        if (data.activeProfileId) {
          const active = (data.profiles || []).find(
            (p: BrandProfile) => p.id === data.activeProfileId
          );
          syncActiveToLocal(active || null, data.profiles || []);
        }
      }
    } catch (err) {
      console.error("Migration failed:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const createProfileFn = useCallback(
    async (
      data: Omit<BrandProfile, "id" | "createdAt">
    ): Promise<BrandProfile | null> => {
      try {
        const res = await fetch("/api/brand-profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
          }),
        });

        if (!res.ok) {
          const errData = await safeJson(res);
          throw new Error(errData?.error || "Failed to create profile");
        }

        const body = await safeJson(res);
        if (!body?.profile) throw new Error("Failed to create profile");
        const { profile } = body;

        setProfiles((prev) => {
          const updated = [...prev, profile];
          syncProfilesToLocal(updated);
          return updated;
        });

        return profile;
      } catch (err: any) {
        console.error("Error creating profile:", err);
        setError(err?.message);
        return null;
      }
    },
    []
  );

  const updateProfileFn = useCallback(
    async (
      id: string,
      data: Partial<BrandProfile>
    ): Promise<BrandProfile | null> => {
      try {
        const res = await fetch(`/api/brand-profiles/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!res.ok) throw new Error("Failed to update profile");

        const updateBody = await safeJson(res);
        if (!updateBody?.profile) throw new Error("Failed to update profile");
        const { profile: updated } = updateBody;

        setProfiles((prev) => {
          const newList = prev.map((p) => (p.id === id ? updated : p));
          syncProfilesToLocal(newList);
          return newList;
        });

        // If this was the active profile, update localStorage active data
        setActiveProfileId((currentActiveId) => {
          if (currentActiveId === id) {
            syncActiveToLocal(updated, []);
            syncFormWithProfile(updated);
          }
          return currentActiveId;
        });

        return updated;
      } catch (err: any) {
        console.error("Error updating profile:", err);
        setError(err?.message);
        return null;
      }
    },
    []
  );

  const deleteProfileFn = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/brand-profiles/${id}`, {
          method: "DELETE",
        });

        if (!res.ok) throw new Error("Failed to delete profile");

        setProfiles((prev) => {
          const updated = prev.filter((p) => p.id !== id);
          syncProfilesToLocal(updated);
          return updated;
        });

        // Clear active if it was the deleted profile
        setActiveProfileId((currentActiveId) => {
          if (currentActiveId === id) {
            syncActiveToLocal(null, []);
            return null;
          }
          return currentActiveId;
        });

        return true;
      } catch (err: any) {
        console.error("Error deleting profile:", err);
        setError(err?.message);
        return false;
      }
    },
    []
  );

  const setActiveProfileFn = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/brand-profiles/active", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: id }),
        });

        if (!res.ok) throw new Error("Failed to set active profile");

        setActiveProfileId(id);

        // Find the profile and sync to localStorage
        setProfiles((prev) => {
          const profile = prev.find((p) => p.id === id);
          if (profile) {
            syncActiveToLocal(profile, prev);
            syncFormWithProfile(profile);
          }
          return prev;
        });

        return true;
      } catch (err: any) {
        console.error("Error setting active profile:", err);
        setError(err?.message);
        return false;
      }
    },
    []
  );

  const clearActiveProfileFn = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/brand-profiles/active", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to clear active profile");

      setActiveProfileId(null);
      syncActiveToLocal(null, []);

      return true;
    } catch (err: any) {
      console.error("Error clearing active profile:", err);
      setError(err?.message);
      return false;
    }
  }, []);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/brand-profiles");
      if (!res.ok) throw new Error("Failed to fetch profiles");
      const data = await res.json();

      setProfiles(data.profiles || []);
      setActiveProfileId(data.activeProfileId || null);
      syncProfilesToLocal(data.profiles || []);

      if (data.activeProfileId) {
        const active = (data.profiles || []).find(
          (p: BrandProfile) => p.id === data.activeProfileId
        );
        syncActiveToLocal(active || null, data.profiles || []);
      } else {
        syncActiveToLocal(null, data.profiles || []);
      }
    } catch (err) {
      console.error("Error refetching profiles:", err);
    }
  }, []);

  return {
    profiles,
    activeProfileId,
    isLoading,
    error,
    createProfile: createProfileFn,
    updateProfile: updateProfileFn,
    deleteProfile: deleteProfileFn,
    setActiveProfile: setActiveProfileFn,
    clearActiveProfile: clearActiveProfileFn,
    refetch,
  };
}
