"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getImage, deleteImage } from "../lib/imageStorage";

type SavedPost = {
  id: string;
  profileId?: string;
  calendarDay?: number;
  month?: string;
  hasImage?: boolean;
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

  // Helper function to get image style metadata
  const getImageStyleMeta = (imageStyle: string) => {
    const style = imageStyle?.toLowerCase() || "";

    if (
      style.includes("lifestyle") ||
      style.includes("natural") ||
      style === "lifestyle_photo"
    ) {
      return {
        label: "Natural Lifestyle",
        svg: (
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21,15 16,10 5,21" />
          </svg>
        ),
      };
    }

    if (
      style.includes("branded_photo") ||
      style.includes("branding_text") ||
      style.includes("photo_with_brand")
    ) {
      return {
        label: "Branded Photo",
        svg: (
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <rect x="7" y="7" width="3" height="3" />
            <rect x="14" y="7" width="3" height="3" />
            <rect x="7" y="14" width="10" height="3" />
          </svg>
        ),
      };
    }

    if (
      style.includes("branded_plus_text") ||
      style.includes("branded_text") ||
      style.includes("text_on_photo")
    ) {
      return {
        label: "Branded + Text",
        svg: (
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10,9 9,9 8,9" />
          </svg>
        ),
      };
    }

    if (
      style.includes("graphic_design") ||
      style.includes("typography") ||
      style.includes("no_photo")
    ) {
      return {
        label: "Graphic Design",
        svg: (
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="15" y2="18" />
          </svg>
        ),
      };
    }

    // Default fallback
    return {
      label: "Image",
      svg: (
        <svg
          width="28"
          height="28"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21,15 16,10 5,21" />
        </svg>
      ),
    };
  };
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [allPosts, setAllPosts] = useState<SavedPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<SavedPost | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [postImages, setPostImages] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState(true);
  const [filterProfileId, setFilterProfileId] = useState<string | null>(null);
  const [filterProfileName, setFilterProfileName] = useState<string | null>(
    null
  );

  // Load posts from localStorage and images from IndexedDB
  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);

    async function loadPosts() {
      try {
        // Check for profileId filter in URL
        const params = new URLSearchParams(window.location.search);
        const profileIdParam = params.get("profileId");
        setFilterProfileId(profileIdParam);

        // Get profile name if filtering
        if (profileIdParam) {
          try {
            const profiles = localStorage.getItem("ath_profiles");
            if (profiles) {
              const parsed = JSON.parse(profiles);
              const profile = parsed.find((p: any) => p.id === profileIdParam);
              if (profile) {
                setFilterProfileName(profile.name);
              }
            }
          } catch {}
        }

        const savedPosts = localStorage.getItem("ath_gallery");
        if (savedPosts) {
          const parsed = JSON.parse(savedPosts) as SavedPost[];
          // Sort by date, newest first
          parsed.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setAllPosts(parsed);

          // Filter by profileId if provided
          const filtered = profileIdParam
            ? parsed.filter((p) => p.profileId === profileIdParam)
            : parsed;
          setPosts(filtered);
        }
      } catch (err) {
        console.error("Error loading posts:", err);
      } finally {
        setLoadingImages(false);
      }
    }
    loadPosts();
  }, []);

  // Load image when selecting a post
  useEffect(() => {
    async function loadSelectedImage() {
      if (selectedPost?.hasImage && !postImages[selectedPost.id]) {
        const img = await getImage(selectedPost.id);
        if (img) {
          setSelectedImage(img);
          setPostImages((prev) => ({ ...prev, [selectedPost.id]: img }));
        }
      } else if (selectedPost && postImages[selectedPost.id]) {
        setSelectedImage(postImages[selectedPost.id]);
      } else {
        setSelectedImage(null);
      }
    }
    loadSelectedImage();
  }, [selectedPost, postImages]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDelete = async (id: string) => {
    // Delete image from IndexedDB
    await deleteImage(id);

    // Delete from localStorage
    const updated = posts.filter((p) => p.id !== id);
    setPosts(updated);
    localStorage.setItem("ath_gallery", JSON.stringify(updated));

    // Remove from local image cache
    setPostImages((prev) => {
      const newImages = { ...prev };
      delete newImages[id];
      return newImages;
    });

    setSelectedPost(null);
    setSelectedImage(null);
  };

  const handleDownloadImage = () => {
    if (!selectedImage || !selectedPost) return;
    const a = document.createElement("a");
    a.href = selectedImage;
    a.download = `ai-tech-helper-${selectedPost.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      paddingTop: 50,
    },
    backBtn: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background:
        "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
      border: "1px solid rgba(236, 72, 153, 0.3)",
      borderRadius: 10,
      padding: "10px 18px",
      color: "#f472b6",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      transition: "all 0.15s ease",
      textDecoration: "none",
    },
    title: {
      fontSize: 32,
      fontWeight: 800,
      letterSpacing: 1,
      margin: 0,
      background:
        "linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #a78bfa 100%)",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    },
    subtitle: {
      margin: "10px 0 0 0",
      opacity: 0.8,
      fontSize: 15,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 16,
    },
    postCard: {
      background: "linear-gradient(135deg, #15233d 0%, #101a33 100%)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: 18,
      cursor: "pointer",
      transition: "all 0.15s ease",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
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
      padding: 24,
      maxWidth: 900,
      width: "95%",
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
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Dashboard
            </button>
          </div>
          <div style={{ textAlign: "right" }}>
            <h1 style={styles.title}>Gallery</h1>
            <p style={styles.subtitle}>
              <span style={{ fontSize: 16 }}>🖼️</span>
              {posts.length} saved posts
              {filterProfileName && (
                <span style={{ marginLeft: 8, color: "#f472b6" }}>
                  for {filterProfileName}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter indicator */}
        {filterProfileId && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(236, 72, 153, 0.1)",
              border: "1px solid rgba(236, 72, 153, 0.2)",
              borderRadius: 10,
              padding: "10px 16px",
              marginBottom: 20,
            }}
          >
            <span style={{ fontSize: 13, color: "#f472b6" }}>
              Showing posts for <strong>{filterProfileName}</strong>
            </span>
            <button
              onClick={() => {
                setFilterProfileId(null);
                setFilterProfileName(null);
                setPosts(allPosts);
                router.replace("/gallery");
              }}
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                color: "#e6edf7",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
              className="hover-btn"
            >
              Show All Posts
            </button>
          </div>
        )}

        {/* Posts Grid */}
        {posts.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🖼️</div>
            <div style={styles.emptyText}>
              {filterProfileId
                ? `No posts saved for this profile yet. Generate your first post!`
                : `No posts saved yet. Generate your first post and it will appear here!`}
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
                {/* Image Style Icon */}
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1",
                    borderRadius: 10,
                    marginBottom: 12,
                    background:
                      "linear-gradient(135deg, rgba(44, 107, 237, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 8,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                    {getImageStyleMeta(post.imageStyle).svg}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.5,
                      fontWeight: 600,
                      textAlign: "center",
                    }}
                  >
                    {getImageStyleMeta(post.imageStyle).label}
                  </div>
                </div>

                <div style={styles.postHeader}>
                  <div style={styles.postDate}>
                    {formatDate(post.createdAt)}
                  </div>
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
            {/* Header */}
            <div style={styles.modalHeader}>
              <div>
                <div style={styles.modalTitle}>{selectedPost.postType}</div>
                <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                  {formatDate(selectedPost.createdAt)}
                  {selectedPost.calendarDay &&
                    ` • Day ${selectedPost.calendarDay}`}
                </div>
              </div>
              <button
                style={styles.closeBtn}
                onClick={() => setSelectedPost(null)}
              >
                ×
              </button>
            </div>

            {/* Two-column layout */}
            <div
              className="modal-two-col"
              style={{
                display: "flex",
                gap: 24,
                flexDirection: "row",
              }}
            >
              {/* Left column - Image */}
              <div
                className="modal-left-col"
                style={{ flex: "0 0 45%", minWidth: 0 }}
              >
                {selectedImage && (
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
                        src={selectedImage}
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
                        ...styles.copyBtn,
                        background:
                          "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                        border: "none",
                        color: "#fff",
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
                  </div>
                )}
              </div>

              {/* Right column - Content */}
              <div className="modal-right-col" style={{ flex: 1, minWidth: 0 }}>
                {/* Caption */}
                <div style={{ marginBottom: 20 }}>
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
                <div style={{ marginBottom: 20 }}>
                  <div style={styles.detailLabel}>Hashtags</div>
                  <div style={styles.detailContent}>
                    {selectedPost.hashtags}
                  </div>
                  <button
                    style={styles.copyBtn}
                    onClick={() =>
                      handleCopy(selectedPost.hashtags, "hashtags")
                    }
                    className="hover-btn"
                  >
                    {copiedField === "hashtags" ? "✓ Copied!" : "Copy Hashtags"}
                  </button>
                </div>

                {/* Metadata */}
                <div style={{ marginBottom: 20 }}>
                  <div style={styles.detailLabel}>Post Details</div>
                  <div style={styles.metaGrid}>
                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Niche</div>
                      <div style={styles.metaValue}>
                        {selectedPost.niche || "—"}
                      </div>
                    </div>
                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Audience</div>
                      <div style={styles.metaValue}>
                        {selectedPost.audience || "—"}
                      </div>
                    </div>
                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Tone</div>
                      <div style={styles.metaValue}>{selectedPost.tone}</div>
                    </div>
                    <div style={styles.metaItem}>
                      <div style={styles.metaLabel}>Image Style</div>
                      <div style={styles.metaValue}>
                        {selectedPost.imageStyle}
                      </div>
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
                      handleCopy(
                        `${selectedPost.caption}\n\n${selectedPost.hashtags}`,
                        "all"
                      );
                    }}
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

      {/* CSS */}
      <style>{`
        .hover-card:hover { border-color: rgba(255,255,255,0.15); transform: translateY(-2px); }
        .hover-btn:hover { background: rgba(255,255,255,0.12) !important; }

        @media (max-width: 768px) {
          .ath-galleryGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .modal-two-col { flex-direction: column !important; }
          .modal-left-col { flex: 1 !important; }
        }
        @media (max-width: 480px) {
          .ath-galleryGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
