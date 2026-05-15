import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const sections = [
  {
    title: "Information we collect",
    body: "We collect information you provide when creating an account (name, email, clinic name), information generated through use of the product (message metadata, response times, recovery metrics), and technical information (IP address, browser type, device identifiers) for security and analytics purposes. We do not collect the content of patient messages beyond what is necessary to display them in the recovery queue.",
  },
  {
    title: "How we use your information",
    body: "We use your information to operate and improve Dash Dental, to provide customer support, to send product updates and billing communications, and to generate anonymised aggregate analytics. We do not sell your data to third parties. We do not use patient message content for AI model training without explicit opt-in.",
  },
  {
    title: "Protected health information (PHI)",
    body: "Dash Dental operates as a Business Associate under HIPAA for customers who execute a Business Associate Agreement (BAA) with us. PHI is used solely to provide the contracted service. Employees with access to PHI are trained on HIPAA requirements. Access is role-limited and audit-logged.",
  },
  {
    title: "Data retention",
    body: "Account data is retained for the duration of your subscription plus 30 days after cancellation. Conversation data retention is configurable by the clinic: 30, 90, or 365 days. You can request immediate deletion of all data at any time by emailing privacy@dashdental.com.",
  },
  {
    title: "Third-party services",
    body: "We use AWS for hosting and storage, Stripe for payment processing, and SendGrid for transactional email. Each of these providers is contractually required to maintain appropriate data security standards. We do not share your data with messaging platforms (WhatsApp, Instagram, Telegram) beyond what is required to display and send messages on your behalf.",
  },
  {
    title: "Your rights",
    body: "You have the right to access, correct, export, or delete any personal data we hold about you or your clinic. California residents have additional rights under CCPA. EU and UK residents have rights under GDPR and UK GDPR. To exercise any of these rights, contact privacy@dashdental.com.",
  },
  {
    title: "Contact",
    body: "For privacy inquiries: privacy@dashdental.com. For HIPAA-specific questions: hipaa@dashdental.com. Mailing address: Dash Dental, Inc., [address on file].",
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f1011", color: "#f1f3f4", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px" }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: "#f1f3f4", marginBottom: 10, letterSpacing: "-0.02em" }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: "#a7adb5" }}>Last updated: May 2026</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {sections.map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: "#f1f3f4", marginBottom: 10 }}>{s.title}</h2>
              <p style={{ fontSize: 14, color: "#a7adb5", lineHeight: 1.75 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
