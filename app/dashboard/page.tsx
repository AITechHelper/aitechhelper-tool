"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImage } from "../lib/imageStorage";

// localStorage keys
const ACTIVE_BRAND_KEY = "ath_active_brand_profile";

type BrandProfile = {
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
  createdAt: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [recentPosts, setRecentPosts] = useState<SavedPost[]>([]);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BrandProfile | null>(
    null
  );
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileNiche, setNewProfileNiche] = useState("");
  const [newProfileAudience, setNewProfileAudience] = useState("");
  const [newProfilePrimaryColor, setNewProfilePrimaryColor] =
    useState("#000000");
  const [newProfileSecondaryColor, setNewProfileSecondaryColor] =
    useState("#ffffff");
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [postImages, setPostImages] = useState<Record<string, string>>({});

  // Load profiles and posts from localStorage
  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);

    try {
      const savedProfiles = localStorage.getItem("ath_profiles");
      const setupSkipped = localStorage.getItem("ath_profile_setup_skipped");
      const savedActiveProfile = localStorage.getItem(ACTIVE_BRAND_KEY);

      if (savedActiveProfile) {
        const activeData = JSON.parse(savedActiveProfile);
        setActiveProfileId(activeData.profileId || null);
      }

      if (savedProfiles) {
        const profilesData = JSON.parse(savedProfiles);
        setProfiles(profilesData);
        // Auto-open modal if no profiles exist AND user hasn't skipped setup
        if (profilesData.length === 0 && setupSkipped !== "1") {
          setShowNewProfile(true);
        }
      } else {
        // Auto-open modal if no profiles exist AND user hasn't skipped setup
        if (setupSkipped !== "1") {
          setShowNewProfile(true);
        }
      }

      const savedPosts = localStorage.getItem("ath_gallery");
      if (savedPosts) {
        const posts = JSON.parse(savedPosts) as SavedPost[];
        // Sort by date, newest first
        posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const recent = posts.slice(0, 3); // Show last 3
        setRecentPosts(recent);

        // Load images for recent posts
        recent.forEach(async (post) => {
          const img = await getImage(post.id);
          if (img) {
            setPostImages((prev) => ({ ...prev, [post.id]: img }));
          }
        });
      }
    } catch {}
  }, []);

  // Save profiles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ath_profiles", JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  const handleActivateProfile = (profile: BrandProfile) => {
    // Save active brand profile
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

    // Overwrite form storage completely with profile data
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
    setActiveProfileId(profile.id);
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles(profiles.filter((p) => p.id !== id));
  };

  const handleEditProfile = (profile: BrandProfile) => {
    setEditingProfile(profile);
    setNewProfileName(profile.name);
    setNewProfileNiche(profile.niche);
    setNewProfileAudience(profile.audience);
    setNewProfilePrimaryColor(profile.primaryColor);
    setNewProfileSecondaryColor(profile.secondaryColor);
    setShowNewProfile(true);
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;

    if (editingProfile) {
      // Update existing profile
      const updatedProfile: BrandProfile = {
        ...editingProfile,
        name: newProfileName.trim(),
        niche: newProfileNiche.trim(),
        audience: newProfileAudience.trim(),
        primaryColor: newProfilePrimaryColor,
        secondaryColor: newProfileSecondaryColor,
      };

      setProfiles(
        profiles.map((p) => (p.id === editingProfile.id ? updatedProfile : p))
      );

      // If this is the active profile, update the active profile data too
      if (activeProfileId === editingProfile.id) {
        handleActivateProfile(updatedProfile);
      }
    } else {
      // Create new profile
      const newProfile: BrandProfile = {
        id: Date.now().toString(),
        name: newProfileName.trim(),
        niche: newProfileNiche.trim(),
        audience: newProfileAudience.trim(),
        tone: "Confident",
        captionLength: "Medium",
        hashtagCount: 12,
        imageStyle: "lifestyle_photo",
        primaryColor: newProfilePrimaryColor,
        secondaryColor: newProfileSecondaryColor,
        createdAt: new Date().toISOString(),
      };

      if (profiles.length >= 5) {
        alert("Maximum 5 profiles allowed. Delete one to add more.");
        return;
      }

      setProfiles([...profiles, newProfile]);

      // Auto-activate the newly created profile
      handleActivateProfile(newProfile);
    }

    // Reset form fields
    setNewProfileName("");
    setNewProfileNiche("");
    setNewProfileAudience("");
    setNewProfilePrimaryColor("#000000");
    setNewProfileSecondaryColor("#ffffff");
    setEditingProfile(null);
    setShowNewProfile(false);
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
      maxWidth: 1000,
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
      padding: 20,
      paddingTop: 60,
      overflowY: "auto" as const,
    },
    modalContent: {
      background: "#101a33",
      borderRadius: 16,
      padding: 32,
      width: "min(920px, 96vw)",
      maxHeight: "80vh",
      overflowY: "auto" as const,
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
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header - Enhanced */}
        <div style={{ marginBottom: 32, textAlign: "center" as const }}>
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
            AI TECH HELPER
          </h1>
          <p
            style={{
              margin: "12px 0 0 0",
              fontSize: 17,
              opacity: 0.8,
              fontWeight: 500,
            }}
          >
            What would you like to do today?
          </p>
        </div>

        {/* Show compact profile bar when profiles exist */}
        {profiles.length > 0 && activeProfile && (
          <div
            style={{
              background: "linear-gradient(135deg, #15233d 0%, #1a1a2e 100%)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: 16,
              padding: "16px 20px",
              marginBottom: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow:
                "0 4px 20px rgba(0,0,0,0.3), 0 0 30px rgba(34, 197, 94, 0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>
                    {activeProfile.name}
                  </span>
                  <span
                    style={{
                      background:
                        "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                      padding: "3px 10px",
                      borderRadius: 20,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#fff",
                      textTransform: "uppercase" as const,
                      letterSpacing: 0.5,
                    }}
                  >
                    Active
                  </span>
                </div>
                <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                  {activeProfile.niche || "No niche"} • {activeProfile.tone} •{" "}
                  {activeProfile.audience || "No audience"}
                </div>
              </div>
              {/* View Posts Button */}
              <button
                onClick={() =>
                  router.push(`/gallery?profileId=${activeProfile.id}`)
                }
                style={{
                  background:
                    "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
                  border: "1px solid rgba(236, 72, 153, 0.3)",
                  borderRadius: 8,
                  padding: "8px 14px",
                  color: "#f472b6",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
                className="hover-btn"
              >
                <span>🖼️</span>
                View Posts
              </button>
            </div>
            <div style={styles.profileBarDropdown}>
              <button
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  padding: "10px 16px",
                  color: "#e6edf7",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="hover-btn"
              >
                <span>Switch Profile</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  {showProfileDropdown ? "▲" : "▼"}
                </span>
              </button>
              {showProfileDropdown && (
                <div style={styles.dropdownMenu}>
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      style={{
                        ...styles.dropdownItem,
                        background:
                          profile.id === activeProfileId
                            ? "rgba(34, 197, 94, 0.15)"
                            : "transparent",
                        justifyContent: "flex-start",
                      }}
                      onClick={() => {
                        handleActivateProfile(profile);
                        setShowProfileDropdown(false);
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          profile.id === activeProfileId
                            ? "rgba(34, 197, 94, 0.2)"
                            : "rgba(255,255,255,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          profile.id === activeProfileId
                            ? "rgba(34, 197, 94, 0.15)"
                            : "transparent")
                      }
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: profile.primaryColor,
                          border: "1px solid rgba(255,255,255,0.2)",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1 }}>{profile.name}</span>
                      <button
                        style={{
                          background: "rgba(126, 179, 255, 0.1)",
                          border: "1px solid rgba(126, 179, 255, 0.2)",
                          borderRadius: 4,
                          padding: "2px 6px",
                          color: "#7eb3ff",
                          fontSize: 10,
                          cursor: "pointer",
                          marginRight: 6,
                          transition: "all 0.15s ease",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProfile(profile);
                          setShowProfileDropdown(false);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(126, 179, 255, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "rgba(126, 179, 255, 0.1)";
                        }}
                      >
                        edit
                      </button>
                      {profile.id === activeProfileId && (
                        <span style={{ color: "#22c55e", fontSize: 12 }}>
                          ✓
                        </span>
                      )}
                    </div>
                  ))}
                  <div style={styles.dropdownDivider} />
                  <div
                    style={{
                      ...styles.dropdownItem,
                      color: "#7eb3ff",
                    }}
                    onClick={() => {
                      setShowNewProfile(true);
                      setShowProfileDropdown(false);
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255,255,255,0.05)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span style={{ fontSize: 16 }}>+</span>
                    <span>Add New Profile</span>
                  </div>
                  <div style={styles.dropdownDivider} />
                  {profiles.map((profile) => (
                    <div
                      key={`delete-${profile.id}`}
                      style={{
                        ...styles.dropdownItem,
                        color: "#ef4444",
                        fontSize: 12,
                      }}
                      onClick={() => {
                        handleDeleteProfile(profile.id);
                        setShowProfileDropdown(false);
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(239, 68, 68, 0.1)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <span style={{ fontSize: 12 }}>🗑</span>
                      <span>Delete {profile.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show hero section only when no profiles exist */}
        {profiles.length === 0 && (
          <div style={styles.heroSection} className="primary-section">
            <div style={styles.sectionHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Your Brand Profiles
                  <span style={styles.stepPill}>Step 1</span>
                </h2>
                <p style={styles.instructionText}>
                  Start here — create a profile so every post matches your
                  brand.
                </p>
              </div>
            </div>

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
                  Create your first brand profile to get started:
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
                    Audience + niche
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
                  Takes 30 seconds. Saves time on every post.
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
                  Create Your First Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How It Works Section - Enhanced */}
        <div style={{ ...styles.section, marginBottom: 28 }}>
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
                  Quick tip, promo, testimonial, behind-the-scenes
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
        </div>

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
              onClick={() => router.push("/generate")}
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
                <div style={{ fontSize: 48, marginBottom: 8 }}>⚡</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                  Generate a Post
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  Quick single post creation
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
                    <span style={{ fontSize: 16 }}>🖼️</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      AI-generated custom image
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>✍️</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Engaging caption for your brand
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>#️⃣</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Optimized hashtags
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
                  Quick posts, one-off content, testing ideas, or when you need
                  a single post right now.
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
                  Create a Post →
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
              onClick={() => router.push("/calendar")}
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
                  Strategic content calendar
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
                      30-day visual content calendar
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>💡</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Smart post type suggestions
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: 16 }}>🎯</span>
                    <span style={{ fontSize: 13, opacity: 0.9 }}>
                      Click any day to generate content
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
                  Consistent posting, content strategy, batching your content
                  creation, and staying organized.
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
                  Open Calendar →
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Posts & Gallery Section */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)",
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
              <svg width="20" height="20" fill="none" stroke="#a78bfa" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#e6edf7" }}>Recent Posts</span>
            </div>
            <div
              onClick={() => router.push(activeProfile?.id ? `/gallery?profileId=${activeProfile.id}` : '/gallery')}
              style={{
                background: "rgba(124, 58, 237, 0.2)",
                border: "1px solid rgba(124, 58, 237, 0.4)",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: "#a78bfa",
                transition: "all 0.2s ease",
              }}
              className="hover-card"
            >
              View All →
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
                  onClick={() => router.push(activeProfile?.id ? `/gallery?profileId=${activeProfile.id}` : '/gallery')}
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
                  {postImages[post.id] ? (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        backgroundImage: `url(${postImages[post.id]})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg width="32" height="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="M21 15l-5-5L5 21" />
                      </svg>
                    </div>
                  )}
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
                      }}
                    >
                      {post.caption.slice(0, 40)}...
                    </div>
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
              <div style={{ fontSize: 14, marginBottom: 8 }}>No posts yet</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Generate your first post to see it here
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Profile Modal */}
      {showNewProfile && (
        <div style={styles.modal} onClick={() => setShowNewProfile(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={styles.modalTitle}>
                {editingProfile
                  ? "Edit Brand Profile"
                  : "Create Your Brand Profile"}
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
                One-time setup
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
              }}
            >
              This is a one-time setup. We'll save your brand details so every
              post is instantly pre-filled and consistent.
            </div>

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
              {/* Profile Name - Full Width */}
              <input
                style={{ ...styles.input, gridColumn: "1 / -1" }}
                placeholder="Profile name (e.g., Coffee Shop)"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                autoFocus
              />

              {/* Niche */}
              <input
                style={styles.input}
                placeholder="Your niche (e.g., Coffee, Fitness, Tech)"
                value={newProfileNiche}
                onChange={(e) => setNewProfileNiche(e.target.value)}
              />

              {/* Audience */}
              <input
                style={styles.input}
                placeholder="Your audience (e.g., Coffee lovers, Entrepreneurs)"
                value={newProfileAudience}
                onChange={(e) => setNewProfileAudience(e.target.value)}
              />
            </div>

            {/* Brand Colors */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                  opacity: 0.9,
                }}
              >
                Brand Colors
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 14,
                }}
                className="profile-colors-grid"
              >
                {/* Primary Color */}
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                      marginBottom: 6,
                      display: "block",
                    }}
                  >
                    Primary Color
                  </label>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="color"
                      value={newProfilePrimaryColor}
                      onChange={(e) =>
                        setNewProfilePrimaryColor(e.target.value)
                      }
                      style={{
                        width: 40,
                        height: 40,
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />
                    <input
                      style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                      placeholder="#000000"
                      value={newProfilePrimaryColor}
                      onChange={(e) =>
                        setNewProfilePrimaryColor(e.target.value)
                      }
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                      marginBottom: 6,
                      display: "block",
                    }}
                  >
                    Secondary Color
                  </label>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <input
                      type="color"
                      value={newProfileSecondaryColor}
                      onChange={(e) =>
                        setNewProfileSecondaryColor(e.target.value)
                      }
                      style={{
                        width: 40,
                        height: 40,
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 6,
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    />
                    <input
                      style={{ ...styles.input, marginBottom: 0, flex: 1 }}
                      placeholder="#ffffff"
                      value={newProfileSecondaryColor}
                      onChange={(e) =>
                        setNewProfileSecondaryColor(e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <p
              style={{
                fontSize: 12,
                opacity: 0.6,
                marginBottom: 20,
                textAlign: "center" as const,
                fontStyle: "italic" as const,
              }}
            >
              You can edit or update your brand profile anytime.
            </p>

            <div
              style={{
                ...styles.modalActions,
                flexDirection: "column" as const,
                gap: 12,
              }}
            >
              <div
                style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
              >
                <button
                  style={styles.btn}
                  onClick={() => {
                    setShowNewProfile(false);
                    // Reset form fields
                    setNewProfileName("");
                    setNewProfileNiche("");
                    setNewProfileAudience("");
                    setNewProfilePrimaryColor("#000000");
                    setNewProfileSecondaryColor("#ffffff");
                    setEditingProfile(null);
                  }}
                  className="hover-btn"
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={handleCreateProfile}
                  className="hover-btn"
                >
                  {editingProfile ? "Update Profile" : "Save Profile"}
                </button>
              </div>

              <button
                style={{
                  ...styles.btn,
                  opacity: 0.7,
                  fontSize: 12,
                  padding: "8px 12px",
                  alignSelf: "center" as const,
                }}
                onClick={() => {
                  localStorage.setItem("ath_profile_setup_skipped", "1");
                  setShowNewProfile(false);
                  // Reset form fields
                  setNewProfileName("");
                  setNewProfileNiche("");
                  setNewProfileAudience("");
                  setNewProfilePrimaryColor("#000000");
                  setNewProfileSecondaryColor("#ffffff");
                  setEditingProfile(null);
                }}
                className="hover-btn"
              >
                No thanks — continue without a profile
              </button>
            </div>
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

        @media (max-width: 900px) {
          .profile-benefits-pill-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 768px) {
          .ath-actionGrid { grid-template-columns: 1fr !important; }
          .ath-recentPostsGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .primary-section { margin-bottom: 60px; }
          .profile-benefits-grid { grid-template-columns: 1fr !important; }
          .how-it-works-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
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
        }
        @media (max-width: 480px) {
          .ath-recentPostsGrid { grid-template-columns: 1fr !important; }
          .how-it-works-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
