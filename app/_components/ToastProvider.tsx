"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  addToast: (message: string, type: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) return { addToast: () => {} }; // no-op if outside provider
  return ctx;
}

const TOAST_COLORS: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: "rgba(34, 197, 94, 0.95)", border: "#16a34a" },
  error: { bg: "rgba(239, 68, 68, 0.95)", border: "#dc2626" },
  warning: { bg: "rgba(249, 115, 22, 0.95)", border: "#ea580c" },
  info: { bg: "rgba(44, 107, 237, 0.95)", border: "#1e4fc2" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => {
        const next = [...prev, { id, message, type }];
        return next.length > 5 ? next.slice(-5) : next;
      });
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            pointerEvents: "none",
          }}
        >
          {toasts.map((toast) => {
            const colors = TOAST_COLORS[toast.type];
            return (
              <div
                key={toast.id}
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  color: "#fff",
                  padding: "12px 40px 12px 20px",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "Verdana, Geneva, sans-serif",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  pointerEvents: "auto",
                  maxWidth: 400,
                  textAlign: "center" as const,
                  animation: "ath-toast-in 0.3s ease-out",
                  position: "relative" as const,
                }}
              >
                {toast.message}
                <button
                  onClick={() => removeToast(toast.id)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 16,
                    cursor: "pointer",
                    padding: "2px 6px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes ath-toast-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
