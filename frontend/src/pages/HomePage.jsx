import React, { useState, useEffect } from "react";
import { PlusCircle, LogIn, Swords, Shield, Clock, Hash, AlertCircle, Bot, ExternalLink } from "lucide-react";
import { gameApi, sessionManager } from "../services/api";

const TIME_PRESETS = [
  { label: "1 min", seconds: 60 },
  { label: "5 mins", seconds: 300 },
  { label: "10 mins", seconds: 600 },
  { label: "15 mins", seconds: 900 },
  { label: "30 mins", seconds: 1800 },
  { label: "Custom", seconds: "custom" }
];

export function HomePage({ onGameJoined }) {
  const [activeTab, setActiveTab] = useState("create"); // 'create' | 'join'
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [selectedTimePreset, setSelectedTimePreset] = useState(300);
  const [customMinutes, setCustomMinutes] = useState(3);
  const [minNumber] = useState(1);
  const [maxNumber] = useState(100);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSession, setRecentSession] = useState(null);

  useEffect(() => {
    const existing = sessionManager.getSession();
    if (existing && existing.game_id) {
      setRecentSession(existing);
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Please enter your player name.");
      return;
    }

    let timeLimit = selectedTimePreset;
    if (selectedTimePreset === "custom") {
      const parsed = parseInt(customMinutes, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 60) {
        setError("Custom time must be between 1 and 60 minutes.");
        return;
      }
      timeLimit = parsed * 60;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = await gameApi.createGame({
        playerName: playerName.trim(),
        timeLimitSeconds: timeLimit,
        minNumber,
        maxNumber
      });
      sessionManager.saveSession(auth);
      onGameJoined(auth);
    } catch (err) {
      setError(err.message || "Failed to create game room.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Please enter your player name.");
      return;
    }
    if (!roomCode.trim()) {
      setError("Please enter the 6-character game code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = await gameApi.joinGame({
        playerName: playerName.trim(),
        roomCode: roomCode.trim().toUpperCase()
      });
      sessionManager.saveSession(auth);
      onGameJoined(auth);
    } catch (err) {
      setError(err.message || "Failed to join game.");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeRecent = () => {
    if (recentSession) {
      onGameJoined(recentSession);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "560px", margin: "0 auto" }}>
      {/* Title & Concept */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "1rem",
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "1rem",
            border: "1px solid rgba(99, 102, 241, 0.3)"
          }}
        >
          <Swords size={32} color="#818cf8" />
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", letterSpacing: "-0.03em" }}>
          TWO PLAYER GUESSING GAME
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginTop: "0.5rem" }}>
          Pick secret numbers, outsmart your opponent, and guess with fewer attempts!
        </p>
      </div>

      {/* Recent Session Banner */}
      {recentSession && (
        <div
          style={{
            background: "rgba(99, 102, 241, 0.1)",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            borderRadius: "0.85rem",
            padding: "0.85rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem"
          }}
        >
          <div style={{ fontSize: "0.9rem" }}>
            <span>Resume active room: </span>
            <strong style={{ fontFamily: "var(--font-mono)", color: "var(--primary-light)" }}>
              {recentSession.room_code}
            </strong>
          </div>
          <button onClick={handleResumeRecent} className="btn btn-primary" style={{ padding: "0.4rem 0.9rem", fontSize: "0.8rem" }}>
            Rejoin
          </button>
        </div>
      )}

      {/* Single Player vs Computer Switcher Card */}
      <div style={{ marginBottom: "1.75rem" }}>
        <a
          href="https://guessify-numbers-challenge.netlify.app/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.85rem 1.25rem",
            background: "linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(99, 102, 241, 0.08))",
            border: "1px solid rgba(6, 182, 212, 0.35)",
            borderRadius: "0.85rem",
            textDecoration: "none",
            color: "var(--text-main)",
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: "0 4px 15px rgba(6, 182, 212, 0.08)"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.6)";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 25px rgba(6, 182, 212, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.35)";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 15px rgba(6, 182, 212, 0.08)";
          }}
          title="Play Single Player Mode vs Computer"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", textAlign: "left" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.6rem",
                background: "rgba(6, 182, 212, 0.18)",
                border: "1px solid rgba(6, 182, 212, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0
              }}
            >
              <Bot size={22} color="var(--cyan)" />
            </div>
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span>Play Solo vs Computer</span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    padding: "0.15rem 0.45rem",
                    background: "rgba(6, 182, 212, 0.2)",
                    color: "var(--cyan)",
                    borderRadius: "1rem",
                    fontWeight: "800"
                  }}
                >
                  1-Player
                </span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                Play single player on Guessify Numbers Challenge
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.85rem",
              fontWeight: "600",
              color: "var(--cyan)"
            }}
          >
            <span>Play</span>
            <ExternalLink size={15} />
          </div>
        </a>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: "rgba(0, 0, 0, 0.25)",
          borderRadius: "0.85rem",
          padding: "0.3rem",
          marginBottom: "1.75rem",
          border: "1px solid var(--border-subtle)"
        }}
      >
        <button
          onClick={() => { setActiveTab("create"); setError(null); }}
          style={{
            flex: 1,
            padding: "0.75rem",
            border: "none",
            borderRadius: "0.65rem",
            fontWeight: "600",
            cursor: "pointer",
            background: activeTab === "create" ? "var(--primary)" : "transparent",
            color: activeTab === "create" ? "#fff" : "var(--text-dim)",
            transition: "all 0.2s ease"
          }}
        >
          Create Game
        </button>
        <button
          onClick={() => { setActiveTab("join"); setError(null); }}
          style={{
            flex: 1,
            padding: "0.75rem",
            border: "none",
            borderRadius: "0.65rem",
            fontWeight: "600",
            cursor: "pointer",
            background: activeTab === "join" ? "var(--primary)" : "transparent",
            color: activeTab === "join" ? "#fff" : "var(--text-dim)",
            transition: "all 0.2s ease"
          }}
        >
          Join Game
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            background: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            borderRadius: "0.75rem",
            padding: "0.75rem 1rem",
            color: "#fca5a5",
            fontSize: "0.9rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}
        >
          <AlertCircle size={18} color="var(--rose)" />
          <span>{error}</span>
        </div>
      )}

      {/* Create Form */}
      {activeTab === "create" && (
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Your Player Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Shivam"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Time Limit (Per Player)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {TIME_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  className={`chip ${selectedTimePreset === preset.seconds ? "active" : ""}`}
                  onClick={() => setSelectedTimePreset(preset.seconds)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {selectedTimePreset === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} className="animate-fade-in">
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="input-field"
                  placeholder="Minutes"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  style={{ width: "120px" }}
                />
                <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Minutes (1–60)</span>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.85rem",
              color: "var(--text-muted)"
            }}
          >
            <span>Secret Number Range:</span>
            <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>
              {minNumber} – {maxNumber}
            </strong>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
            <PlusCircle size={18} />
            {loading ? "Creating Game..." : "Create Game"}
          </button>
        </form>
      )}

      {/* Join Form */}
      {activeTab === "join" && (
        <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Your Player Name
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Rahul"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
              Game / Room Code
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. ABX72K"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
              style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.15em", textTransform: "uppercase" }}
              required
            />
          </div>

          <button type="submit" className="btn btn-cyan" disabled={loading} style={{ width: "100%", marginTop: "0.5rem" }}>
            <LogIn size={18} />
            {loading ? "Joining Game..." : "Join Game"}
          </button>
        </form>
      )}
    </div>
  );
}
