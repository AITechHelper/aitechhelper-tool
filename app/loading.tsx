export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Verdana, Geneva, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(126, 179, 255, 0.2)",
            borderTopColor: "#7eb3ff",
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "ath-spin 0.8s linear infinite",
          }}
        />
        <div style={{ color: "#7eb3ff", fontSize: 14, fontWeight: 600, opacity: 0.8 }}>
          Loading…
        </div>
        <style>{`@keyframes ath-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
