"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { getImage, deleteImage } from "../lib/imageStorage";
import { useTokenBalance } from "../lib/useTokenBalance";
import { useToast } from "../_components/ToastProvider";
import { useBrandProfiles, type BrandProfile } from "../lib/useBrandProfiles";
import { useInstagram } from "../lib/useInstagram";
import { useFacebook } from "../lib/useFacebook";
import { getNicheCalendarPath } from "../lib/nicheTemplates";
import { resizeLogoForStorage } from "../lib/imageOverlay";

type SavedPost = {
  id: string;
  profileId?: string;
  calendarDay?: number;
  month?: string;
  hasImage?: boolean;
  imageBase64?: string;
  caption: string;
  hashtags: string;
  postType: string;
  imageStyle: string;
  tone: string;
  niche?: string;
  audience?: string;
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const tokenBalance = useTokenBalance();
  const { addToast } = useToast();
  const brandProfiles = useBrandProfiles();
  const { profiles, activeProfileId } = brandProfiles;
  const [recentPosts, setRecentPosts] = useState<SavedPost[]>([]);
  const [recentMedia, setRecentMedia] = useState<
    { id: string; name: string; imageBase64: string }[]
  >([]);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BrandProfile | null>(
    null
  );
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileNiche, setNewProfileNiche] = useState("");
  const [newProfileAudience, setNewProfileAudience] = useState("");
  const [newProfileTone, setNewProfileTone] = useState("Confident");
  const [newProfilePrimaryColor, setNewProfilePrimaryColor] =
    useState("#000000");
  const [newProfileSecondaryColor, setNewProfileSecondaryColor] =
    useState("#ffffff");
  const [newProfileLogo, setNewProfileLogo] = useState("");
  const [newProfileWebsite, setNewProfileWebsite] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [postImages, setPostImages] = useState<Record<string, string>>({});
  const [billingLoading, setBillingLoading] = useState(false);
  const [navLoading, setNavLoading] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const instagram = useInstagram();
  const [igPublishingId, setIgPublishingId] = useState<string | null>(null);
  const [igPublishedIds, setIgPublishedIds] = useState<Set<string>>(new Set());
  const facebook = useFacebook();
  const [fbPublishingId, setFbPublishingId] = useState<string | null>(null);
  const [fbPublishedIds, setFbPublishedIds] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [profileStep, setProfileStep] = useState<number>(1);

  // Load posts from DB
  useEffect(() => {
    window.scrollTo(0, 0);

    async function loadMedia() {
      try {
        const res = await fetch("/api/media-assets");
        if (res.ok) {
          const data = await res.json();
          setRecentMedia((data.assets ?? []).slice(0, 4));
        }
      } catch {}
    }
    loadMedia();

    async function loadPosts() {
      try {
        const res = await fetch("/api/posts?limit=3");
        if (res.ok) {
          const data = await res.json();
          const posts: SavedPost[] = data.posts ?? [];
          setRecentPosts(posts);
          // Use imageBase64 from DB directly; fall back to IndexedDB for older posts
          for (const post of posts) {
            if (post.imageBase64) {
              setPostImages((prev) => ({
                ...prev,
                [post.id]: post.imageBase64!,
              }));
            } else if (post.hasImage) {
              const img = await getImage(post.id);
              if (img) setPostImages((prev) => ({ ...prev, [post.id]: img }));
            }
          }
        }
      } catch {}
    }
    loadPosts();
  }, []);

  // Auto-open profile creation modal if no profiles exist
  useEffect(() => {
    if (brandProfiles.isLoading) return;
    if (profiles.length === 0) {
      setShowNewProfile(true);
    }
  }, [brandProfiles.isLoading, profiles.length]);

  // Handle click outside menu to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscKey);
    };
  }, [menuOpen]);

  // Handle billing portal
  const handleBilling = async () => {
    setBillingLoading(true);
    setMenuOpen(false);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        addToast("Opening billing portal...", "info");
        window.location.href = data.url;
      } else if (res.status === 404) {
        // No subscription found — redirect to subscribe page
        addToast(
          "No active subscription found. Redirecting to plans...",
          "info"
        );
        window.location.href = "/subscribe";
      } else if (data.error) {
        addToast("Failed to open billing portal.", "error");
      }
    } catch (error) {
      addToast("Failed to open billing portal. Please try again.", "error");
    } finally {
      setBillingLoading(false);
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showNewProfile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showNewProfile]);

  const handleActivateProfile = async (profile: BrandProfile) => {
    await brandProfiles.setActiveProfile(profile.id);
  };

  const handleDeleteProfile = async (id: string) => {
    const success = await brandProfiles.deleteProfile(id);
    if (success) {
      addToast("Profile deleted", "info");
    } else {
      addToast("Failed to delete profile", "error");
    }
  };

  const handleEditProfile = (profile: BrandProfile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setNewProfileNiche(profile.niche);
    setNewProfileAudience(profile.audience);
    setNewProfileTone(profile.tone || "Confident");
    setNewProfilePrimaryColor(profile.primaryColor);
    setNewProfileSecondaryColor(profile.secondaryColor);
    setNewProfileLogo(profile.logoBase64 || "");
    setNewProfileWebsite(profile.website || "");
    setProfileStep(1);
    setShowNewProfile(true);
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;

    if (editingProfile) {
      // Update existing profile
      const updates: Partial<BrandProfile> = {
        name: newProfileName.trim(),
        niche: newProfileNiche.trim(),
        audience: newProfileAudience.trim(),
        tone: newProfileTone,
        primaryColor: newProfilePrimaryColor,
        secondaryColor: newProfileSecondaryColor,
        logoBase64: newProfileLogo || "",
        website: newProfileWebsite.trim(),
      };

      const updated = await brandProfiles.updateProfile(
        editingProfile.id,
        updates
      );

      if (updated) {
        // If this is the active profile, re-activate to sync localStorage
        if (activeProfileId === editingProfile.id) {
          await handleActivateProfile(updated);
        }
        addToast("Brand profile updated!", "success");
      } else {
        addToast("Failed to update profile", "error");
      }
    } else {
      // Create new profile
      if (profiles.length >= 5) {
        addToast("Maximum 5 profiles. Delete one to add more.", "warning");
        return;
      }

      const created = await brandProfiles.createProfile({
        name: newProfileName.trim(),
        niche: newProfileNiche.trim(),
        audience: newProfileAudience.trim(),
        tone: newProfileTone,
        captionLength: "Medium",
        hashtagCount: 12,
        imageStyle: "lifestyle_photo",
        primaryColor: newProfilePrimaryColor,
        secondaryColor: newProfileSecondaryColor,
        logoBase64: newProfileLogo || undefined,
        website: newProfileWebsite.trim(),
      });

      if (created) {
        // Auto-activate the newly created profile
        await handleActivateProfile(created);
        addToast("Brand profile created!", "success");
      } else {
        addToast("Failed to create profile", "error");
      }
    }

    // Reset form fields
    setNewProfileName("");
    setNewProfileNiche("");
    setNewProfileAudience("");
    setNewProfileTone("Confident");
    setNewProfilePrimaryColor("#000000");
    setNewProfileSecondaryColor("#ffffff");
    setNewProfileLogo("");
    setNewProfileWebsite("");
    setEditingProfile(null);
    setProfileStep(1);
    setShowNewProfile(false);
  };

  const handleCopyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    addToast(
      field === "caption"
        ? "Caption copied!"
        : field === "hashtags"
          ? "Hashtags copied!"
          : "Copied!",
      "success"
    );
  };

  const handleDeletePost = async (id: string) => {
    await deleteImage(id);
    const updated = recentPosts.filter((p) => p.id !== id);
    setRecentPosts(updated);
    localStorage.setItem("ath_gallery", JSON.stringify(updated));
    setPostImages((prev) => {
      const newImages = { ...prev };
      delete newImages[id];
      return newImages;
    });
    setSelectedPost(null);
    addToast("Post deleted", "info");
  };

  const handleDownloadImage = () => {
    if (!selectedPost || !postImages[selectedPost.id]) return;
    const a = document.createElement("a");
    a.href = postImages[selectedPost.id];
    a.download = `ai-tech-helper-${selectedPost.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addToast("Image downloaded!", "success");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const styles: Record<string, React.CSSProperties> = {
    page: {
      minHeight: "100vh",
      background: "#0b1220",
      color: "#e6edf7",
      padding: 16,
      boxSizing: "border-box",
      fontFamily: "Verdana, Geneva, sans-serif",
      overflowX: "hidden" as const,
      width: "100%",
    },
    container: {
      maxWidth: 1280,
      margin: "0 auto",
      width: "100%",
      boxSizing: "border-box" as const,
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: "clamp(20px, 6vw, 32px)",
      fontWeight: 700,
      letterSpacing: 1,
      margin: 0,
      textTransform: "uppercase" as const,
      wordBreak: "break-word" as const,
    },
    subtitle: {
      margin: "8px 0 0 0",
      opacity: 0.7,
      fontSize: 15,
      wordBreak: "break-word" as const,
      overflowWrap: "break-word" as const,
      maxWidth: "100%",
    },
    section: {
      marginBottom: 40,
    },
    sectionHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      opacity: 0.8,
      margin: 0,
    },
    secondarySectionTitle: {
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: 1,
      opacity: 0.6,
      margin: 0,
    },
    heroSection: {
      marginBottom: 40,
      border: "2px solid rgba(44, 107, 237, 0.3)",
      borderRadius: 20,
      boxShadow: "0 0 30px rgba(44, 107, 237, 0.15)",
      padding: 24,
    },
    stepPill: {
      background: "rgba(44, 107, 237, 0.2)",
      border: "1px solid rgba(44, 107, 237, 0.3)",
      borderRadius: 12,
      padding: "4px 8px",
      fontSize: 11,
      fontWeight: 700,
      color: "#7eb3ff",
      marginLeft: 12,
    },
    instructionText: {
      fontSize: 13,
      opacity: 0.7,
      marginTop: 8,
      lineHeight: 1.4,
      marginBottom: 0,
    },
    primaryCta: {
      background: "#2c6bed",
      border: "none",
      borderRadius: 12,
      padding: "12px 20px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      transition: "all 0.15s ease",
    },
    secondaryCta: {
      background: "transparent",
      border: "1px solid rgba(44, 107, 237, 0.3)",
      borderRadius: 8,
      padding: "10px 16px",
      color: "#7eb3ff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.15s ease",
    },
    actionGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 16,
      width: "100%",
      boxSizing: "border-box" as const,
    },
    actionCard: {
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 16,
      padding: 24,
      cursor: "pointer",
      transition: "all 0.15s ease",
      textAlign: "center" as const,
      boxShadow: "0 6px 18px rgba(0,0,0,0.35), 0 0 30px rgba(44,107,237,0.15)",
      minWidth: 0,
      overflow: "hidden" as const,
    },
    secondaryActionCard: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 16,
      cursor: "pointer",
      transition: "all 0.15s ease",
      textAlign: "center" as const,
      opacity: 0.7,
    },
    actionIcon: {
      fontSize: 40,
      marginBottom: 12,
      opacity: 0.9,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 6,
      opacity: 0.95,
    },
    actionDesc: {
      fontSize: 13,
      opacity: 0.8,
      lineHeight: 1.4,
    },
    secondaryActionIcon: {
      fontSize: 32,
      marginBottom: 8,
      opacity: 0.8,
    },
    secondaryActionTitle: {
      fontSize: 14,
      fontWeight: 700,
      marginBottom: 4,
      opacity: 0.9,
    },
    secondaryActionDesc: {
      fontSize: 12,
      opacity: 0.5,
      lineHeight: 1.4,
    },
    profileCard: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 15,
      fontWeight: 700,
      marginBottom: 4,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    profileMeta: {
      fontSize: 12,
      opacity: 0.6,
    },
    profileActions: {
      display: "flex",
      gap: 8,
    },
    btn: {
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "8px 14px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 600,
      transition: "all 0.15s ease",
    },
    btnPrimary: {
      background: "#2c6bed",
      border: "none",
    },
    btnDanger: {
      background: "rgba(255, 99, 99, 0.15)",
      border: "1px solid rgba(255, 99, 99, 0.3)",
      color: "#ff9999",
    },
    emptyState: {
      background:
        "linear-gradient(135deg, rgba(44,107,237,0.08) 0%, rgba(255,255,255,0.04) 100%)",
      border: "1px solid rgba(126,179,255,0.22)",
      borderRadius: 16,
      padding: "40px 32px",
      textAlign: "center" as const,
      boxShadow: "0 12px 34px rgba(0,0,0,0.45), 0 0 24px rgba(44,107,237,0.10)",
    },
    emptyText: {
      opacity: 0.9,
      fontSize: 18,
      fontWeight: 600,
      marginBottom: 16,
    },
    recentPostsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 12,
    },
    postCard: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 14,
      cursor: "pointer",
      transition: "all 0.15s ease",
    },
    secondaryPostCard: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10,
      padding: 10,
      cursor: "pointer",
      transition: "all 0.15s ease",
      opacity: 0.8,
    },
    postDate: {
      fontSize: 11,
      opacity: 0.5,
      marginBottom: 6,
    },
    postType: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 4,
    },
    postCaption: {
      fontSize: 11,
      opacity: 0.7,
      lineHeight: 1.4,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical" as const,
    },
    secondaryPostDate: {
      fontSize: 10,
      opacity: 0.4,
      marginBottom: 4,
    },
    secondaryPostType: {
      fontSize: 12,
      fontWeight: 600,
      marginBottom: 3,
      opacity: 0.9,
    },
    secondaryPostCaption: {
      fontSize: 10,
      opacity: 0.6,
      lineHeight: 1.3,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 2,
      WebkitBoxOrient: "vertical" as const,
    },
    viewAllLink: {
      fontSize: 13,
      color: "#7eb3ff",
      cursor: "pointer",
      fontWeight: 600,
    },
    modal: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      zIndex: 200,
      padding: "16px",
      overflowY: "auto" as const,
      overflowX: "hidden" as const,
      WebkitOverflowScrolling: "touch" as const,
    },
    modalContent: {
      background: "#101a33",
      borderRadius: 16,
      padding: 20,
      width: "min(480px, calc(100vw - 32px))",
      maxWidth: "100%",
      maxHeight: "none",
      marginTop: "auto",
      marginBottom: "auto",
      flexShrink: 0,
      boxSizing: "border-box" as const,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 700,
      marginBottom: 16,
    },
    input: {
      width: "100%",
      background: "#0b1220",
      color: "#e6edf7",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 10,
      padding: "12px 14px",
      outline: "none",
      fontSize: 14,
      boxSizing: "border-box" as const,
      marginBottom: 16,
    },
    modalActions: {
      display: "flex",
      gap: 12,
      justifyContent: "flex-end",
    },
    // Compact profile bar styles
    profileBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(34, 197, 94, 0.3)",
      borderRadius: 12,
      padding: "12px 16px",
      marginBottom: 24,
    },
    profileBarLeft: {
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    profileBarIndicator: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "#22c55e",
      boxShadow: "0 0 8px rgba(34, 197, 94, 0.5)",
    },
    profileBarName: {
      fontSize: 14,
      fontWeight: 700,
      color: "#e6edf7",
    },
    profileBarMeta: {
      fontSize: 12,
      opacity: 0.6,
      marginLeft: 8,
    },
    profileBarDropdown: {
      position: "relative" as const,
    },
    profileBarButton: {
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 8,
      padding: "8px 12px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      gap: 6,
      transition: "all 0.15s ease",
    },
    dropdownMenu: {
      position: "absolute" as const,
      top: "100%",
      right: 0,
      marginTop: 8,
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.15)",
      borderRadius: 10,
      padding: 8,
      minWidth: 220,
      zIndex: 100,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    },
    dropdownItem: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 6,
      cursor: "pointer",
      fontSize: 13,
      color: "#e6edf7",
      transition: "background 0.15s ease",
    },
    dropdownDivider: {
      height: 1,
      background: "rgba(255,255,255,0.1)",
      margin: "8px 0",
    },
  };

  // Get active profile data
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div style={styles.page} className="ath-page" >
      <div style={{ ...styles.container, position: "relative", overflowX: "hidden" }}>
        {/* Header - Enhanced */}
        <div
          className="dash-page-header"
          style={{
            marginBottom: 32,
            textAlign: "center" as const,
            paddingTop: 60,
          }}
        >
          {/* Realtor badge */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(44, 107, 237, 0.12)",
                border: "1px solid rgba(44, 107, 237, 0.3)",
                borderRadius: 999,
                padding: "4px 14px",
                fontSize: 11,
                fontWeight: 700,
                color: "#7eb3ff",
                letterSpacing: 1.2,
                textTransform: "uppercase" as const,
              }}
            >
              ✦ Built for Your Niche
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 8vw, 36px)",
              fontWeight: 800,
              letterSpacing: 1,
              margin: 0,
              background:
                "linear-gradient(135deg, #e6edf7 0%, #7eb3ff 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              maxWidth: "100%",
              wordBreak: "break-word",
            }}
          >
            AI Social Helper
          </h1>

          <p
            style={{
              margin: "8px 0 0 0",
              fontSize: 14,
              opacity: 0.55,
              fontWeight: 500,
            }}
          >
            AI-generated content for your business — in seconds.
          </p>

          {/* User Identity Pill or Sign In Button - Top Right */}
          {user ? (
            <>
              {/* Token Balance Pill */}
              <div
                className="ath-token-pill"
                style={{
                  position: "fixed",
                  top: 16,
                  left: 16,
                  zIndex: 999,
                }}
              >
                <div
                  style={{
                    background:
                      !tokenBalance.isLoading &&
                      !tokenBalance.error &&
                      tokenBalance.tokensRemaining <= 0
                        ? "rgba(239, 68, 68, 0.1)"
                        : "rgba(34, 197, 94, 0.1)",
                    border:
                      !tokenBalance.isLoading &&
                      !tokenBalance.error &&
                      tokenBalance.tokensRemaining <= 0
                        ? "1px solid rgba(239, 68, 68, 0.2)"
                        : "1px solid rgba(34, 197, 94, 0.2)",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    color:
                      !tokenBalance.isLoading &&
                      !tokenBalance.error &&
                      tokenBalance.tokensRemaining <= 0
                        ? "#ef4444"
                        : "#22c55e",
                    fontWeight: 600,
                    fontFamily: "Verdana, Geneva, sans-serif",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tokenBalance.isLoading
                    ? "Tokens: …"
                    : tokenBalance.error
                      ? "Tokens unavailable"
                      : `Tokens: ${tokenBalance.tokensRemaining}/${tokenBalance.totalMonthlyTokens}`}
                </div>
              </div>

              {/* User Email Pill */}
              <div
                ref={menuRef}
                className="ath-email-pill"
                style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}
              >
                <div
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    background: "rgba(44, 107, 237, 0.1)",
                    border: "1px solid rgba(44, 107, 237, 0.2)",
                    borderRadius: 20,
                    padding: "6px 20px",
                    fontSize: 12,
                    color: "#7eb3ff",
                    fontWeight: 600,
                    fontFamily: "Verdana, Geneva, sans-serif",
                    maxWidth: 300,
                    cursor: "pointer",
                    transition: "opacity 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                >
                  <span
                    style={{
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {user.primaryEmailAddress?.emailAddress ||
                      user.username ||
                      "Signed in"}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      transition: "transform 0.2s ease",
                      transform: menuOpen ? "rotate(180deg)" : "rotate(0deg)",
                      flexShrink: 0,
                    }}
                  >
                    ▼
                  </span>
                </div>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: 48,
                      right: 0,
                      background: "rgba(10, 18, 32, 0.98)",
                      border: "1px solid rgba(255,255,255,0.10)",
                      borderRadius: 14,
                      minWidth: 200,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
                      padding: 8,
                    }}
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        router.push("/media");
                      }}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#ffffff",
                        padding: "10px 12px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "left" as const,
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      📁 My Library
                    </button>
                    <button
                      onClick={handleBilling}
                      disabled={billingLoading}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#ffffff",
                        padding: "10px 12px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: billingLoading ? "not-allowed" : "pointer",
                        textAlign: "left" as const,
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        !billingLoading &&
                        (e.currentTarget.style.background =
                          "rgba(255,255,255,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      {billingLoading ? "Loading..." : "Manage Billing"}
                    </button>

                    <SignOutButton redirectUrl="/">
                      <button
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "none",
                          color: "#ffffff",
                          padding: "10px 12px",
                          borderRadius: 8,
                          fontSize: 14,
                          fontWeight: 500,
                          cursor: "pointer",
                          textAlign: "left" as const,
                          transition: "background 0.2s ease",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(255,255,255,0.05)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "transparent")
                        }
                      >
                        Sign Out
                      </button>
                    </SignOutButton>

                    <button
                      onClick={async () => {
                        if (!confirm("Permanently delete your account and all data? This cannot be undone.")) return;
                        if (!confirm("Are you sure? This will delete everything immediately.")) return;
                        try {
                          const res = await fetch("/api/delete-account", { method: "DELETE" });
                          if (res.ok) {
                            router.push("/");
                          } else {
                            alert("Failed to delete account. Please try again.");
                          }
                        } catch {
                          alert("Something went wrong. Please try again.");
                        }
                      }}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#ef4444",
                        padding: "10px 12px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        textAlign: "left" as const,
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "rgba(239,68,68,0.08)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      Delete Account
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => router.push("/sign-in")}
              style={{
                position: "fixed",
                top: 16,
                right: 16,
                zIndex: 1000,
                background: "rgba(44, 107, 237, 0.1)",
                border: "1px solid rgba(44, 107, 237, 0.2)",
                borderRadius: 20,
                padding: "6px 14px",
                fontSize: 12,
                color: "#7eb3ff",
                fontWeight: 600,
                fontFamily: "Verdana, Geneva, sans-serif",
                cursor: "pointer",
                transition: "opacity 0.2s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              Sign In
            </button>
          )}
        </div>

        {/* Flex column wrapper — action cards render first via order:0, 3-col section second via order:1 */}
        <div style={{ display: "flex", flexDirection: "column" as const }}>
          {/* 3-col section: Brand Profile | Social Medias | Recent Posts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
              order: 1,
              marginTop: 40,
            }}
            className="dash-side-by-side"
          >
            {/* Brand Profiles section - always show */}
            <div
              style={{ ...styles.heroSection, minWidth: 0, marginBottom: 0 }}
              className="primary-section"
            >
              <div style={styles.sectionHeader}>
                <div>
                  <h2 style={styles.sectionTitle}>
                    Your Brand Profile
                    <span style={styles.stepPill}>Step 1</span>
                  </h2>
                  <p style={styles.instructionText}>
                    {profiles.length === 0
                      ? "Complete your first time configuration so every post sounds like you."
                      : "Manage your brand profiles — switch between businesses or audiences."}
                  </p>
                </div>
              </div>

              {profiles.length === 0 ? (
                <div style={styles.emptyState}>
                  {/* Centered Content Container */}
                  <div
                    style={{
                      maxWidth: 820,
                      margin: "0 auto",
                      width: "100%",
                    }}
                  >
                    {/* Title */}
                    <div
                      style={{
                        ...styles.emptyText,
                        textAlign: "center" as const,
                      }}
                    >
                      First time configuration takes about 30 seconds:
                    </div>

                    {/* What you'll save - vertical bullet list */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column" as const,
                        gap: 10,
                        marginBottom: 24,
                      }}
                    >
                      {[
                        "Brand colors",
                        "Niche + audience",
                        "Tone of voice",
                      ].map((item) => (
                        <div
                          key={item}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 14px",
                            borderRadius: 12,
                            border: "1px solid rgba(126,179,255,0.18)",
                            background: "rgba(16,26,51,0.35)",
                            color: "#cbd6ea",
                            fontWeight: 600,
                            fontSize: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 999,
                              background: "#7eb3ff",
                              opacity: 0.9,
                              flexShrink: 0,
                            }}
                          />
                          {item}
                        </div>
                      ))}
                    </div>

                    {/* Benefit line */}
                    <div
                      style={{
                        fontSize: 13,
                        opacity: 0.7,
                        marginBottom: 24,
                        fontStyle: "italic" as const,
                        textAlign: "center" as const,
                      }}
                    >
                      One setup. Every post sounds like you.
                    </div>

                    {/* Enhanced CTA */}
                    <button
                      style={{
                        ...styles.primaryCta,
                        height: 56,
                        fontSize: 15,
                        fontWeight: 700,
                        boxShadow:
                          "0 8px 20px rgba(44,107,237,0.35), 0 2px 8px rgba(44,107,237,0.2)",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => setShowNewProfile(true)}
                      className="hover-btn-primary enhanced-cta"
                    >
                      Start First Time Configuration
                    </button>
                  </div>
                </div>
              ) : (
                /* Show profiles list when profiles exist */
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
                    gap: 20,
                    marginTop: 20,
                  }}
                >
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      style={{
                        background:
                          "linear-gradient(135deg, #15233d 0%, #1a1a2e 100%)",
                        border:
                          profile.id === activeProfileId
                            ? "2px solid #22c55e"
                            : "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 16,
                        padding: 20,
                        position: "relative",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 12,
                        }}
                      >
                        <h3
                          style={{
                            margin: 0,
                            fontSize: 16,
                            fontWeight: 700,
                            color: "#e6edf7",
                          }}
                        >
                          {profile.name}
                        </h3>
                        {profile.id === activeProfileId && (
                          <span
                            style={{
                              background:
                                "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#fff",
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                          marginBottom: 16,
                          lineHeight: 1.5,
                        }}
                      >
                        {profile.niche} • {profile.audience} • {profile.tone}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => handleActivateProfile(profile)}
                          style={{
                            background:
                              profile.id === activeProfileId
                                ? "rgba(34, 197, 94, 0.2)"
                                : "rgba(126, 179, 255, 0.1)",
                            border:
                              profile.id === activeProfileId
                                ? "1px solid #22c55e"
                                : "1px solid rgba(126, 179, 255, 0.2)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 11,
                            fontWeight: 600,
                            color:
                              profile.id === activeProfileId
                                ? "#22c55e"
                                : "#7eb3ff",
                            cursor: "pointer",
                            flex: 1,
                            transition: "all 0.2s ease",
                          }}
                        >
                          {profile.id === activeProfileId
                            ? "Active"
                            : "Activate"}
                        </button>
                        <button
                          onClick={() => handleEditProfile(profile)}
                          style={{
                            background: "rgba(236, 72, 153, 0.1)",
                            border: "1px solid rgba(236, 72, 153, 0.2)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#ec4899",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(profile.id)}
                          style={{
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#ef4444",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add New Profile Card */}
                  <div
                    onClick={() => setShowNewProfile(true)}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(126, 179, 255, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)",
                      border: "2px dashed rgba(126, 179, 255, 0.3)",
                      borderRadius: 16,
                      padding: 20,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      minHeight: 120,
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 8 }}>+</div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "#7eb3ff",
                      }}
                    >
                      Add Brand Profile
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Social Medias column: Instagram + Facebook */}
            <div
              style={{
                display: "flex",
                flexDirection: "column" as const,
                gap: 12,
              }}
              className="dash-social-col"
            >
              {/* Instagram Connection */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(131,58,180,0.1) 0%, rgba(253,29,29,0.08) 50%, rgba(252,176,69,0.06) 100%)",
                  border: "1px solid rgba(253,29,29,0.2)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginTop: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap" as const,
                  gap: 12,
                  boxShadow: "0 0 30px rgba(44, 107, 237, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <linearGradient id="igGrad" x1="0" y1="24" x2="24" y2="0">
                        <stop offset="0%" stopColor="#feda75" />
                        <stop offset="25%" stopColor="#fa7e1e" />
                        <stop offset="50%" stopColor="#d62976" />
                        <stop offset="75%" stopColor="#962fbf" />
                        <stop offset="100%" stopColor="#4f5bd5" />
                      </linearGradient>
                      <rect
                        x="2"
                        y="2"
                        width="20"
                        height="20"
                        rx="5"
                        stroke="url(#igGrad)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="4.5"
                        stroke="url(#igGrad)"
                        strokeWidth="2"
                        fill="none"
                      />
                      <circle cx="17.5" cy="6.5" r="1.2" fill="url(#igGrad)" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {instagram.connected
                        ? `Connected to @${instagram.username}`
                        : "Connect Instagram"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                      {instagram.connected
                        ? "Post directly to Instagram from your generated posts"
                        : "Share your posts and updates directly to Instagram"}
                    </div>
                  </div>
                </div>
                {instagram.connected ? (
                  <button
                    onClick={() => {
                      if (confirm("Disconnect your Instagram account?")) {
                        instagram.disconnect();
                        addToast("Instagram disconnected", "success");
                      }
                    }}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                      color: "#e6edf7",
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    className="hover-btn"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => instagram.connect()}
                    style={{
                      background:
                        "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
                      border: "none",
                      borderRadius: 10,
                      color: "#ffffff",
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    className="hover-btn"
                  >
                    Connect Instagram
                  </button>
                )}
              </div>

              {/* Facebook Connection */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(24,119,242,0.1) 0%, rgba(66,103,178,0.08) 100%)",
                  border: "1px solid rgba(24,119,242,0.2)",
                  borderRadius: 16,
                  padding: "20px 24px",
                  marginTop: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap" as const,
                  gap: 12,
                  boxShadow: "0 0 30px rgba(44, 107, 237, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 28 }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"
                        stroke="#1877F2"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>
                      {facebook.connected
                        ? `Connected to ${facebook.pageName}`
                        : "Connect Facebook"}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                      {facebook.connected
                        ? "Post directly to your Facebook Page from generated posts"
                        : "Share your posts and updates directly to Facebook"}
                    </div>
                  </div>
                </div>
                {facebook.connected ? (
                  <button
                    onClick={() => {
                      if (confirm("Disconnect your Facebook page?")) {
                        facebook.disconnect();
                        addToast("Facebook disconnected", "success");
                      }
                    }}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                      color: "#e6edf7",
                      padding: "8px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    className="hover-btn"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => facebook.connect()}
                    style={{
                      background: "#1877F2",
                      border: "none",
                      borderRadius: 10,
                      color: "#ffffff",
                      padding: "10px 20px",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    className="hover-btn"
                  >
                    Connect Facebook
                  </button>
                )}
              </div>

              {/* My Photo Library — bottom of social column */}
              <div
                onClick={() => router.push("/media")}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: 20,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column" as const,
                  transition: "all 0.15s ease",
                }}
                className="my-library-link hover-card"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 14,
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <span
                    style={{ fontWeight: 700, fontSize: 14, color: "#e6edf7" }}
                  >
                    My Photos
                  </span>
                </div>
                {recentMedia.length > 0 ? (
                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      {recentMedia.map((asset) => (
                        <div
                          key={asset.id}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 8,
                            overflow: "hidden",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <img
                            src={asset.imageBase64}
                            alt={asset.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        background: "rgba(124,58,237,0.2)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        borderRadius: 8,
                        padding: "8px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#a78bfa",
                        textAlign: "center" as const,
                      }}
                    >
                      Open Library →
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column" as const,
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(124, 58, 237, 0.06)",
                      border: "1px dashed rgba(124, 58, 237, 0.25)",
                      borderRadius: 12,
                      padding: "20px 16px",
                      textAlign: "center" as const,
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: "rgba(124, 58, 237, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        stroke="#a78bfa"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#e6edf7",
                          marginBottom: 3,
                        }}
                      >
                        Upload Your Photos
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.4)",
                          lineHeight: 1.5,
                        }}
                      >
                        Add your own photos to use in posts
                      </div>
                    </div>
                    <div
                      style={{
                        background: "rgba(124,58,237,0.2)",
                        border: "1px solid rgba(124,58,237,0.3)",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#a78bfa",
                      }}
                    >
                      Open Library →
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* end dash-social-col */}

            {/* Recent Posts column */}
            <div>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  borderRadius: 16,
                  boxShadow: "0 0 30px rgba(44, 107, 237, 0.15)",
                  padding: 24,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  <span
                    style={{ fontWeight: 700, fontSize: 16, color: "#e6edf7" }}
                  >
                    Recent Posts
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.35)",
                      fontWeight: 400,
                    }}
                  >
                    last 3 saved
                  </span>
                </div>

                {/* Save reminder */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    background: "rgba(251, 191, 36, 0.08)",
                    border: "1px solid rgba(251, 191, 36, 0.2)",
                    borderRadius: 8,
                    padding: "9px 12px",
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "rgba(251,191,36,0.85)",
                      lineHeight: 1.5,
                    }}
                  >
                    Only your 3 most recent posts show here. Make sure to save
                    posts you want to keep before generating new ones.
                  </span>
                </div>

                {recentPosts.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(160px, 1fr))",
                      gap: 16,
                    }}
                  >
                    {recentPosts.map((post) => (
                      <div
                        key={post.id}
                        onClick={() => setSelectedPost(post)}
                        style={{
                          background: "#0b1220",
                          borderRadius: 12,
                          overflow: "hidden",
                          cursor: "pointer",
                          border: "1px solid rgba(255,255,255,0.08)",
                          transition: "all 0.2s ease",
                        }}
                        className="hover-card"
                      >
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "1",
                            backgroundImage: postImages[post.id]
                              ? `url(${postImages[post.id]})`
                              : "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {!postImages[post.id] && (
                            <svg
                              width="32"
                              height="32"
                              fill="none"
                              stroke="rgba(255,255,255,0.2)"
                              strokeWidth="1.5"
                              viewBox="0 0 24 24"
                            >
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          )}
                        </div>
                        <div style={{ padding: 10 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#a78bfa",
                              marginBottom: 4,
                            }}
                          >
                            {post.postType}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.5)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              marginBottom: 8,
                            }}
                          >
                            {post.caption.slice(0, 40)}...
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPost(post);
                            }}
                            style={{
                              width: "100%",
                              background:
                                "linear-gradient(135deg, rgba(44, 107, 237, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)",
                              border: "1px solid rgba(44, 107, 237, 0.3)",
                              borderRadius: 6,
                              color: "#7eb3ff",
                              padding: "7px 8px",
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            className="hover-btn"
                          >
                            Manage Post
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "40px 20px",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    <svg
                      width="48"
                      height="48"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      style={{ margin: "0 auto 12px" }}
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="M21 15l-5-5L5 21" />
                    </svg>
                    <div style={{ fontSize: 14, marginBottom: 8 }}>
                      No posts yet
                    </div>
                    <div
                      style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}
                    >
                      Generate your first post to see it here
                    </div>
                    <button
                      style={{
                        background: "#2c6bed",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px 24px",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => router.push("/generator")}
                      className="hover-btn-primary"
                    >
                      Generate Your First Post
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* end Recent Posts column */}
          </div>
          {/* end dash-side-by-side */}

          {/* Main Actions - Enhanced Cards */}
          <div style={{ ...styles.section, order: 0, marginBottom: 0 }}>
            <div style={styles.actionGrid} className="ath-actionGrid">
              {/* Generate a Post Card */}
              <div
                style={{
                  ...styles.actionCard,
                  background:
                    "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  padding: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column" as const,
                }}
                className="primary-action-card hover-card"
                onClick={() => {
                  if (
                    !tokenBalance.isLoading &&
                    tokenBalance.tokensRemaining === 0
                  ) {
                    router.push("/subscribe");
                    return;
                  }
                  setNavLoading("generator");
                  router.push("/generator");
                }}
              >
                {/* Card Header */}
                <div
                  className="ath-card-header"
                  style={{
                    padding: "24px 24px 20px",
                    textAlign: "center" as const,
                  }}
                >
                  <img
                    className="ath-card-icon"
                    src="/logo-icon.png"
                    alt="AI Social Helper"
                    style={{
                      width: 64,
                      height: 64,
                      marginBottom: 8,
                      objectFit: "contain",
                      display: "block",
                      margin: "0 auto 8px",
                    }}
                  />
                  <div
                    className="ath-card-title"
                    style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}
                  >
                    New Post
                  </div>
                  <div
                    className="ath-card-subtitle"
                    style={{ fontSize: 13, opacity: 0.85 }}
                  >
                    One post, done in seconds
                  </div>
                </div>

                {/* Card Body */}
                <div
                  className="ath-card-body"
                  style={{
                    padding: "20px 24px 24px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column" as const,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column" as const,
                      gap: 10,
                      flex: 1,
                      marginBottom: 20,
                      textAlign: "center" as const,
                      alignItems: "center",
                    }}
                  >
                    {[
                      "One topic. One post. Ready in seconds.",
                      "Use your own photo or generate a fresh one.",
                      "Caption and hashtags in your brand voice.",
                    ].map((line) => (
                      <div
                        key={line}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#4f8ef7",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            lineHeight: 1.5,
                          }}
                        >
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: "auto",
                      background: "#2c6bed",
                      borderRadius: 10,
                      padding: "14px 20px",
                      textAlign: "center" as const,
                      fontWeight: 700,
                      fontSize: 14,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {navLoading === "generator" ? "Loading…" : "New Post →"}
                  </div>
                </div>
              </div>

              {/* Generate a Branded Video Card */}
              <div
                style={{
                  ...styles.actionCard,
                  background:
                    "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)",
                  padding: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column" as const,
                }}
                className="primary-action-card hover-card"
                onClick={() => {
                  setNavLoading("video");
                  router.push("/generate-video");
                }}
              >
                {/* Card Header */}
                <div
                  className="ath-card-header"
                  style={{
                    padding: "24px 24px 20px",
                    textAlign: "center" as const,
                  }}
                >
                  <div
                    className="ath-card-icon"
                    style={{ fontSize: 48, marginBottom: 8 }}
                  >
                    🎬
                  </div>
                  <div
                    className="ath-card-title"
                    style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}
                  >
                    New Video
                  </div>
                  <div
                    className="ath-card-subtitle"
                    style={{ fontSize: 13, opacity: 0.85 }}
                  >
                    A short branded clip, ready to post
                  </div>
                </div>

                {/* Card Body */}
                <div
                  className="ath-card-body"
                  style={{
                    padding: "20px 24px 24px",
                    flex: 1,
                    display: "flex",
                    flexDirection: "column" as const,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column" as const,
                      gap: 10,
                      flex: 1,
                      marginBottom: 20,
                      textAlign: "center" as const,
                      alignItems: "center",
                    }}
                  >
                    {[
                      "5 seconds, AI-generated.",
                      "Post to Instagram Reels & Facebook.",
                      "Pick your format (9:16, 1:1, 16:9).",
                    ].map((line) => (
                      <div
                        key={line}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#6ee7b7",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            lineHeight: 1.5,
                          }}
                        >
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: "auto",
                      background: "#10b981",
                      borderRadius: 10,
                      padding: "14px 20px",
                      textAlign: "center" as const,
                      fontWeight: 700,
                      fontSize: 14,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {navLoading === "video" ? "Loading…" : "New Video →"}
                  </div>
                </div>
              </div>

              {/* Plan Your Month Card — full width at the bottom */}
              <div
                style={{
                  ...styles.actionCard,
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                  padding: 0,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column" as const,
                  gridColumn: "1 / -1",
                }}
                className="primary-action-card hover-card"
                onClick={() => {
                  if (
                    !tokenBalance.isLoading &&
                    tokenBalance.tokensRemaining === 0
                  ) {
                    router.push("/subscribe");
                    return;
                  }
                  setNavLoading("calendar");
                  const activeProfile = profiles.find(
                    (p) => p.id === activeProfileId
                  );
                  router.push(getNicheCalendarPath(activeProfile?.niche ?? ""));
                }}
              >
                <div
                  className="calendar-card-inner"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "20px 28px",
                    gap: 28,
                  }}
                >
                  {/* Icon + Title */}
                  <div
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}
                  >
                    <div className="ath-card-icon" style={{ fontSize: 36 }}>
                      📅
                    </div>
                    <div>
                      <div
                        className="ath-card-title"
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          marginBottom: 2,
                        }}
                      >
                        Content Calendar
                      </div>
                      <div
                        className="ath-card-subtitle calendar-card-subtitle"
                        style={{
                          fontSize: 12,
                          opacity: 0.75,
                          whiteSpace: "nowrap" as const,
                          marginBottom: 10,
                        }}
                      >
                        Your full month, planned for you
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    className="calendar-card-divider"
                    style={{
                      width: 1,
                      alignSelf: "stretch",
                      background: "rgba(255,255,255,0.15)",
                      flexShrink: 0,
                    }}
                  />

                  {/* Bullets */}
                  <div
                    className="calendar-card-bullets ath-card-body"
                    style={{
                      flex: 2,
                      minWidth: 0,
                      display: "flex",
                      flexDirection: "row" as const,
                      flexWrap: "wrap" as const,
                      gap: 16,
                      justifyContent: "center",
                      alignItems: "center",
                      textAlign: "center" as const,
                    }}
                  >
                    {[
                      "Whole month, planned automatically",
                      "Every weekday has its own post type",
                      "Click any day — generate that post",
                    ].map((line) => (
                      <div
                        key={line}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          justifyContent: "flex-start",
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#a78bfa",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {line}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full-width button — matches New Post / New Video style */}
                <div
                  className="calendar-card-btn"
                  style={{
                    margin: "0 20px 20px",
                    background: "rgba(255,255,255,0.18)",
                    borderRadius: 12,
                    padding: "14px",
                    fontWeight: 700,
                    fontSize: 15,
                    textAlign: "center" as const,
                    letterSpacing: 0.2,
                  }}
                >
                  {navLoading === "calendar"
                    ? "Loading…"
                    : "Open Content Calendar →"}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Account Settings — prominently shown so users can find sign-out and
            account deletion without hunting through menus (required by Apple 5.1.1(v)) */}
        <div
          id="account-settings"
          style={{
            maxWidth: 680,
            width: "100%",
            margin: "0 auto 48px",
            background: "#0f1b2d",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            padding: "28px 32px",
          }}
        >
          <h3
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "#e6edf7",
              margin: "0 0 20px",
              letterSpacing: 0.3,
            }}
          >
            Account Settings
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              gap: 12,
            }}
          >
            {/* Manage Billing */}
            <button
              onClick={handleBilling}
              disabled={billingLoading}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#c5d0e0",
                fontSize: 14,
                fontWeight: 500,
                cursor: billingLoading ? "not-allowed" : "pointer",
                textAlign: "left" as const,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "Verdana, Geneva, sans-serif",
              }}
            >
              <span style={{ fontSize: 16 }}>💳</span>
              {billingLoading ? "Loading…" : "Manage Billing & Subscription"}
            </button>

            {/* Sign Out */}
            <SignOutButton redirectUrl="/">
              <button
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  color: "#c5d0e0",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                  textAlign: "left" as const,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "Verdana, Geneva, sans-serif",
                }}
              >
                <span style={{ fontSize: 16 }}>🚪</span>
                Sign Out
              </button>
            </SignOutButton>

            {/* Delete Account — required by Apple guideline 5.1.1(v) */}
            <button
              onClick={async () => {
                if (
                  !confirm(
                    "Permanently delete your account and all data? This cannot be undone."
                  )
                )
                  return;
                if (
                  !confirm(
                    "Are you absolutely sure? Everything will be deleted immediately."
                  )
                )
                  return;
                try {
                  const res = await fetch("/api/delete-account", {
                    method: "DELETE",
                  });
                  if (res.ok) {
                    window.location.href = "/";
                  } else {
                    alert("Failed to delete account. Please try again.");
                  }
                } catch {
                  alert("Something went wrong. Please try again.");
                }
              }}
              style={{
                width: "100%",
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 10,
                padding: "12px 16px",
                color: "#f87171",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                textAlign: "left" as const,
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "Verdana, Geneva, sans-serif",
              }}
            >
              <span style={{ fontSize: 16 }}>🗑️</span>
              Delete Account
            </button>
          </div>

          <p
            style={{
              fontSize: 12,
              color: "#5a6a80",
              margin: "16px 0 0",
              lineHeight: 1.5,
            }}
          >
            Deleting your account is permanent and immediately removes all your
            posts, profiles, and data. This action cannot be undone.
          </p>
        </div>
        {/* end flex-column wrapper */}

        {/* Post Detail Modal */}
        {selectedPost && (
          <div
            style={{
              position: "fixed" as const,
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              zIndex: 200,
              padding: 20,
              paddingTop: 60,
              overflowY: "auto" as const,
            }}
            onClick={() => setSelectedPost(null)}
          >
            <div
              style={{
                background: "#101a33",
                borderRadius: 16,
                padding: 24,
                maxWidth: 900,
                width: "95%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 20,
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {selectedPost.postType}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                    {formatDate(selectedPost.createdAt)}
                    {selectedPost.calendarDay &&
                      ` • Day ${selectedPost.calendarDay}`}
                  </div>
                </div>
                <button
                  style={{
                    background: "none",
                    border: "none",
                    color: "#e6edf7",
                    fontSize: 24,
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                  }}
                  onClick={() => setSelectedPost(null)}
                >
                  ×
                </button>
              </div>

              {/* Two-column layout */}
              <div
                className="post-modal-two-col"
                style={{
                  display: "flex",
                  gap: 24,
                  flexDirection: "row" as const,
                }}
              >
                {/* Left column - Image */}
                <div
                  className="post-modal-left-col"
                  style={{ flex: "0 0 45%", minWidth: 0 }}
                >
                  {postImages[selectedPost.id] && (
                    <div>
                      <div
                        style={{
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#0b1220",
                          marginBottom: 12,
                        }}
                      >
                        <img
                          src={postImages[selectedPost.id]}
                          alt="Generated post"
                          style={{
                            width: "100%",
                            height: "auto",
                            display: "block",
                          }}
                        />
                      </div>
                      <button
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background:
                            "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          border: "none",
                          borderRadius: 6,
                          padding: "8px 12px",
                          color: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                          fontWeight: 600,
                          width: "100%",
                          justifyContent: "center",
                        }}
                        onClick={handleDownloadImage}
                        className="hover-btn"
                      >
                        <svg
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download Image
                      </button>

                      {/* Publish buttons */}
                      {instagram.connected && (
                        <button
                          onClick={() => {
                            if (
                              igPublishingId === selectedPost.id ||
                              igPublishedIds.has(selectedPost.id)
                            )
                              return;
                            setIgPublishingId(selectedPost.id);
                            instagram
                              .publish(
                                postImages[selectedPost.id],
                                selectedPost.caption,
                                selectedPost.hashtags
                              )
                              .then(() => {
                                setIgPublishedIds((prev) =>
                                  new Set(prev).add(selectedPost.id)
                                );
                                addToast(
                                  `Posted to @${instagram.username}!`,
                                  "success"
                                );
                              })
                              .catch((err: any) => {
                                addToast(
                                  err?.message || "Failed to post",
                                  "error"
                                );
                              })
                              .finally(() => setIgPublishingId(null));
                          }}
                          disabled={
                            igPublishingId === selectedPost.id ||
                            igPublishedIds.has(selectedPost.id)
                          }
                          style={{
                            width: "100%",
                            marginTop: 8,
                            background: igPublishedIds.has(selectedPost.id)
                              ? "rgba(34, 197, 94, 0.15)"
                              : "linear-gradient(135deg, rgba(131,58,180,0.3), rgba(253,29,29,0.3), rgba(252,176,69,0.3))",
                            border: igPublishedIds.has(selectedPost.id)
                              ? "1px solid rgba(34, 197, 94, 0.4)"
                              : "1px solid rgba(253,29,29,0.25)",
                            borderRadius: 6,
                            color: "#e6edf7",
                            padding: "8px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor:
                              igPublishingId === selectedPost.id ||
                              igPublishedIds.has(selectedPost.id)
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              igPublishingId === selectedPost.id ||
                              igPublishedIds.has(selectedPost.id)
                                ? 0.7
                                : 1,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {igPublishingId === selectedPost.id
                            ? "Posting..."
                            : igPublishedIds.has(selectedPost.id)
                              ? "✓ Posted to Instagram"
                              : "Post to Instagram"}
                        </button>
                      )}
                      {facebook.connected && (
                        <button
                          onClick={() => {
                            if (
                              fbPublishingId === selectedPost.id ||
                              fbPublishedIds.has(selectedPost.id)
                            )
                              return;
                            setFbPublishingId(selectedPost.id);
                            facebook
                              .publish(
                                postImages[selectedPost.id],
                                selectedPost.caption,
                                selectedPost.hashtags
                              )
                              .then(() => {
                                setFbPublishedIds((prev) =>
                                  new Set(prev).add(selectedPost.id)
                                );
                                addToast(
                                  `Posted to ${facebook.pageName}!`,
                                  "success"
                                );
                              })
                              .catch((err: any) => {
                                addToast(
                                  err?.message || "Failed to post to Facebook",
                                  "error"
                                );
                              })
                              .finally(() => setFbPublishingId(null));
                          }}
                          disabled={
                            fbPublishingId === selectedPost.id ||
                            fbPublishedIds.has(selectedPost.id)
                          }
                          style={{
                            width: "100%",
                            marginTop: 8,
                            background: fbPublishedIds.has(selectedPost.id)
                              ? "rgba(34, 197, 94, 0.15)"
                              : "rgba(24,119,242,0.2)",
                            border: fbPublishedIds.has(selectedPost.id)
                              ? "1px solid rgba(34, 197, 94, 0.4)"
                              : "1px solid rgba(24,119,242,0.3)",
                            borderRadius: 6,
                            color: "#e6edf7",
                            padding: "8px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor:
                              fbPublishingId === selectedPost.id ||
                              fbPublishedIds.has(selectedPost.id)
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              fbPublishingId === selectedPost.id ||
                              fbPublishedIds.has(selectedPost.id)
                                ? 0.7
                                : 1,
                            transition: "all 0.15s ease",
                          }}
                        >
                          {fbPublishingId === selectedPost.id
                            ? "Posting..."
                            : fbPublishedIds.has(selectedPost.id)
                              ? "✓ Posted to Facebook"
                              : "Post to Facebook"}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Right column - Content */}
                <div
                  className="post-modal-right-col"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {/* Caption */}
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: 0.5,
                        opacity: 0.6,
                        marginBottom: 8,
                      }}
                    >
                      Caption
                    </div>
                    <div
                      style={{
                        background: "#0b1220",
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {selectedPost.caption}
                    </div>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                        padding: "6px 12px",
                        color: "#e6edf7",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        marginTop: 8,
                      }}
                      onClick={() =>
                        handleCopyField(selectedPost.caption, "caption")
                      }
                      className="hover-btn"
                    >
                      {copiedField === "caption" ? "✓ Copied!" : "Copy Caption"}
                    </button>
                  </div>

                  {/* Hashtags */}
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: 0.5,
                        opacity: 0.6,
                        marginBottom: 8,
                      }}
                    >
                      Hashtags
                    </div>
                    <div
                      style={{
                        background: "#0b1220",
                        borderRadius: 10,
                        padding: 14,
                        fontSize: 14,
                        lineHeight: 1.6,
                      }}
                    >
                      {selectedPost.hashtags}
                    </div>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                        padding: "6px 12px",
                        color: "#e6edf7",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                        marginTop: 8,
                      }}
                      onClick={() =>
                        handleCopyField(selectedPost.hashtags, "hashtags")
                      }
                      className="hover-btn"
                    >
                      {copiedField === "hashtags"
                        ? "✓ Copied!"
                        : "Copy Hashtags"}
                    </button>
                  </div>

                  {/* Metadata */}
                  <div style={{ marginBottom: 20 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase" as const,
                        letterSpacing: 0.5,
                        opacity: 0.6,
                        marginBottom: 8,
                      }}
                    >
                      Post Details
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          background: "#0b1220",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            opacity: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          Niche
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {selectedPost.niche || "—"}
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#0b1220",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            opacity: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          Audience
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {selectedPost.audience || "—"}
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#0b1220",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            opacity: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          Tone
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {selectedPost.tone}
                        </div>
                      </div>
                      <div
                        style={{
                          background: "#0b1220",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            opacity: 0.5,
                            marginBottom: 4,
                          }}
                        >
                          Image Style
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {selectedPost.imageStyle}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      marginTop: 20,
                      paddingTop: 20,
                      borderTop: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <button
                      style={{
                        background: "rgba(255, 99, 99, 0.15)",
                        border: "1px solid rgba(255, 99, 99, 0.3)",
                        borderRadius: 8,
                        padding: "10px 16px",
                        color: "#ff9999",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => handleDeletePost(selectedPost.id)}
                      className="hover-btn"
                    >
                      Delete Post
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        padding: "10px 16px",
                        color: "#e6edf7",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        transition: "all 0.15s ease",
                      }}
                      onClick={() =>
                        handleCopyField(
                          `${selectedPost.caption}\n\n${selectedPost.hashtags}`,
                          "all"
                        )
                      }
                      className="hover-btn"
                    >
                      {copiedField === "all" ? "✓ Copied!" : "Copy All"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Profile Modal */}
        {showNewProfile && (
          <div
            style={styles.modal}
            onClick={() => {
              setShowNewProfile(false);
              setProfileStep(1);
            }}
          >
            <div
              style={{
                ...styles.modalContent,
                ...(!editingProfile
                  ? {
                      background:
                        "linear-gradient(180deg, #141f38 0%, #101a33 100%)",
                      border: "1px solid rgba(44, 107, 237, 0.2)",
                      boxShadow:
                        "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(44,107,237,0.08)",
                    }
                  : {}),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {!editingProfile && (
                <div style={{ textAlign: "center" as const, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background:
                        "linear-gradient(135deg, rgba(44, 107, 237, 0.2) 0%, rgba(124, 58, 237, 0.15) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                      margin: "0 auto 12px",
                    }}
                  >
                    ✨
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 8, textAlign: "center" as const }}>
                <div style={styles.modalTitle}>
                  {editingProfile ? "Edit Brand Profile" : "Brand Setup"}
                </div>
              </div>

              {/* Step progress dots (steps 1-4 for new, 1-4 for editing) */}
              {(() => {
                const totalSteps = 4;
                const stepLabels = ["Name", "About", "Tone", "Brand"];
                return (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 24 }}>
                    {stepLabels.map((label, i) => {
                      const stepNum = i + 1;
                      const isActive = profileStep === stepNum;
                      const isDone = profileStep > stepNum;
                      return (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: isActive ? 28 : 8,
                            height: 8,
                            borderRadius: 4,
                            background: isDone ? "#22c55e" : isActive ? "#2c6bed" : "rgba(255,255,255,0.15)",
                            transition: "all 0.3s ease",
                          }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* STEP 1: Brand Name */}
              {profileStep === 1 && (
                <div>
                  <div style={{ marginBottom: 20, textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>✨</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#e6edf7", marginBottom: 6 }}>
                      {editingProfile ? "Brand name" : "What should we call you?"}
                    </div>
                    <div style={{ fontSize: 13, color: "#8fa3bf" }}>
                      The name of your business or brand.
                    </div>
                  </div>
                  <input
                    style={{ ...styles.input, fontSize: 15, padding: "14px 16px", marginBottom: 16 }}
                    placeholder="e.g., The Martinez Group"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && newProfileName.trim()) setProfileStep(2); }}
                  />
                  <button
                    style={{
                      width: "100%",
                      background: newProfileName.trim() ? "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)" : "rgba(44,107,237,0.2)",
                      border: "none", borderRadius: 12, padding: "14px 20px",
                      color: "#fff", fontSize: 15, fontWeight: 700,
                      cursor: newProfileName.trim() ? "pointer" : "default",
                      opacity: newProfileName.trim() ? 1 : 0.5, marginBottom: 16,
                      fontFamily: "Verdana, Geneva, sans-serif",
                    }}
                    onClick={() => { if (newProfileName.trim()) setProfileStep(2); }}
                  >
                    Next →
                  </button>
                  {!editingProfile && (
                    <div style={{ textAlign: "center" as const }}>
                      <button
                        style={{ background: "transparent", border: "none", opacity: 0.5, fontSize: 13, color: "#8fa3bf", cursor: "pointer", padding: "8px 12px", fontFamily: "Verdana, Geneva, sans-serif" }}
                        onClick={() => {
                          setShowNewProfile(false); setProfileStep(1);
                          setNewProfileName(""); setNewProfileNiche(""); setNewProfileAudience("");
                          setNewProfilePrimaryColor("#000000"); setNewProfileSecondaryColor("#ffffff");
                          setNewProfileLogo(""); setNewProfileWebsite(""); setEditingProfile(null);
                        }}
                      >
                        I&apos;ll do this later
                      </button>
                      <div style={{ fontSize: 11, color: "#5a6a80", marginTop: 4 }}>
                        You can always set this up from the dashboard.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: Niche + Audience */}
              {profileStep === 2 && (
                <div>
                  <div style={{ marginBottom: 20, textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>🎯</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#e6edf7", marginBottom: 6 }}>Tell us about your business</div>
                    <div style={{ fontSize: 13, color: "#8fa3bf" }}>This shapes every post the AI creates for you.</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: 16, marginBottom: 24 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 6, display: "block" }}>Your niche</label>
                      <input
                        style={{ ...styles.input, marginBottom: 4 }}
                        value={newProfileNiche}
                        onChange={(e) => setNewProfileNiche(e.target.value)}
                        placeholder='e.g. "Fitness Coach", "Plumber", "Realtor"'
                        autoFocus
                      />
                      <div style={{ fontSize: 12, color: "#8fa3bf" }}>Your industry or specialty — AI builds your calendar around this.</div>
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 6, display: "block" }}>Who you help most</label>
                      <input
                        style={{ ...styles.input, marginBottom: 4 }}
                        placeholder="e.g., Young professionals, local homeowners"
                        value={newProfileAudience}
                        onChange={(e) => setNewProfileAudience(e.target.value)}
                      />
                      <div style={{ fontSize: 12, color: "#8fa3bf" }}>Your typical clients. Shapes tone and focus of every post.</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={{ ...styles.btn, flex: 1 }} onClick={() => setProfileStep(1)}>← Back</button>
                    <button
                      style={{ ...styles.btn, flex: 2, background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)", border: "none", color: "#fff", fontWeight: 700 }}
                      onClick={() => setProfileStep(3)}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Tone of Voice */}
              {profileStep === 3 && (
                <div>
                  <div style={{ marginBottom: 20, textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>🎙️</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#e6edf7", marginBottom: 6 }}>How do you sound?</div>
                    <div style={{ fontSize: 13, color: "#8fa3bf" }}>Sets the default voice for all your posts. You can override it per post anytime.</div>
                  </div>
                  <select
                    value={newProfileTone}
                    onChange={(e) => setNewProfileTone(e.target.value)}
                    style={{ ...styles.input, marginBottom: 24, width: "100%", cursor: "pointer", appearance: "auto" as any }}
                  >
                    {["Confident","Friendly","Playful","Professional","Luxury","Minimal","Bold","Witty","Inspirational","Educational","Direct","Warm","Premium","Cozy","Energetic","Modern","Rustic","Casual","Hype (but not cringe)"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={{ ...styles.btn, flex: 1 }} onClick={() => setProfileStep(2)}>← Back</button>
                    <button
                      style={{ ...styles.btn, flex: 2, background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)", border: "none", color: "#fff", fontWeight: 700 }}
                      onClick={() => setProfileStep(4)}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Brand Colors + Logo + Website */}
              {profileStep === 4 && (
                <div>
                  <div style={{ marginBottom: 20, textAlign: "center" as const }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>🎨</div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: "#e6edf7", marginBottom: 6 }}>Brand details</div>
                    <div style={{ fontSize: 13, color: "#8fa3bf" }}>Optional — skip if you want to set these up later.</div>
                  </div>

                  {/* Colors */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 12 }}>Brand Colors</div>
                    <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, display: "block" }}>
                          Primary <span style={{ color: "#8fa3bf" }}>(main brand color)</span>
                        </label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="color" value={newProfilePrimaryColor} onChange={(e) => setNewProfilePrimaryColor(e.target.value)} style={{ width: 40, height: 40, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, background: "transparent", cursor: "pointer", flexShrink: 0 }} />
                          <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="#000000" value={newProfilePrimaryColor} onChange={(e) => setNewProfilePrimaryColor(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, display: "block" }}>
                          Secondary <span style={{ color: "#8fa3bf" }}>(accent or background)</span>
                        </label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="color" value={newProfileSecondaryColor} onChange={(e) => setNewProfileSecondaryColor(e.target.value)} style={{ width: 40, height: 40, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, background: "transparent", cursor: "pointer", flexShrink: 0 }} />
                          <input style={{ ...styles.input, marginBottom: 0, flex: 1 }} placeholder="#ffffff" value={newProfileSecondaryColor} onChange={(e) => setNewProfileSecondaryColor(e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logo */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 6 }}>Brand Logo</div>
                    <div style={{ fontSize: 12, color: "#8fa3bf", marginBottom: 10 }}>Optional. Appears in the corner of generated images.</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {newProfileLogo ? (
                        <div style={{ position: "relative" as const, flexShrink: 0 }}>
                          <img src={newProfileLogo} alt="Brand logo" style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, border: `2px solid ${newProfileSecondaryColor}`, padding: 4 }} />
                          <button onClick={() => setNewProfileLogo("")} style={{ position: "absolute" as const, top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "#ff4444", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Verdana, Geneva, sans-serif" }}>×</button>
                        </div>
                      ) : (
                        <div onClick={() => logoInputRef.current?.click()} style={{ width: 60, height: 60, borderRadius: 8, border: "1.5px dashed rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#8fa3bf", fontSize: 24, flexShrink: 0, background: "rgba(255,255,255,0.03)" }}>+</div>
                      )}
                      <div>
                        <button onClick={() => logoInputRef.current?.click()} style={{ ...styles.btn, fontSize: 13, padding: "8px 14px", marginBottom: 4 }}>{newProfileLogo ? "Replace logo" : "Upload logo"}</button>
                        <div style={{ fontSize: 11, color: "#8fa3bf" }}>PNG, JPG, SVG. Max 2MB.</div>
                      </div>
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" style={{ display: "none" }} onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { addToast("Logo too large. Max 2MB.", "error"); return; }
                      const reader = new FileReader();
                      reader.onload = async () => { const dataUrl = reader.result as string; const resized = await resizeLogoForStorage(dataUrl); setNewProfileLogo(resized); };
                      reader.readAsDataURL(file);
                      e.target.value = "";
                    }} />
                  </div>

                  {/* Website */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 6, display: "block" }}>Website <span style={{ fontSize: 12, color: "#8fa3bf", fontWeight: 400 }}>(optional)</span></label>
                    <input style={{ ...styles.input, marginBottom: 0 }} placeholder="e.g., www.yourbusiness.com" value={newProfileWebsite} onChange={(e) => setNewProfileWebsite(e.target.value)} />
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button style={{ ...styles.btn, flex: 1 }} onClick={() => setProfileStep(3)}>← Back</button>
                    <button
                      style={{ ...styles.btn, flex: 2, background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)", border: "none", color: "#fff", fontWeight: 700 }}
                      onClick={handleCreateProfile}
                    >
                      {editingProfile ? "Update Profile ✓" : "Save Profile ✓"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CSS */}
        <style>{`
        .hover-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .primary-action-card:hover {
          border-color: rgba(44,107,237,0.4) !important;
          box-shadow: 0 8px 25px rgba(0,0,0,0.4), 0 4px 12px rgba(44,107,237,0.2) !important;
          transform: translateY(-3px) !important;
        }
        .hover-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .my-library-link:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(124,58,237,0.3) !important; }
        .hover-btn-primary:hover { background: #357ae8 !important; transform: translateY(-1px); }
        .enhanced-cta:hover {
          background: #357ae8 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 12px 28px rgba(44,107,237,0.45), 0 4px 12px rgba(44,107,237,0.3) !important;
        }
        .primary-section { margin-bottom: 100px; }
        .dash-side-by-side { margin-bottom: 24px; }
        .dash-social-col { align-self: stretch; justify-content: flex-start; }

        @media (max-width: 768px) {
          .ath-page { padding: 10px !important; overflow-x: hidden !important; }
          .ath-page * { max-width: 100%; box-sizing: border-box; }
        }
        @media (max-width: 960px) {
          .ath-actionGrid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .dash-side-by-side { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }

        }
        @media (max-width: 900px) {
          .profile-benefits-pill-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 768px) {
          /* 2-col action grid compacted on mobile */
          .ath-actionGrid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .ath-card-body { display: none !important; }
          .calendar-card-subtitle { display: none !important; }
          .calendar-card-btn { display: none !important; }
          .ath-card-header { padding: 16px 8px 14px !important; }
          .ath-card-icon { font-size: 30px !important; margin: 0 auto 6px !important; width: 40px !important; height: 40px !important; display: block !important; }
          .ath-card-title { font-size: 12px !important; margin-bottom: 0 !important; }
          .ath-card-subtitle { display: none !important; }
          .dash-side-by-side { grid-template-columns: 1fr !important; }
          .ath-recentPostsGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .post-modal-two-col { flex-direction: column !important; }
          .post-modal-left-col { flex: 1 !important; }
          .primary-section { margin-bottom: 60px; }
          .profile-benefits-grid { grid-template-columns: 1fr !important; }
          .how-it-works-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
          .profile-bar { flex-wrap: wrap !important; gap: 12px !important; }
          .profile-bar-left { flex-wrap: wrap !important; gap: 10px !important; }
          .profile-bar-right { width: 100% !important; justify-content: flex-end !important; }
          .user-identity-pill { right: 16px !important; top: 16px !important; }
        }
        @media (max-width: 700px) {
          .profile-form-grid { grid-template-columns: 1fr !important; }
          .profile-colors-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 560px) {
          .profile-benefits-pill-grid {
            grid-template-columns: 1fr !important;
          }
          .profile-benefits-pill-grid > div {
            white-space: normal !important;
          }
          .view-posts-btn { padding: 6px 10px !important; font-size: 11px !important; }
        }
        @media (max-width: 480px) {
          .ath-recentPostsGrid { grid-template-columns: 1fr !important; }
          .how-it-works-grid { grid-template-columns: 1fr !important; }
        }
        /* Token pill stays top-left on narrow screens (no longer needs to stack) */
        @media (max-width: 540px) {
          .ath-token-pill { top: 16px !important; left: 16px !important; right: auto !important; }
          /* Cap email pill so it can't overlap token pill on left */
          .ath-email-pill { max-width: 140px !important; }
          .ath-email-pill > div { max-width: 100% !important; padding: 6px 10px !important; font-size: 11px !important; }
          /* Push page header below email pill on right + token pill on left */
          .dash-page-header { padding-top: 80px !important; }
          /* Calendar card: collapse to icon+title+arrow only on mobile */
          .calendar-card-inner { padding: 16px !important; gap: 12px !important; }
          .calendar-card-divider { display: none !important; }
          .calendar-card-cta { padding: 10px 14px !important; font-size: 13px !important; }
          .calendar-card-cta-text::after { content: "→"; }
          .calendar-card-cta-full { display: none !important; }
        }
        /* Sub-480px: tighten modal padding, ensure single-column layouts */
        @media (max-width: 420px) {
          .ath-page { padding: 8px !important; }
          .post-modal-two-col { gap: 12px !important; }
        }
      `}</style>
      </div>
    </div>
  );
}
