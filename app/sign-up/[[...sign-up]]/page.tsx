import { SignUp } from "@clerk/nextjs";

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "#0b1220",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
};

export default function SignUpPage() {
  return (
    <div style={styles.container}>
      <SignUp
        afterSignUpUrl="/dashboard"
        appearance={{
          elements: {
            rootBox: { width: "100%", maxWidth: "400px" },
          },
        }}
      />
    </div>
  );
}
