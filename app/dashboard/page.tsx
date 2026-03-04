"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { getImage, deleteImage } from "../lib/imageStorage";
import { useTokenBalance } from "../lib/useTokenBalance";
import { useToast } from "../_components/ToastProvider";
import {
  useBrandProfiles,
  type BrandProfile,
} from "../lib/useBrandProfiles";
import { useInstagram } from "../lib/useInstagram";
import { useFacebook } from "../lib/useFacebook";

type SavedPost = {
  id: string;
  profileId?: string;
  calendarDay?: number;
  month?: string;
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
  const [profileStep, setProfileStep] = useState<1 | 2>(1);

  // Load posts from localStorage
  useEffect(() => {
    window.scrollTo(0, 0);

    try {
      const savedPosts = localStorage.getItem("ath_gallery");
      if (savedPosts) {
        const posts = JSON.parse(savedPosts) as SavedPost[];
        posts.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const recent = posts.slice(0, 3);
        setRecentPosts(recent);

        recent.forEach(async (post) => {
          const img = await getImage(post.id);
          if (img) {
            setPostImages((prev) => ({ ...prev, [post.id]: img }));
          }
        });
      }
    } catch {}
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
        addToast("No active subscription found. Redirecting to plans...", "info");
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
    setProfileStep(2);
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
    setEditingProfile(null);
    setProfileStep(1);
    setShowNewProfile(false);
  };

  const handleCopyField = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    addToast(field === "caption" ? "Caption copied!" : field === "hashtags" ? "Hashtags copied!" : "Copied!", "success");
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
      padding: 20,
      boxSizing: "border-box",
      fontFamily: "Verdana, Geneva, sans-serif",
    },
    container: {
      maxWidth: 1280,
      margin: "0 auto",
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: 700,
      letterSpacing: 1,
      margin: 0,
      textTransform: "uppercase" as const,
    },
    subtitle: {
      margin: "8px 0 0 0",
      opacity: 0.7,
      fontSize: 15,
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
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 16,
    },
    actionCard: {
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 16,
      padding: 24,
      cursor: "pointer",
      transition: "all 0.15s ease",
      textAlign: "center" as const,
      boxShadow: "0 6px 18px rgba(0,0,0,0.35), 0 2px 6px rgba(44,107,237,0.1)",
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
      padding: 12,
      paddingTop: 20,
      overflowY: "auto" as const,
      overflowX: "hidden" as const,
      WebkitOverflowScrolling: "touch" as const,
    },
    modalContent: {
      background: "#101a33",
      borderRadius: 16,
      padding: 20,
      width: "min(920px, calc(100vw - 24px))",
      maxWidth: "100%",
      maxHeight: "none",
      marginBottom: 20,
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
    <div style={styles.page} className="ath-page">
      <div style={{ ...styles.container, position: "relative" }}>
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
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <span style={{
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
            }}>
              🏡 Built for Real Estate Agents
            </span>
          </div>

          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: 1,
              margin: 0,
              background:
                "linear-gradient(135deg, #e6edf7 0%, #7eb3ff 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            AI Social Helper
          </h1>

          <p style={{ margin: "8px 0 0 0", fontSize: 14, opacity: 0.55, fontWeight: 500 }}>
            AI-generated listing posts, market updates &amp; content — in seconds.
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
                    background: !tokenBalance.isLoading && !tokenBalance.error && tokenBalance.tokensRemaining <= 0
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(34, 197, 94, 0.1)",
                    border: !tokenBalance.isLoading && !tokenBalance.error && tokenBalance.tokensRemaining <= 0
                      ? "1px solid rgba(239, 68, 68, 0.2)"
                      : "1px solid rgba(34, 197, 94, 0.2)",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    color: !tokenBalance.isLoading && !tokenBalance.error && tokenBalance.tokensRemaining <= 0
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
                style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}
              >
                <div
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    background: "rgba(44, 107, 237, 0.1)",
                    border: "1px solid rgba(44, 107, 237, 0.2)",
                    borderRadius: 20,
                    padding: "6px 14px",
                    fontSize: 12,
                    color: "#7eb3ff",
                    fontWeight: 600,
                    fontFamily: "Verdana, Geneva, sans-serif",
                    maxWidth: 220,
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

        {/* Side-by-side: Agent Profile + Social Connections */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }} className="dash-side-by-side">

        {/* Brand Profiles section - always show */}
        <div style={{ ...styles.heroSection, flex: 1, marginBottom: 0 }} className="primary-section">
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Your Agent Profile
                <span style={styles.stepPill}>Step 1</span>
              </h2>
              <p style={styles.instructionText}>
                {profiles.length === 0
                  ? "Set up your agent profile so every post sounds like you."
                  : "Manage your agent profiles — switch between markets or listings."}
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
                  Set up your realtor profile in 30 seconds:
                </div>

                {/* What you'll save - 3-column pill grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 14,
                    marginBottom: 24,
                    alignItems: "center",
                  }}
                  className="profile-benefits-pill-grid"
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(126,179,255,0.18)",
                      background: "rgba(16,26,51,0.35)",
                      color: "#cbd6ea",
                      fontWeight: 700,
                      fontSize: 16,
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "#7eb3ff",
                        opacity: 0.9,
                        flexShrink: 0,
                      }}
                    />
                    Brand colors
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(126,179,255,0.18)",
                      background: "rgba(16,26,51,0.35)",
                      color: "#cbd6ea",
                      fontWeight: 700,
                      fontSize: 16,
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "#7eb3ff",
                        opacity: 0.9,
                        flexShrink: 0,
                      }}
                    />
                    Market + buyers
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(126,179,255,0.18)",
                      background: "rgba(16,26,51,0.35)",
                      color: "#cbd6ea",
                      fontWeight: 700,
                      fontSize: 16,
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "#7eb3ff",
                        opacity: 0.9,
                        flexShrink: 0,
                      }}
                    />
                    Tone of voice
                  </div>
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
                  One setup. Every listing post sounds like you.
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
                  Create Your Agent Profile
                </button>
              </div>
            </div>
          ) : (
            /* Show profiles list when profiles exist */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
                      {profile.id === activeProfileId ? "Active" : "Activate"}
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
                  style={{ fontSize: 14, fontWeight: 600, color: "#7eb3ff" }}
                >
                  Add Agent Profile
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Social Connections */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, flex: "0 0 300px", minWidth: 260 }} className="dash-social-col">

        {/* Instagram Connection */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(131,58,180,0.1) 0%, rgba(253,29,29,0.08) 50%, rgba(252,176,69,0.06) 100%)",
            border: "1px solid rgba(253,29,29,0.2)",
            borderRadius: 16,
            padding: "20px 24px",
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap" as const,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <linearGradient id="igGrad" x1="0" y1="24" x2="24" y2="0">
                  <stop offset="0%" stopColor="#feda75"/>
                  <stop offset="25%" stopColor="#fa7e1e"/>
                  <stop offset="50%" stopColor="#d62976"/>
                  <stop offset="75%" stopColor="#962fbf"/>
                  <stop offset="100%" stopColor="#4f5bd5"/>
                </linearGradient>
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#igGrad)" strokeWidth="2" fill="none"/>
                <circle cx="12" cy="12" r="4.5" stroke="url(#igGrad)" strokeWidth="2" fill="none"/>
                <circle cx="17.5" cy="6.5" r="1.2" fill="url(#igGrad)"/>
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
                  : "Share listings & market updates directly to Instagram"}
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
                background: "linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)",
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
            background: "linear-gradient(135deg, rgba(24,119,242,0.1) 0%, rgba(66,103,178,0.08) 100%)",
            border: "1px solid rgba(24,119,242,0.2)",
            borderRadius: 16,
            padding: "20px 24px",
            marginTop: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap" as const,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 28 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" stroke="#1877F2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
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
                  : "Share listings & open houses directly to Facebook"}
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

        </div>{/* end dash-social-col */}
        </div>{/* end dash-side-by-side */}

        {/* Main Actions - Enhanced Cards */}
        <div style={styles.section}>
          <div style={styles.actionGrid} className="ath-actionGrid">
            {/* Generate a Post Card */}
            <div
              style={{
                ...styles.actionCard,
                padding: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column" as const,
              }}
              className="primary-action-card hover-card"
              onClick={() => { setNavLoading("generator"); router.push("/generator"); }}
            >
              {/* Card Header with gradient */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                  padding: "24px 24px 20px",
                  textAlign: "center" as const,
                }}
              >
                <img src="/logo-icon.png" alt="AI Social Helper" style={{ width: 64, height: 64, marginBottom: 8, objectFit: "contain", display: "block", margin: "0 auto 8px" }} />
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  Generate a Post
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  One post, done in seconds
                </div>
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: "20px 24px 24px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column" as const,
                }}
              >
                {/* What you get */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.5,
                    marginBottom: 12,
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                  }}
                >
                  What you get
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column" as const,
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>🏡</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Listing post, market update, or client story
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>✍️</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Caption written in your brand voice
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>#️⃣</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Real estate hashtags, ready to copy
                    </span>
                  </div>
                </div>

                {/* Best for */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.5,
                    marginBottom: 8,
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                  }}
                >
                  Best for
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    lineHeight: 1.5,
                    marginBottom: 20,
                  }}
                >
                  A new listing just hit, you need a quick market post, or a
                  client just gave you a great review.
                </div>

                {/* CTA Button */}
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
                  {navLoading === "generator" ? "Loading…" : "Create a Post →"}
                </div>
              </div>
            </div>

            {/* Plan Your Month Card */}
            <div
              style={{
                ...styles.actionCard,
                padding: 0,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column" as const,
              }}
              className="primary-action-card hover-card"
              onClick={() => { setNavLoading("calendar"); router.push("/calendar"); }}
            >
              {/* Card Header with gradient */}
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                  padding: "24px 24px 20px",
                  textAlign: "center" as const,
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 8 }}>📅</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  Plan Your Month
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Your full month, planned for you
                </div>
              </div>

              {/* Card Body */}
              <div
                style={{
                  padding: "20px 24px 24px",
                  flex: 1,
                  display: "flex",
                  flexDirection: "column" as const,
                }}
              >
                {/* What you get */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.5,
                    marginBottom: 12,
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                  }}
                >
                  What you get
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column" as const,
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>🗓️</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      5-pillar weekly plan built for realtors
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>📊</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Mon: Market · Tue: Listing · Wed: Tip...
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>🎯</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Click any day to generate that post instantly
                    </span>
                  </div>
                </div>

                {/* Best for */}
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    opacity: 0.5,
                    marginBottom: 8,
                    textTransform: "uppercase" as const,
                    letterSpacing: 1,
                  }}
                >
                  Best for
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.7,
                    lineHeight: 1.5,
                    marginBottom: 20,
                  }}
                >
                  Agents who want to show up daily without thinking about what
                  to post — or when.
                </div>

                {/* CTA Button */}
                <div
                  style={{
                    marginTop: "auto",
                    background: "#7c3aed",
                    borderRadius: 10,
                    padding: "14px 20px",
                    textAlign: "center" as const,
                    fontWeight: 700,
                    fontSize: 14,
                    transition: "all 0.15s ease",
                  }}
                >
                  {navLoading === "calendar" ? "Loading…" : "Open Calendar →"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section - Enhanced */}
        <div style={{ ...styles.section, marginBottom: 28, marginTop: 28 }}>
          <div
            style={{
              background: "linear-gradient(135deg, #15233d 0%, #1a1a2e 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "28px 32px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}
          >
            {/* Section Header */}
            <div style={{ textAlign: "center" as const, marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#7eb3ff",
                  marginBottom: 6,
                  textTransform: "uppercase" as const,
                  letterSpacing: 2,
                }}
              >
                Simple 4-Step Process
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>How It Works</div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}
              className="how-it-works-grid"
            >
              {/* Step 1 */}
              <div
                style={{
                  background: "rgba(44, 107, 237, 0.08)",
                  border: "1px solid rgba(44, 107, 237, 0.2)",
                  borderRadius: 16,
                  padding: "20px 16px",
                  textAlign: "center" as const,
                  position: "relative" as const,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, #2c6bed 0%, #1e4fc2 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(44, 107, 237, 0.4)",
                  }}
                >
                  1
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: "#e6edf7",
                  }}
                >
                  Create Profile
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>
                  Save your brand colors, tone & audience once
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  background: "rgba(124, 58, 237, 0.08)",
                  border: "1px solid rgba(124, 58, 237, 0.2)",
                  borderRadius: 16,
                  padding: "20px 16px",
                  textAlign: "center" as const,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.4)",
                  }}
                >
                  2
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: "#e6edf7",
                  }}
                >
                  Choose Post Type
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>
                  Listing, market update, educational tip, social proof, or community
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  background: "rgba(236, 72, 153, 0.08)",
                  border: "1px solid rgba(236, 72, 153, 0.2)",
                  borderRadius: 16,
                  padding: "20px 16px",
                  textAlign: "center" as const,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(236, 72, 153, 0.4)",
                  }}
                >
                  3
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: "#e6edf7",
                  }}
                >
                  AI Generates
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>
                  Custom image + caption + hashtags instantly
                </div>
              </div>

              {/* Step 4 */}
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  borderRadius: 16,
                  padding: "20px 16px",
                  textAlign: "center" as const,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background:
                      "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 14px",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    boxShadow: "0 4px 12px rgba(34, 197, 94, 0.4)",
                  }}
                >
                  ✓
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    marginBottom: 6,
                    color: "#e6edf7",
                  }}
                >
                  Post & Save
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.5 }}>
                  Download image & copy caption to post
                </div>
              </div>
            </div>
          </div>

          {/* Recent Posts & Gallery Section */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
              borderRadius: 16,
              padding: 24,
              marginTop: 40,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              </div>
            </div>

            {recentPosts.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
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
                    {/* Always show actual images when available */}
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
                          background: "linear-gradient(135deg, rgba(44, 107, 237, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%)",
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
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 16 }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{selectedPost.postType}</div>
                  <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                    {formatDate(selectedPost.createdAt)}
                    {selectedPost.calendarDay && ` • Day ${selectedPost.calendarDay}`}
                  </div>
                </div>
                <button
                  style={{ background: "none", border: "none", color: "#e6edf7", fontSize: 24, cursor: "pointer", padding: 0, lineHeight: 1 }}
                  onClick={() => setSelectedPost(null)}
                >
                  ×
                </button>
              </div>

              {/* Two-column layout */}
              <div className="post-modal-two-col" style={{ display: "flex", gap: 24, flexDirection: "row" as const }}>
                {/* Left column - Image */}
                <div className="post-modal-left-col" style={{ flex: "0 0 45%", minWidth: 0 }}>
                  {postImages[selectedPost.id] && (
                    <div>
                      <div style={{ borderRadius: 12, overflow: "hidden", background: "#0b1220", marginBottom: 12 }}>
                        <img
                          src={postImages[selectedPost.id]}
                          alt="Generated post"
                          style={{ width: "100%", height: "auto", display: "block" }}
                        />
                      </div>
                      <button
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
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
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Image
                      </button>

                      {/* Publish buttons */}
                      {instagram.connected && (
                        <button
                          onClick={() => {
                            if (igPublishingId === selectedPost.id || igPublishedIds.has(selectedPost.id)) return;
                            setIgPublishingId(selectedPost.id);
                            instagram.publish(postImages[selectedPost.id], selectedPost.caption, selectedPost.hashtags)
                              .then(() => {
                                setIgPublishedIds(prev => new Set(prev).add(selectedPost.id));
                                addToast(`Posted to @${instagram.username}!`, "success");
                              })
                              .catch((err: any) => {
                                addToast(err?.message || "Failed to post", "error");
                              })
                              .finally(() => setIgPublishingId(null));
                          }}
                          disabled={igPublishingId === selectedPost.id || igPublishedIds.has(selectedPost.id)}
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
                            cursor: igPublishingId === selectedPost.id || igPublishedIds.has(selectedPost.id) ? "not-allowed" : "pointer",
                            opacity: igPublishingId === selectedPost.id || igPublishedIds.has(selectedPost.id) ? 0.7 : 1,
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
                            if (fbPublishingId === selectedPost.id || fbPublishedIds.has(selectedPost.id)) return;
                            setFbPublishingId(selectedPost.id);
                            facebook.publish(postImages[selectedPost.id], selectedPost.caption, selectedPost.hashtags)
                              .then(() => {
                                setFbPublishedIds(prev => new Set(prev).add(selectedPost.id));
                                addToast(`Posted to ${facebook.pageName}!`, "success");
                              })
                              .catch((err: any) => {
                                addToast(err?.message || "Failed to post to Facebook", "error");
                              })
                              .finally(() => setFbPublishingId(null));
                          }}
                          disabled={fbPublishingId === selectedPost.id || fbPublishedIds.has(selectedPost.id)}
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
                            cursor: fbPublishingId === selectedPost.id || fbPublishedIds.has(selectedPost.id) ? "not-allowed" : "pointer",
                            opacity: fbPublishingId === selectedPost.id || fbPublishedIds.has(selectedPost.id) ? 0.7 : 1,
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
                <div className="post-modal-right-col" style={{ flex: 1, minWidth: 0 }}>
                  {/* Caption */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, opacity: 0.6, marginBottom: 8 }}>Caption</div>
                    <div style={{ background: "#0b1220", borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.6 }}>{selectedPost.caption}</div>
                    <button
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 12px", color: "#e6edf7", cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 8 }}
                      onClick={() => handleCopyField(selectedPost.caption, "caption")}
                      className="hover-btn"
                    >
                      {copiedField === "caption" ? "✓ Copied!" : "Copy Caption"}
                    </button>
                  </div>

                  {/* Hashtags */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, opacity: 0.6, marginBottom: 8 }}>Hashtags</div>
                    <div style={{ background: "#0b1220", borderRadius: 10, padding: 14, fontSize: 14, lineHeight: 1.6 }}>{selectedPost.hashtags}</div>
                    <button
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "6px 12px", color: "#e6edf7", cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 8 }}
                      onClick={() => handleCopyField(selectedPost.hashtags, "hashtags")}
                      className="hover-btn"
                    >
                      {copiedField === "hashtags" ? "✓ Copied!" : "Copy Hashtags"}
                    </button>
                  </div>

                  {/* Metadata */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: 0.5, opacity: 0.6, marginBottom: 8 }}>Post Details</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                      <div style={{ background: "#0b1220", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Niche</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedPost.niche || "—"}</div>
                      </div>
                      <div style={{ background: "#0b1220", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Audience</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedPost.audience || "—"}</div>
                      </div>
                      <div style={{ background: "#0b1220", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Tone</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedPost.tone}</div>
                      </div>
                      <div style={{ background: "#0b1220", borderRadius: 8, padding: 12 }}>
                        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>Image Style</div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedPost.imageStyle}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 12, marginTop: 20, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <button
                      style={{ background: "rgba(255, 99, 99, 0.15)", border: "1px solid rgba(255, 99, 99, 0.3)", borderRadius: 8, padding: "10px 16px", color: "#ff9999", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s ease" }}
                      onClick={() => handleDeletePost(selectedPost.id)}
                      className="hover-btn"
                    >
                      Delete Post
                    </button>
                    <div style={{ flex: 1 }} />
                    <button
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 16px", color: "#e6edf7", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.15s ease" }}
                      onClick={() => handleCopyField(`${selectedPost.caption}\n\n${selectedPost.hashtags}`, "all")}
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
          <div style={styles.modal} onClick={() => { setShowNewProfile(false); setProfileStep(1); }}>
            <div
              style={{
                ...styles.modalContent,
                ...(!editingProfile ? {
                  background: "linear-gradient(180deg, #141f38 0%, #101a33 100%)",
                  border: "1px solid rgba(44, 107, 237, 0.2)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(44,107,237,0.08)",
                } : {}),
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {!editingProfile && (
                <div style={{ textAlign: "center" as const, marginBottom: 8 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "linear-gradient(135deg, rgba(44, 107, 237, 0.2) 0%, rgba(124, 58, 237, 0.15) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    margin: "0 auto 12px",
                  }}>
                    ✨
                  </div>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 16,
                  justifyContent: !editingProfile ? "center" as const : "flex-start" as const,
                }}
              >
                <div style={styles.modalTitle}>
                  {editingProfile
                    ? "Edit Brand Profile"
                    : "Welcome! Let\u2019s set up your brand"}
                </div>
                <span
                  style={{
                    background: "rgba(44, 107, 237, 0.2)",
                    border: "1px solid rgba(44, 107, 237, 0.3)",
                    borderRadius: 12,
                    padding: "3px 8px",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#7eb3ff",
                    marginLeft: 12,
                    textTransform: "uppercase" as const,
                    letterSpacing: 0.5,
                  }}
                >
                  {editingProfile ? "Editing" : "Takes 30 seconds"}
                </span>
              </div>

              <div
                style={{
                  fontSize: 14,
                  opacity: 0.8,
                  marginBottom: 24,
                  lineHeight: 1.5,
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  textAlign: !editingProfile ? "center" as const : "left" as const,
                }}
              >
                {editingProfile
                  ? "Update your brand details below."
                  : `Nice to meet you${newProfileName ? `, ${newProfileName}` : ""}! Two quick questions and you're all set.`}
              </div>

              {/* Step 1: Name only */}
              {profileStep === 1 && !editingProfile ? (
                <div>
                  <label style={{ fontSize: 14, fontWeight: 700, color: "#e6edf7", marginBottom: 6, display: "block" }}>
                    What should we call you?
                  </label>
                  <div style={{ fontSize: 13, color: "#8fa3bf", marginBottom: 14, lineHeight: 1.5 }}>
                    Your name, team name, or brokerage — whatever you go by.
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
                      background: newProfileName.trim()
                        ? "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)"
                        : "rgba(44, 107, 237, 0.2)",
                      border: "none",
                      borderRadius: 12,
                      padding: "16px 20px",
                      color: "#fff",
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: newProfileName.trim() ? "pointer" : "default",
                      transition: "all 0.2s ease",
                      opacity: newProfileName.trim() ? 1 : 0.5,
                      marginBottom: 20,
                      fontFamily: "Verdana, Geneva, sans-serif",
                    }}
                    onClick={() => { if (newProfileName.trim()) setProfileStep(2); }}
                  >
                    Let&apos;s go →
                  </button>
                  <div style={{ textAlign: "center" as const }}>
                    <button
                      style={{
                        background: "transparent",
                        border: "none",
                        opacity: 0.5,
                        fontSize: 13,
                        color: "#8fa3bf",
                        cursor: "pointer",
                        padding: "8px 12px",
                        fontFamily: "Verdana, Geneva, sans-serif",
                      }}
                      onClick={() => {
                        setShowNewProfile(false);
                        setProfileStep(1);
                        setNewProfileName("");
                        setNewProfileNiche("");
                        setNewProfileAudience("");
                        setNewProfilePrimaryColor("#000000");
                        setNewProfileSecondaryColor("#ffffff");
                        setEditingProfile(null);
                      }}
                    >
                      I&apos;ll do this later
                    </button>
                    <div style={{ fontSize: 11, color: "#5a6a80", marginTop: 4 }}>
                      You can always set up your brand profile from the dashboard.
                    </div>
                  </div>
                </div>
              ) : (
                /* Step 2: Rest of the form */
                <div>
                  {/* Form Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 14,
                      marginBottom: 24,
                    }}
                    className="profile-form-grid"
                  >
                    {/* Brand name — editing only (new profiles got it in step 1) */}
                    {editingProfile && (
                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 4, display: "block" }}>
                          Brand name
                        </label>
                        <input
                          style={{ ...styles.input, marginBottom: 0 }}
                          placeholder="e.g., The Martinez Group"
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                          autoFocus
                        />
                        <div style={{ fontSize: 12, color: "#8fa3bf", marginTop: 4, lineHeight: 1.4 }}>
                          The name of your business or brand. This helps personalize your posts.
                        </div>
                      </div>
                    )}

                    {/* Market / City */}
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 4, display: "block" }}>
                        Your market
                      </label>
                      <input
                        style={{ ...styles.input, marginBottom: 0 }}
                        placeholder="e.g., Austin, TX"
                        value={newProfileNiche}
                        onChange={(e) => setNewProfileNiche(e.target.value)}
                        autoFocus={!editingProfile}
                      />
                      <div style={{ fontSize: 12, color: "#8fa3bf", marginTop: 4, lineHeight: 1.4 }}>
                        The city or area you sell in. Used in local market posts and community content.
                      </div>
                    </div>

                    {/* Who they help */}
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, color: "#e6edf7", marginBottom: 4, display: "block" }}>
                        Who you help most
                      </label>
                      <input
                        style={{ ...styles.input, marginBottom: 0 }}
                        placeholder="e.g., First-time buyers, move-up families"
                        value={newProfileAudience}
                        onChange={(e) => setNewProfileAudience(e.target.value)}
                      />
                      <div style={{ fontSize: 12, color: "#8fa3bf", marginTop: 4, lineHeight: 1.4 }}>
                        Your typical clients. Shapes the tone and focus of every post.
                      </div>
                    </div>
                  </div>

                  {/* Tone of Voice */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, display: "block", opacity: 0.9 }}>
                      Tone of voice
                    </label>
                    <div style={{ fontSize: 12, color: "#8fa3bf", marginBottom: 10 }}>
                      Sets the default voice for all your posts. You can override it per post anytime.
                    </div>
                    <select
                      value={newProfileTone}
                      onChange={(e) => setNewProfileTone(e.target.value)}
                      style={{
                        ...styles.input,
                        marginBottom: 0,
                        width: "100%",
                        cursor: "pointer",
                        appearance: "auto" as any,
                      }}
                    >
                      {[
                        "Confident", "Friendly", "Playful", "Professional",
                        "Luxury", "Minimal", "Bold", "Witty", "Inspirational",
                        "Educational", "Direct", "Warm", "Premium", "Cozy",
                        "Energetic", "Modern", "Rustic", "Casual", "Hype (but not cringe)",
                      ].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Brand Colors */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, opacity: 0.9 }}>
                      Brand Colors
                    </div>
                    <div style={{ fontSize: 12, color: "#8fa3bf", marginBottom: 12 }}>
                      Optional. These colors will be used in your generated image backgrounds and overlays.
                    </div>
                    <div
                      style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}
                      className="profile-colors-grid"
                    >
                      <div>
                        <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, display: "block" }}>
                          Primary Color <span style={{ fontSize: 11, color: "#8fa3bf" }}>(main brand color)</span>
                        </label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="color"
                            value={newProfilePrimaryColor}
                            onChange={(e) => setNewProfilePrimaryColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, background: "transparent", cursor: "pointer" }}
                          />
                          <input
                            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                            placeholder="#000000"
                            value={newProfilePrimaryColor}
                            onChange={(e) => setNewProfilePrimaryColor(e.target.value)}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, display: "block" }}>
                          Secondary Color <span style={{ fontSize: 11, color: "#8fa3bf" }}>(accent or background)</span>
                        </label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="color"
                            value={newProfileSecondaryColor}
                            onChange={(e) => setNewProfileSecondaryColor(e.target.value)}
                            style={{ width: 40, height: 40, border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, background: "transparent", cursor: "pointer" }}
                          />
                          <input
                            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                            placeholder="#ffffff"
                            value={newProfileSecondaryColor}
                            onChange={(e) => setNewProfileSecondaryColor(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: 12, opacity: 0.6, marginBottom: 20, textAlign: "center" as const, fontStyle: "italic" as const }}>
                    You can edit or update your brand profile anytime.
                  </p>

                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button
                      style={styles.btn}
                      onClick={() => {
                        if (editingProfile) {
                          setShowNewProfile(false);
                          setNewProfileName("");
                          setNewProfileNiche("");
                          setNewProfileAudience("");
                          setNewProfilePrimaryColor("#000000");
                          setNewProfileSecondaryColor("#ffffff");
                          setEditingProfile(null);
                          setProfileStep(1);
                        } else {
                          setProfileStep(1);
                        }
                      }}
                      className="hover-btn"
                    >
                      {editingProfile ? "Cancel" : "← Back"}
                    </button>
                    <button
                      style={{
                        ...styles.btn,
                        background: "linear-gradient(135deg, #2c6bed 0%, #7c3aed 100%)",
                        border: "none",
                        color: "#fff",
                        padding: "10px 24px",
                        fontSize: 14,
                      }}
                      onClick={handleCreateProfile}
                      className="hover-btn-primary"
                    >
                      {editingProfile ? "Update Profile" : "Save Profile"}
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
          .ath-page { padding: 10px !important; }
        }
        @media (max-width: 900px) {
          .profile-benefits-pill-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 768px) {
          .ath-actionGrid { grid-template-columns: 1fr !important; }
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
          .dash-side-by-side { flex-direction: column !important; }
          .dash-social-col { flex: 1 0 auto !important; width: 100% !important; }
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
          /* Push page header below email pill on right + token pill on left */
          .dash-page-header { padding-top: 80px !important; }
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
