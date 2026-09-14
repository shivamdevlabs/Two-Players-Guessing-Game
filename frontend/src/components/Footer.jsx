import React from "react";

function InstagramIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: "middle" }}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
    </svg>
  );
}

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-subtle)",
        background: "rgba(7, 9, 19, 0.75)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontSize: "0.9rem",
        color: "var(--text-dim)",
        marginTop: "auto",
        width: "100%",
        padding: "1.25rem 2rem"
      }}
    >
      <div
        style={{
          maxWidth: "1080px",
          margin: "0 auto",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        {/* Left Side: Copyright & Portfolio */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <span>&copy; 2026</span>
          <a
            href="https://shivam-srivastava-portfolio.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--primary-light)",
              textDecoration: "none",
              fontWeight: "600",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--cyan)";
              e.currentTarget.style.textDecoration = "underline";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--primary-light)";
              e.currentTarget.style.textDecoration = "none";
            }}
          >
            Shivam Srivastava
          </a>
          <span style={{ opacity: 0.6 }}>•</span>
          <span>All rights reserved.</span>
        </div>

        {/* Right Side: Instagram Profile Link */}
        <div style={{ display: "inline-flex", alignItems: "center" }}>
          <a
            href="https://www.instagram.com/shivamsrivastava.dev"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "2rem",
              background: "linear-gradient(135deg, rgba(225, 48, 108, 0.12), rgba(131, 58, 180, 0.12))",
              border: "1px solid rgba(225, 48, 108, 0.3)",
              color: "#f472b6",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "0.85rem",
              letterSpacing: "0.01em",
              boxShadow: "0 2px 10px rgba(225, 48, 108, 0.15)",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(225, 48, 108, 0.25), rgba(131, 58, 180, 0.25))";
              e.currentTarget.style.borderColor = "rgba(225, 48, 108, 0.6)";
              e.currentTarget.style.color = "#ffffff";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(225, 48, 108, 0.35)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(225, 48, 108, 0.12), rgba(131, 58, 180, 0.12))";
              e.currentTarget.style.borderColor = "rgba(225, 48, 108, 0.3)";
              e.currentTarget.style.color = "#f472b6";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(225, 48, 108, 0.15)";
            }}
            title="Follow & Contact Shivam on Instagram"
          >
            <InstagramIcon size={16} />
            <span>@shivamsrivastava.dev</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
