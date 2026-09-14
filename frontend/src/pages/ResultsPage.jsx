import React, { useState, useEffect } from "react";
import { Trophy, Clock, Hash, CheckCircle2, XCircle, RotateCcw, Home, Eye, EyeOff, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { gameApi } from "../services/api";

export function ResultsPage({ gameState, session, onPlayAgain, onHome }) {
  const [resultsData, setResultsData] = useState(null);
  const [revealSecrets, setRevealSecrets] = useState(false);
  const [loading, setLoading] = useState(true);

  const isWinner = gameState?.winner?.winner_name === gameState?.me?.name;

  useEffect(() => {
    // Trigger celebratory confetti if won
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // Ignore in non-canvas environments
    }

    async function fetchResults() {
      if (gameState?.status !== "GAME_OVER") return;
      try {
        setLoading(true);
        const data = await gameApi.getFinalResults(session.game_id, revealSecrets);
        setResultsData(data);
      } catch (err) {
        console.error("Could not fetch final results", err);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [session.game_id, revealSecrets, gameState?.status]);

  const p1 = resultsData?.player1 || {
    name: "Player 1",
    guesses_count: gameState?.me?.player_num === 1 ? gameState.me.guesses_count : gameState?.opponent?.guesses_count || 0,
    time_taken_formatted: "N/A",
    status: "Completed",
    secret_number_masked: "***"
  };

  const p2 = resultsData?.player2 || {
    name: "Player 2",
    guesses_count: gameState?.me?.player_num === 2 ? gameState.me.guesses_count : gameState?.opponent?.guesses_count || 0,
    time_taken_formatted: "N/A",
    status: "Completed",
    secret_number_masked: "***"
  };

  const winner = gameState?.winner || resultsData;
  const isDraw = winner?.is_draw;

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
      {/* Trophy / Result Icon */}
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: isDraw
            ? "rgba(245, 158, 11, 0.15)"
            : "linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(245, 158, 11, 0.1))",
          border: `2px solid ${isDraw ? "rgba(245, 158, 11, 0.4)" : "rgba(234, 179, 8, 0.5)"}`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "1.25rem",
          boxShadow: isDraw ? "none" : "0 0 30px rgba(234, 179, 8, 0.3)"
        }}
      >
        <Trophy size={42} color={isDraw ? "var(--amber)" : "#fbbf24"} />
      </div>

      <div style={{ color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.15em", fontSize: "0.85rem", fontWeight: "700" }}>
        Match Concluded
      </div>

      <h1 style={{ fontSize: "2.5rem", fontWeight: "800", margin: "0.5rem 0" }}>
        {isDraw ? "MATCH DRAW!" : `🏆 ${winner?.winner_name} WINS!`}
      </h1>

      {/* Reason Pill */}
      <div
        style={{
          display: "inline-block",
          padding: "0.5rem 1.25rem",
          borderRadius: "2rem",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid var(--border-subtle)",
          color: "var(--primary-light)",
          fontSize: "0.95rem",
          fontWeight: "600",
          marginBottom: "2rem"
        }}
      >
        Reason: {winner?.reason || "Fewer guesses"}
      </div>

      {/* Side by Side Scorecards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1.5rem",
          textAlign: "left",
          marginBottom: "2rem"
        }}
      >
        {/* Player 1 Card */}
        <div
          style={{
            background: winner?.winner_player_num === 1 ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${winner?.winner_player_num === 1 ? "rgba(99, 102, 241, 0.4)" : "var(--border-subtle)"}`,
            borderRadius: "1rem",
            padding: "1.5rem",
            position: "relative"
          }}
        >
          {winner?.winner_player_num === 1 && (
            <span
              style={{
                position: "absolute",
                top: "-10px",
                right: "15px",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: "800",
                textTransform: "uppercase",
                padding: "0.2rem 0.6rem",
                borderRadius: "1rem"
              }}
            >
              Winner
            </span>
          )}

          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: "700" }}>
            Player 1
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: "800", marginBottom: "1rem" }}>
            {p1.name}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Guesses:</span>
              <strong style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>
                {p1.guesses_count}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Time Taken:</span>
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {p1.time_taken_formatted}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Status:</span>
              <strong style={{ color: p1.status === "COMPLETED" ? "var(--emerald)" : "var(--rose)" }}>
                {p1.status}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.6rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Secret Number:</span>
              <strong style={{ fontFamily: "var(--font-mono)", color: "var(--primary-light)" }}>
                {revealSecrets ? p1.secret_number_revealed : p1.secret_number_masked}
              </strong>
            </div>
          </div>
        </div>

        {/* Player 2 Card */}
        <div
          style={{
            background: winner?.winner_player_num === 2 ? "rgba(99, 102, 241, 0.12)" : "rgba(255, 255, 255, 0.03)",
            border: `1px solid ${winner?.winner_player_num === 2 ? "rgba(99, 102, 241, 0.4)" : "var(--border-subtle)"}`,
            borderRadius: "1rem",
            padding: "1.5rem",
            position: "relative"
          }}
        >
          {winner?.winner_player_num === 2 && (
            <span
              style={{
                position: "absolute",
                top: "-10px",
                right: "15px",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                fontSize: "0.7rem",
                fontWeight: "800",
                textTransform: "uppercase",
                padding: "0.2rem 0.6rem",
                borderRadius: "1rem"
              }}
            >
              Winner
            </span>
          )}

          <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-dim)", fontWeight: "700" }}>
            Player 2
          </div>
          <div style={{ fontSize: "1.3rem", fontWeight: "800", marginBottom: "1rem" }}>
            {p2.name}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Guesses:</span>
              <strong style={{ fontFamily: "var(--font-mono)", color: "var(--cyan)" }}>
                {p2.guesses_count}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Time Taken:</span>
              <strong style={{ fontFamily: "var(--font-mono)" }}>
                {p2.time_taken_formatted}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Status:</span>
              <strong style={{ color: p2.status === "COMPLETED" ? "var(--emerald)" : "var(--rose)" }}>
                {p2.status}
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.6rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Secret Number:</span>
              <strong style={{ fontFamily: "var(--font-mono)", color: "var(--primary-light)" }}>
                {revealSecrets ? p2.secret_number_revealed : p2.secret_number_masked}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Secret Reveal Toggle */}
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={() => setRevealSecrets(!revealSecrets)}
          className="btn btn-secondary"
          style={{ padding: "0.6rem 1.25rem", fontSize: "0.9rem" }}
        >
          {revealSecrets ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{revealSecrets ? "Hide Secret Numbers" : "Reveal Both Secret Numbers"}</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={onPlayAgain} className="btn btn-primary" style={{ padding: "0.9rem 2rem" }}>
          <RotateCcw size={18} />
          <span>Play Again (New Match)</span>
        </button>
        <button onClick={onHome} className="btn btn-secondary" style={{ padding: "0.9rem 1.75rem" }}>
          <Home size={18} />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
}
