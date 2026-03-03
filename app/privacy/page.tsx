export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#e6edf7",
        padding: "40px 20px",
        fontFamily: "Verdana, Geneva, sans-serif",
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <a
          href="/"
          style={{
            color: "#7eb3ff",
            fontSize: 13,
            textDecoration: "none",
            display: "inline-block",
            marginBottom: 24,
          }}
        >
          &larr; Back to Home
        </a>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 32 }}>
          Last updated: March 2026
        </p>

        <div style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.85 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            1. Information We Collect
          </h2>
          <p>
            When you use AI Tech Helper, we collect the following information:
          </p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Account information (name, email) via Clerk authentication</li>
            <li>Payment information processed securely through Stripe</li>
            <li>Brand profile data you create (business name, niche, audience, colors)</li>
            <li>Generated content (images, captions, hashtags) stored locally on your device</li>
          </ul>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            2. How We Use Your Information
          </h2>
          <p>We use your information to:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Provide and improve our AI content generation service</li>
            <li>Process payments and manage subscriptions</li>
            <li>Personalize content generation based on your brand profiles</li>
            <li>Communicate service updates</li>
          </ul>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            3. Third-Party Services
          </h2>
          <p>We use the following third-party services:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong>Clerk</strong> for authentication</li>
            <li><strong>Stripe</strong> for payment processing</li>
            <li><strong>OpenAI</strong> for AI content generation</li>
            <li><strong>Instagram/Meta</strong> for optional direct posting (requires separate authorization)</li>
          </ul>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            4. Instagram Integration
          </h2>
          <p>
            If you choose to connect your Instagram account, we request permission
            to publish content on your behalf. We only post content that you
            explicitly approve. We do not read, store, or access your Instagram
            messages, followers, or other personal data beyond what is necessary to
            publish posts.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            5. Data Storage and Security
          </h2>
          <p>
            Your brand profiles are stored securely in our database. Generated
            images and posts are stored locally on your device. Payment data is
            handled entirely by Stripe and never touches our servers.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            6. Data Deletion
          </h2>
          <p>
            You can delete your brand profiles at any time from the dashboard.
            To delete your account entirely, contact us at{" "}
            <a href="mailto:aitechnologyhelper@gmail.com" style={{ color: "#7eb3ff" }}>
              aitechnologyhelper@gmail.com
            </a>.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            7. Contact
          </h2>
          <p>
            For questions about this privacy policy, email us at{" "}
            <a href="mailto:aitechnologyhelper@gmail.com" style={{ color: "#7eb3ff" }}>
              aitechnologyhelper@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
