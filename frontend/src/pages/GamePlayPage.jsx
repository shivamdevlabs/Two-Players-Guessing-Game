import React, { useState, useRef, useEffect } from "react";
import { Send, Clock, Hash, CheckCircle2, ArrowUp, ArrowDown, HelpCircle, Eye, AlertCircle, Sparkles } from "lucide-react";
import { CountdownTimer } from "../components/CountdownTimer";
import { GuessHistory } from "../components/GuessHistory";
import { gameApi } from "../services/api";

export function GamePlayPage({ gameState, session, remainingSeconds, onStateUpdated }) {
  const [guessInput, setGuessInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState(null);
  const inputRef = useRef(null);

  const me = gameState?.me;
  const opponent = gameState?.opponent;
  const roundInfo = gameState?.round_info;
  const currentRound = roundInfo?.current_round || 1;
  const isMyTurn = roundInfo?.active_guesser_num === me?.player_num;

  const minNum = gameState?.min_number || 1;
  const maxNum = gameState?.max_number || 100;
  const timeLimit = roundInfo?.time_limit_seconds || gameState?.time_limit_seconds || 300;

  const isSubmittingRef = useRef(false);

  // Auto-focus input whenever it's the player's turn or feedback updates
  useEffect(() => {
    if (isMyTurn && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMyTurn, currentRound]);

  const handleGuessSubmit = async (e) => {
    e.preventDefault();
    if (!isMyTurn || isSubmittingRef.current) return;

    const val = parseInt(guessInput, 10);
    if (isNaN(val) || val < minNum || val > maxNum) {
      setFeedbackNotice({
        type: "error",
        message: `Please enter a valid number between ${minNum} and ${maxNum}.`
      });
      // Keep focus on input even on invalid input
      inputRef.current?.focus();
      inputRef.current?.select();
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setFeedbackNotice(null);

    // Clear input immediately so user can type next number smoothly
    setGuessInput("");
    // Ensure immediate focus retention
    if (inputRef.current) {
      inputRef.current.focus();
    }

    try {
      const resp = await gameApi.submitGuess(
        session.game_id,
        session.player_id,
        session.player_token,
        val
      );

      if (resp.is_duplicate) {
        setFeedbackNotice({
          type: "duplicate",
          message: resp.message
        });
      } else if (resp.feedback === "CORRECT") {
        setFeedbackNotice({
          type: "correct",
          message: resp.message
        });
      } else if (resp.feedback === "TOO_LOW") {
        setFeedbackNotice({
          type: "low",
          message: resp.message
        });
      } else if (resp.feedback === "TOO_HIGH") {
        setFeedbackNotice({
          type: "high",
          message: resp.message
        });
      }

      if (resp.game_state && onStateUpdated) {
        onStateUpdated(resp.game_state);
      }
    } catch (err) {
      setFeedbackNotice({
        type: "error",
        message: err.message || "Could not submit guess."
      });
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
      // Guarantee focus is returned to the input box without needing to click
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      {/* Round Header Bar */}
      <div className="gameplay-header">
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(99, 102, 241, 0.15)",
              color: "var(--primary-light)",
              padding: "0.25rem 0.65rem",
              borderRadius: "2rem",
              fontSize: "0.75rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "0.4rem"
            }}
          >
            Round {currentRound} of 2
          </div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800" }}>
            {isMyTurn ? `Your Turn to Guess!` : `${opponent?.name || "Opponent"} is Guessing`}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            {isMyTurn
              ? `Find ${opponent?.name}'s secret number between ${minNum} and ${maxNum}`
              : `${opponent?.name} is trying to guess your secret number (${me?.secret_number})`}
          </p>
        </div>

        {/* Server Authoritative Timer */}
        <div>
          <CountdownTimer
            remainingSeconds={remainingSeconds}
            timeLimitSeconds={timeLimit}
          />
        </div>
      </div>

      {/* Main Content: Guesser View vs Spectator View */}
      {isMyTurn ? (
        <div>
          {/* Status Chips */}
          <div className="gameplay-status-row">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem" }}>
              <Hash size={16} color="var(--primary-light)" />
              <span>Total Guesses:</span>
              <strong style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", color: "var(--primary-light)" }}>
                {me?.guesses_count || 0}
              </strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
              <span>Target Range:</span>
              <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                {minNum} – {maxNum}
              </strong>
            </div>
          </div>

          {/* Feedback Banner */}
          {feedbackNotice && (
            <div
              className="animate-fade-in"
              style={{
                borderRadius: "0.85rem",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
                background:
                  feedbackNotice.type === "low"
                    ? "rgba(6, 182, 212, 0.15)"
                    : feedbackNotice.type === "high"
                    ? "rgba(244, 63, 94, 0.15)"
                    : feedbackNotice.type === "correct"
                    ? "rgba(16, 185, 129, 0.2)"
                    : feedbackNotice.type === "duplicate"
                    ? "rgba(245, 158, 11, 0.15)"
                    : "rgba(244, 63, 94, 0.15)",
                border:
                  feedbackNotice.type === "low"
                    ? "1px solid rgba(6, 182, 212, 0.4)"
                    : feedbackNotice.type === "high"
                    ? "1px solid rgba(244, 63, 94, 0.4)"
                    : feedbackNotice.type === "correct"
                    ? "1px solid rgba(16, 185, 129, 0.5)"
                    : feedbackNotice.type === "duplicate"
                    ? "1px solid rgba(245, 158, 11, 0.4)"
                    : "1px solid rgba(244, 63, 94, 0.4)",
                color:
                  feedbackNotice.type === "low"
                    ? "var(--cyan)"
                    : feedbackNotice.type === "high"
                    ? "var(--rose)"
                    : feedbackNotice.type === "correct"
                    ? "var(--emerald)"
                    : feedbackNotice.type === "duplicate"
                    ? "var(--amber)"
                    : "var(--rose)"
              }}
            >
              {feedbackNotice.type === "low" && <ArrowUp size={22} />}
              {feedbackNotice.type === "high" && <ArrowDown size={22} />}
              {feedbackNotice.type === "correct" && <CheckCircle2 size={22} />}
              {feedbackNotice.type === "duplicate" && <AlertCircle size={22} />}
              {feedbackNotice.type === "error" && <AlertCircle size={22} />}

              <div style={{ fontSize: "1.05rem", fontWeight: "700" }}>
                {feedbackNotice.message}
              </div>
            </div>
          )}

          {/* Guess Input Form */}
          <form onSubmit={handleGuessSubmit} autoComplete="off" className="guess-form">
            <input
              ref={inputRef}
              type="number"
              min={minNum}
              max={maxNum}
              className="input-field"
              placeholder={`Enter guess (${minNum} - ${maxNum})...`}
              value={guessInput}
              onChange={(e) => setGuessInput(e.target.value)}
              style={{
                fontSize: "1.2rem",
                fontFamily: "var(--font-mono)",
                fontWeight: "700",
                letterSpacing: "0.05em"
              }}
              autoFocus
              required
            />
            <button
              type="submit"
              className="btn btn-cyan"
              disabled={submitting || !guessInput}
              style={{ padding: "0.85rem 2rem", fontSize: "1.05rem" }}
            >
              <Send size={18} />
              <span>Guess</span>
            </button>
          </form>

          {/* Guess History for Current Round */}
          <div style={{ overflowX: "auto", width: "100%" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Your Guess History
            </h3>
            <GuessHistory history={me?.guess_history} />
          </div>
        </div>
      ) : (
        /* Spectator View */
        <div style={{ textAlign: "center", padding: "2rem 1rem" }} className="animate-fade-in">
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: "rgba(99, 102, 241, 0.15)",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1.5rem"
            }}
          >
            <HelpCircle size={36} color="#818cf8" className="spin-slow" />
          </div>

          <h3 style={{ fontSize: "1.5rem", fontWeight: "800", marginBottom: "0.5rem" }}>
            {opponent?.name} is Guessing...
          </h3>

          <p style={{ color: "var(--text-muted)", fontSize: "1rem", maxWidth: "450px", margin: "0 auto 2rem auto" }}>
            Sit back and watch! Opponent is trying to discover your secret number:{" "}
            <strong style={{ color: "var(--primary-light)", fontFamily: "var(--font-mono)" }}>
              {me?.secret_number}
            </strong>
          </p>

          {/* Opponent Attempt Counter Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "1rem",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "1rem",
              padding: "1rem 2rem"
            }}
          >
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-dim)" }}>
                Opponent Attempts
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "2rem", fontWeight: "800", color: "var(--cyan)" }}>
                {opponent?.guesses_count || 0}
              </div>
            </div>
            <div style={{ height: "40px", width: "1px", background: "var(--border-subtle)" }}></div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-dim)" }}>
                Status
              </div>
              <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--emerald)" }}>
                Thinking...
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
