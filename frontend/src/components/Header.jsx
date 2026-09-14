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

      <div className="navbar-actions" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {/* Switch to Single Player vs Computer Button */}
        <a
          href="https://guessify-numbers-challenge.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-vs-computer"
          style={{
            padding: "0.35rem 0.75rem",
            fontSize: "0.8rem",
            gap: "0.35rem",
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
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}
            title="Click to copy room code"
          >
            <span>Room: </span>
            <strong style={{ color: "var(--primary-light)" }}>{gameState.room_code}</strong>
            {copied ? <Check size={13} color="var(--emerald)" /> : <Copy size={13} />}
          </button>
        )}

        <div className="connection-pill" title={`Connection: ${connectionStatus}`}>
          <span className={`status-dot ${connectionStatus}`}></span>
          <span className="connection-pill-text" style={{ textTransform: "capitalize", color: "var(--text-muted)", fontSize: "0.75rem" }}>
            {connectionStatus}
          </span>
        </div>

        {gameState && (
          <button
            onClick={onLeaveGame}
            className="btn btn-secondary"
            style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
            title="Leave Game"
          >
            <LogOut size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
