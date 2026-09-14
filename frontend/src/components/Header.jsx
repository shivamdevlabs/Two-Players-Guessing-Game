import React, { useState } from "react";
import { Sparkles, Copy, Check, LogOut, Bot, ExternalLink } from "lucide-react";

export function Header({ gameState, connectionStatus, onLeaveGame }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!gameState?.room_code) return;
    navigator.clipboard.writeText(gameState.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <img
          src="/favicon.svg"
          alt="Guess Duel Logo"
          style={{
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            boxShadow: "0 0 12px rgba(6, 182, 212, 0.35)",
            display: "inline-block"
          }}
        />
        <span>GUESS DUEL</span>
        <span className="brand-badge">2-Player</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {/* Switch to Single Player vs Computer Button */}
        <a
          href="https://guessify-numbers-challenge.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{
            padding: "0.4rem 0.85rem",
            fontSize: "0.82rem",
            gap: "0.4rem",
            textDecoration: "none",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            background: "rgba(6, 182, 212, 0.08)",
            color: "var(--text-main)"
          }}
          title="Play Single Player mode vs Computer"
        >
          <Bot size={15} color="var(--cyan)" />
          <span>Vs Computer</span>
          <ExternalLink size={12} style={{ opacity: 0.6 }} />
        </a>
        {gameState?.room_code && gameState?.status !== "GAME_OVER" && (
          <button
            onClick={handleCopyCode}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.85rem", fontFamily: "var(--font-mono)" }}
            title="Click to copy room code"
          >
            Room: <strong style={{ color: "var(--primary-light)" }}>{gameState.room_code}</strong>
            {copied ? <Check size={14} color="var(--emerald)" /> : <Copy size={14} />}
          </button>
        )}

        <div className="connection-pill">
          <span className={`status-dot ${connectionStatus}`}></span>
          <span style={{ textTransform: "capitalize", color: "var(--text-muted)", fontSize: "0.75rem" }}>
            {connectionStatus}
          </span>
        </div>

        {gameState && (
          <button
            onClick={onLeaveGame}
            className="btn btn-secondary"
            style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            title="Leave Game"
          >
            <LogOut size={14} />
            <span style={{ display: "none", sm: "inline" }}>Leave</span>
          </button>
        )}
      </div>
    </header>
  );
}
