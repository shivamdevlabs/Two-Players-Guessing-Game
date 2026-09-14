import React, { useState } from "react";
import { Users, Copy, Check, Clock, CheckCircle2, CircleDashed, ShieldAlert, Sparkles } from "lucide-react";
import { gameApi } from "../services/api";

export function LobbyPage({ gameState, session, onStateUpdated }) {
  const [copied, setCopied] = useState(false);
  const [togglingReady, setTogglingReady] = useState(false);
  const [error, setError] = useState(null);

  const me = gameState?.me;
  const opponent = gameState?.opponent;
  const isReady = me?.ready || false;
  const hasOpponent = Boolean(opponent);
  const bothReady = isReady && opponent?.ready;

  const handleCopyCode = () => {
    if (!gameState?.room_code) return;
    navigator.clipboard.writeText(gameState.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleReady = async () => {
    if (!hasOpponent) return;
    setTogglingReady(true);
    setError(null);
    try {
      const updated = await gameApi.setReady(
        session.game_id,
        session.player_id,
        session.player_token,
        !isReady
      );
      if (onStateUpdated) onStateUpdated(updated);
    } catch (err) {
      setError(err.message || "Could not update ready state.");
    } finally {
      setTogglingReady(false);
    }
  };

  const timeLimitMins = Math.round((gameState?.time_limit_seconds || 300) / 60);

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "680px", margin: "0 auto", textAlign: "center" }}>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          color: "var(--primary-light)",
          fontSize: "0.85rem",
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "0.5rem"
        }}
      >
        <Users size={16} /> Game Lobby
      </div>

      <h1 style={{ fontSize: "1.8rem", fontWeight: "800", marginBottom: "0.5rem" }}>
        Get Ready to Play
      </h1>

      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
        Share this game code with your opponent to enter the match.
      </p>

      {/* Room Code Display */}
      <div style={{ margin: "1.25rem 0" }}>
        <div className="room-code-badge">
          <span>{gameState?.room_code}</span>
          <button
            onClick={handleCopyCode}
            className="btn btn-secondary"
            style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
          >
            {copied ? (
              <>
                <Check size={16} color="var(--emerald)" /> Copied!
              </>
            ) : (
              <>
                <Copy size={16} /> Copy Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Game Rules summary badge */}
      <div className="lobby-rules-summary">
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Clock size={15} color="var(--cyan)" />
          Time Limit: <strong style={{ color: "var(--text-main)" }}>{timeLimitMins} Minutes</strong>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Sparkles size={15} color="var(--primary-light)" />
          Number Range: <strong style={{ color: "var(--text-main)" }}>{gameState?.min_number} – {gameState?.max_number}</strong>
        </span>
      </div>

      {/* Players Row */}
      <div className="lobby-players-grid">
        {/* Me Card */}
        <div
          style={{
            background: isReady ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${isReady ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)"}`,
            borderRadius: "1rem",
            padding: "1.25rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: "700" }}>
              Player {me?.player_num} (You)
            </span>
            {isReady ? (
              <span className="feedback-badge correct" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                <CheckCircle2 size={12} /> Ready
              </span>
            ) : (
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <CircleDashed size={12} /> Not Ready
              </span>
            )}
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-main)" }}>
            {me?.name}
          </div>
        </div>

        {/* Opponent Card */}
        <div
          style={{
            background: opponent?.ready ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${opponent?.ready ? "rgba(16, 185, 129, 0.4)" : "var(--border-subtle)"}`,
            borderRadius: "1rem",
            padding: "1.25rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: "700" }}>
              Player {opponent?.player_num || 2} (Opponent)
            </span>
            {opponent ? (
              opponent.ready ? (
                <span className="feedback-badge correct" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                  <CheckCircle2 size={12} /> Ready
                </span>
              ) : (
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <CircleDashed size={12} /> Not Ready
                </span>
              )
            ) : null}
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: "700", color: opponent ? "var(--text-main)" : "var(--text-dim)" }}>
            {opponent ? (
              opponent.name
            ) : (
              <span style={{ fontSize: "0.95rem", fontStyle: "italic", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CircleDashed size={16} className="spin" /> Waiting for Player 2...
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ color: "var(--rose)", fontSize: "0.9rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Ready Button */}
      <div>
        <button
          onClick={handleToggleReady}
          disabled={!hasOpponent || togglingReady}
          className={`btn ${isReady ? "btn-secondary" : "btn-primary"}`}
          style={{ minWidth: "200px", maxWidth: "100%", width: "auto", padding: "0.9rem 2.2rem", fontSize: "1.05rem" }}
        >
          {isReady ? (
            <>
              <CheckCircle2 size={20} color="var(--emerald)" /> You are Ready (Click to Cancel)
            </>
          ) : (
            <>
              <Check size={20} /> Ready / Start Game
            </>
          )}
        </button>

        <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", marginTop: "0.75rem" }}>
          {!hasOpponent
            ? "Waiting for opponent to enter the room code..."
            : bothReady
            ? "Both players ready! Starting secret number selection..."
            : "The game will begin once both players click Ready."}
        </p>
      </div>
    </div>
  );
}
