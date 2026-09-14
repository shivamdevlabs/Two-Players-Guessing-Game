import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, CircleDashed, AlertCircle } from "lucide-react";
import { gameApi } from "../services/api";

export function SecretSelectionPage({ gameState, session, onStateUpdated }) {
  const [secretInput, setSecretInput] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const me = gameState?.me;
  const opponent = gameState?.opponent;
  const hasSubmitted = me?.has_submitted_secret;
  const oppSubmitted = opponent?.has_submitted_secret;

  const minNum = gameState?.min_number || 1;
  const maxNum = gameState?.max_number || 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const parsed = parseInt(secretInput, 10);
    if (isNaN(parsed) || parsed < minNum || parsed > maxNum) {
      setError(`Please enter a valid number between ${minNum} and ${maxNum}.`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const updated = await gameApi.submitSecret(
        session.game_id,
        session.player_id,
        session.player_token,
        parsed
      );
      if (onStateUpdated) onStateUpdated(updated);
    } catch (err) {
      setError(err.message || "Failed to submit secret number.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "1rem",
          background: "rgba(99, 102, 241, 0.15)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1rem",
          border: "1px solid rgba(99, 102, 241, 0.3)"
        }}
      >
        <Lock size={28} color="#818cf8" />
      </div>

      <h1 style={{ fontSize: "1.8rem", fontWeight: "800", marginBottom: "0.5rem" }}>
        Choose Your Secret Number
      </h1>

      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
        Pick any secret number between <strong style={{ color: "var(--text-main)" }}>{minNum}</strong> and{" "}
        <strong style={{ color: "var(--text-main)" }}>{maxNum}</strong>. Your opponent will have to guess this number!
      </p>

      {/* Confidentiality Guarantee Banner */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "0.75rem",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          color: "#a7f3d0",
          fontSize: "0.85rem",
          marginBottom: "1.5rem",
          textAlign: "left"
        }}
      >
        <ShieldCheck size={20} color="var(--emerald)" style={{ flexShrink: 0 }} />
        <div>
          <strong>Confidential & Authoritative: </strong>
          Your secret number is stored securely on the server and is never sent to your opponent.
        </div>
      </div>

      {hasSubmitted ? (
        <div className="animate-fade-in" style={{ padding: "1.5rem 0" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(16, 185, 129, 0.15)",
              border: "1px solid rgba(16, 185, 129, 0.4)",
              padding: "0.6rem 1.25rem",
              borderRadius: "2rem",
              color: "var(--emerald)",
              fontWeight: "600",
              marginBottom: "1.25rem"
            }}
          >
            <CheckCircle2 size={18} />
            Secret Locked: {me?.secret_number}
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            {oppSubmitted ? (
              <span style={{ color: "var(--emerald)" }}>Both secrets locked! Starting Round 1...</span>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                <CircleDashed size={16} className="spin" /> Waiting for {opponent?.name || "opponent"} to pick their secret number...
              </span>
            )}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ position: "relative" }}>
            <input
              type={showSecret ? "number" : "password"}
              min={minNum}
              max={maxNum}
              className="input-field"
              placeholder={`Enter secret (${minNum} - ${maxNum})`}
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              style={{
                textAlign: "center",
                fontSize: "1.5rem",
                fontFamily: "var(--font-mono)",
                letterSpacing: showSecret ? "0.1em" : "0.3em",
                paddingRight: "3rem"
              }}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-dim)"
              }}
              title={showSecret ? "Hide number" : "Show number"}
            >
              {showSecret ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {error && (
            <div style={{ color: "var(--rose)", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%", padding: "0.9rem", fontSize: "1.05rem" }}
          >
            <Lock size={18} />
            {submitting ? "Locking Secret..." : "Lock In Secret Number"}
          </button>
        </form>
      )}
    </div>
  );
}
