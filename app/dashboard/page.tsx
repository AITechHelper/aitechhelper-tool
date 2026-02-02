"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  const [editingProfile, setEditingProfile] = useState<BrandProfile | null>(null);
  const [newProfileName, setNewProfileName] = useState("");

  // Load profiles and posts from localStorage
  useEffect(() => {
    try {
      const savedProfiles = localStorage.getItem("ath_profiles");
      if (savedProfiles) setProfiles(JSON.parse(savedProfiles));

      const savedPosts = localStorage.getItem("ath_gallery");
      if (savedPosts) {
        const posts = JSON.parse(savedPosts) as SavedPost[];
        setRecentPosts(posts.slice(0, 4)); // Show last 4
      }
    } catch {}
  }, []);

  // Save profiles to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("ath_profiles", JSON.stringify(profiles));
    } catch {}
  }, [profiles]);

  const handleUseProfile = (profile: BrandProfile) => {
    // Save to form storage and navigate to generate
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
    router.push("/generate");
  };

  const handleDeleteProfile = (id: string) => {
    setProfiles(profiles.filter((p) => p.id !== id));
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;

    // Get current form data as base
    let formData: any = {};
    try {
      const saved = localStorage.getItem("ath_form");
      if (saved) formData = JSON.parse(saved);
    } catch {}

    const newProfile: BrandProfile = {
      id: Date.now().toString(),
      name: newProfileName.trim(),
      niche: formData.niche || "",
      audience: formData.audience || "",
      tone: formData.tone || "Confident",
      captionLength: formData.captionLength || "Medium",
      hashtagCount: formData.hashtagCount || 12,
      imageStyle: formData.imageStyle || "lifestyle",
      primaryColor: formData.primaryColor || "#000000",
      secondaryColor: formData.secondaryColor || "#ffffff",
      createdAt: new Date().toISOString(),
    };

    if (profiles.length >= 5) {
      alert("Maximum 5 profiles allowed. Delete one to add more.");
      return;
    }

    setProfiles([...profiles, newProfile]);
    setNewProfileName("");
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
    actionGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16,
    },
    actionCard: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: 24,
      cursor: "pointer",
      transition: "all 0.15s ease",
      textAlign: "center" as const,
    },
    actionIcon: {
      fontSize: 40,
      marginBottom: 12,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 6,
    },
    actionDesc: {
      fontSize: 13,
      opacity: 0.6,
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
      background: "rgba(255,255,255,0.03)",
      border: "1px dashed rgba(255,255,255,0.15)",
      borderRadius: 12,
      padding: 32,
      textAlign: "center" as const,
    },
    emptyText: {
      opacity: 0.5,
      fontSize: 14,
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
      alignItems: "center",
      justifyContent: "center",
      zIndex: 200,
      padding: 20,
    },
    modalContent: {
      background: "#101a33",
      borderRadius: 16,
      padding: 24,
      maxWidth: 400,
      width: "100%",
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
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>AI Tech Helper</h1>
          <p style={styles.subtitle}>What would you like to do today?</p>
        </div>

        {/* Main Actions */}
        <div style={styles.section}>
          <div style={styles.actionGrid} className="ath-actionGrid">
            <div
              style={styles.actionCard}
              className="hover-card"
              onClick={() => router.push("/generate")}
            >
              <div style={styles.actionIcon}>⚡</div>
              <div style={styles.actionTitle}>Generate a Post</div>
              <div style={styles.actionDesc}>Create a single post with AI-generated image and caption</div>
            </div>
            <div
              style={styles.actionCard}
              className="hover-card"
              onClick={() => router.push("/calendar")}
            >
              <div style={styles.actionIcon}>📅</div>
              <div style={styles.actionTitle}>Plan Your Month</div>
              <div style={styles.actionDesc}>Schedule 30 days of content with smart suggestions</div>
            </div>
            <div
              style={styles.actionCard}
              className="hover-card"
              onClick={() => router.push("/gallery")}
            >
              <div style={styles.actionIcon}>🖼️</div>
              <div style={styles.actionTitle}>View Gallery</div>
              <div style={styles.actionDesc}>See your saved posts and copy captions</div>
            </div>
          </div>
        </div>

        {/* Brand Profiles */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Your Brand Profiles</h2>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={() => setShowNewProfile(true)}
              className="hover-btn"
            >
              + New Profile
            </button>
          </div>

          {profiles.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyText}>
                No profiles yet. Save your brand settings to quickly generate posts.
              </div>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={() => setShowNewProfile(true)}
                className="hover-btn"
              >
                Create Your First Profile
              </button>
            </div>
          ) : (
            profiles.map((profile) => (
              <div key={profile.id} style={styles.profileCard} className="hover-card">
                <div style={styles.profileInfo}>
                  <div style={styles.profileName}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: profile.primaryColor,
                        border: "1px solid rgba(255,255,255,0.2)",
                      }}
                    />
                    {profile.name}
                  </div>
                  <div style={styles.profileMeta}>
                    {profile.niche || "No niche"} • {profile.audience || "No audience"} • {profile.tone}
                  </div>
                </div>
                <div style={styles.profileActions}>
                  <button
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    onClick={() => handleUseProfile(profile)}
                    className="hover-btn"
                  >
                    Use
                  </button>
                  <button
                    style={{ ...styles.btn, ...styles.btnDanger }}
                    onClick={() => handleDeleteProfile(profile.id)}
                    className="hover-btn"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Recent Posts */}
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>Recent Posts</h2>
            {recentPosts.length > 0 && (
              <span
                style={styles.viewAllLink}
                onClick={() => router.push("/gallery")}
              >
                View All →
              </span>
            )}
          </div>

          {recentPosts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyText}>
                No posts generated yet. Create your first post!
              </div>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={() => router.push("/generate")}
                className="hover-btn"
              >
                Generate a Post
              </button>
            </div>
          ) : (
            <div style={styles.recentPostsGrid} className="ath-recentPostsGrid">
              {recentPosts.map((post) => (
                <div
                  key={post.id}
                  style={styles.postCard}
                  className="hover-card"
                  onClick={() => router.push("/gallery")}
                >
                  <div style={styles.postDate}>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </div>
                  <div style={styles.postType}>{post.postType}</div>
                  <div style={styles.postCaption}>
                    {post.caption.substring(0, 80)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Profile Modal */}
      {showNewProfile && (
        <div style={styles.modal} onClick={() => setShowNewProfile(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>Create New Profile</div>
            <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
              This will save your current form settings as a reusable profile.
              Fill out the generator form first, then come back to save it.
            </p>
            <input
              style={styles.input}
              placeholder="Profile name (e.g., Coffee Shop)"
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              autoFocus
            />
            <div style={styles.modalActions}>
              <button
                style={styles.btn}
                onClick={() => setShowNewProfile(false)}
                className="hover-btn"
              >
                Cancel
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary }}
                onClick={handleCreateProfile}
                className="hover-btn"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS */}
      <style>{`
        .hover-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .hover-btn:hover { background: rgba(255,255,255,0.12) !important; }

        @media (max-width: 768px) {
          .ath-actionGrid { grid-template-columns: 1fr !important; }
          .ath-recentPostsGrid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .ath-recentPostsGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
