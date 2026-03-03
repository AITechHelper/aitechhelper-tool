export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 32 }}>
          Last updated: March 2026
        </p>

        <div style={{ fontSize: 14, lineHeight: 1.8, opacity: 0.85 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            1. Service Description
          </h2>
          <p>
            AI Tech Helper is an AI-powered social media content planning and
            generation tool. We provide AI-generated images, captions, and
            hashtags to help you create social media content.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            2. Account and Subscription
          </h2>
          <p>
            You must create an account to use AI Tech Helper. Paid subscriptions
            are billed monthly or yearly through Stripe. You can cancel your
            subscription at any time through the billing portal.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            3. Usage Limits
          </h2>
          <p>
            Each subscription plan includes a monthly token allowance for content
            generation. Tokens reset on the 1st of each month. Unused tokens do
            not carry over.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            4. Generated Content
          </h2>
          <p>
            Content generated through our service is for your commercial use. You
            are responsible for reviewing all generated content before publishing.
            AI-generated content may not always be accurate or appropriate for your
            audience.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            5. Instagram Integration
          </h2>
          <p>
            If you connect your Instagram account, you authorize AI Tech Helper to
            publish posts on your behalf. You are solely responsible for the
            content posted to your account. You can disconnect your Instagram
            account at any time.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            6. Prohibited Use
          </h2>
          <p>You agree not to use AI Tech Helper to:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Generate harmful, misleading, or illegal content</li>
            <li>Violate any third-party rights or platform terms of service</li>
            <li>Resell or redistribute generated content as a competing service</li>
            <li>Attempt to circumvent usage limits or security measures</li>
          </ul>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            7. Limitation of Liability
          </h2>
          <p>
            AI Tech Helper is provided "as is" without warranties of any kind. We
            are not liable for any damages resulting from the use of generated
            content, including content posted to social media platforms.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            8. Changes to Terms
          </h2>
          <p>
            We may update these terms at any time. Continued use of the service
            constitutes acceptance of the updated terms.
          </p>

          <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 12 }}>
            9. Contact
          </h2>
          <p>
            For questions about these terms, email us at{" "}
            <a href="mailto:aitechnologyhelper@gmail.com" style={{ color: "#7eb3ff" }}>
              aitechnologyhelper@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
