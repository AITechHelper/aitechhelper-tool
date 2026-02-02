"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
  niche: string;
  audience: string;
  createdAt: string;
};

export default function GalleryPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load posts from localStorage
  useEffect(() => {
    try {
      const savedPosts = localStorage.getItem("ath_gallery");
      if (savedPosts) {
        const parsed = JSON.parse(savedPosts) as SavedPost[];
        // Sort by date, newest first
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setPosts(parsed);
      }
    } catch {}
  }, []);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDelete = (id: string) => {
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    localStorage.setItem("ath_gallery", JSON.stringify(updated));
    setSelectedPost(null);
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
      maxWidth: 1000,
      margin: "0 auto",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    backBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "10px 16px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.15s ease",
    },
    title: {
      fontSize: 28,
      fontWeight: 700,
      letterSpacing: 1,
      margin: 0,
      textTransform: "uppercase" as const,
    },
    subtitle: {
      margin: "8px 0 0 0",
      opacity: 0.7,
      fontSize: 14,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16,
    },
    postCard: {
      background: "#101a33",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      padding: 16,
      cursor: "pointer",
      transition: "all 0.15s ease",
    },
    postHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    postDate: {
      fontSize: 11,
      opacity: 0.5,
    },
    postType: {
      fontSize: 11,
      fontWeight: 600,
      background: "rgba(44, 107, 237, 0.2)",
      color: "#7eb3ff",
      padding: "3px 8px",
      borderRadius: 4,
    },
    postCaption: {
      fontSize: 13,
      lineHeight: 1.5,
      opacity: 0.9,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: 3,
      WebkitBoxOrient: "vertical" as const,
      marginBottom: 12,
    },
    postMeta: {
      fontSize: 11,
      opacity: 0.5,
      display: "flex",
      gap: 12,
    },
    emptyState: {
      background: "rgba(255,255,255,0.03)",
      border: "1px dashed rgba(255,255,255,0.15)",
      borderRadius: 12,
      padding: 48,
      textAlign: "center" as const,
    },
    emptyText: {
      opacity: 0.5,
      fontSize: 15,
      marginBottom: 20,
    },
    btn: {
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 8,
      padding: "10px 16px",
      color: "#e6edf7",
      cursor: "pointer",
      fontSize: 13,
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
    modal: {
      position: "fixed" as const,
      inset: 0,
      background: "rgba(0,0,0,0.8)",
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
      maxWidth: 600,
      width: "100%",
      maxHeight: "80vh",
      overflow: "auto",
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 700,
    },
    closeBtn: {
      background: "none",
      border: "none",
      color: "#e6edf7",
      fontSize: 24,
      cursor: "pointer",
      padding: 0,
      lineHeight: 1,
    },
    detailSection: {
      marginBottom: 20,
    },
    detailLabel: {
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      opacity: 0.6,
      marginBottom: 8,
    },
    detailContent: {
      background: "#0b1220",
      borderRadius: 10,
      padding: 14,
      fontSize: 14,
      lineHeight: 1.6,
    },
    copyBtn: {
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
    },
    metaGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
    },
    metaItem: {
      background: "#0b1220",
      borderRadius: 8,
      padding: 12,
    },
    metaLabel: {
      fontSize: 10,
      opacity: 0.5,
      marginBottom: 4,
    },
    metaValue: {
      fontSize: 13,
      fontWeight: 600,
    },
    modalActions: {
      display: "flex",
      gap: 12,
      marginTop: 20,
      paddingTop: 20,
      borderTop: "1px solid rgba(255,255,255,0.08)",
    },
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <button
              style={styles.backBtn}
              onClick={() => router.push("/dashboard")}
              className="hover-btn"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Dashboard
            </button>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={styles.title}>Gallery</h1>
            <p style={styles.subtitle}>{posts.length} saved posts</p>
          </div>
        </div>

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
            <div style={styles.emptyText}>
              No posts saved yet. Generate your first post and it will appear here!
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
          <div style={styles.grid} className="ath-galleryGrid">
            {posts.map((post) => (
              <div
                key={post.id}
                style={styles.postCard}
                className="hover-card"
                onClick={() => setSelectedPost(post)}
              >
                <div style={styles.postHeader}>
                  <div style={styles.postDate}>{formatDate(post.createdAt)}</div>
                  <div style={styles.postType}>{post.postType}</div>
                </div>
                <div style={styles.postCaption}>{post.caption}</div>
                <div style={styles.postMeta}>
                  <span>{post.tone}</span>
                  <span>•</span>
                  <span>{post.imageStyle}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div style={styles.modal} onClick={() => setSelectedPost(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>{selectedPost.postType}</div>
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                  {formatDate(selectedPost.createdAt)}
                  {selectedPost.calendarDay && ` • Day ${selectedPost.calendarDay}`}
                </div>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setSelectedPost(null)}
              >
                ×
              </button>
            </div>

            {/* Caption */}
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>Caption</div>
              <div style={styles.detailContent}>{selectedPost.caption}</div>
              <button
                style={styles.copyBtn}
                onClick={() => handleCopy(selectedPost.caption, "caption")}
                className="hover-btn"
              >
                {copiedField === "caption" ? "✓ Copied!" : "Copy Caption"}
              </button>
            </div>

            {/* Hashtags */}
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>Hashtags</div>
              <div style={styles.detailContent}>{selectedPost.hashtags}</div>
              <button
                style={styles.copyBtn}
                onClick={() => handleCopy(selectedPost.hashtags, "hashtags")}
                className="hover-btn"
              >
                {copiedField === "hashtags" ? "✓ Copied!" : "Copy Hashtags"}
              </button>
            </div>

            {/* Metadata */}
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>Post Details</div>
              <div style={styles.metaGrid}>
                <div style={styles.metaItem}>
                  <div style={styles.metaLabel}>Niche</div>
                  <div style={styles.metaValue}>{selectedPost.niche || "—"}</div>
                </div>
                <div style={styles.metaItem}>
                  <div style={styles.metaLabel}>Audience</div>
                  <div style={styles.metaValue}>{selectedPost.audience || "—"}</div>
                </div>
                <div style={styles.metaItem}>
                  <div style={styles.metaLabel}>Tone</div>
                  <div style={styles.metaValue}>{selectedPost.tone}</div>
                </div>
                <div style={styles.metaItem}>
                  <div style={styles.metaLabel}>Image Style</div>
                  <div style={styles.metaValue}>{selectedPost.imageStyle}</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={styles.modalActions}>
              <button
                style={{ ...styles.btn, ...styles.btnDanger }}
                onClick={() => handleDelete(selectedPost.id)}
                className="hover-btn"
              >
                Delete Post
              </button>
              <div style={{ flex: 1 }} />
              <button
                style={styles.btn}
                onClick={() => {
                  handleCopy(`${selectedPost.caption}\n\n${selectedPost.hashtags}`, "all");
                }}
                className="hover-btn"
              >
                {copiedField === "all" ? "✓ Copied!" : "Copy All"}
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
          .ath-galleryGrid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .ath-galleryGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
