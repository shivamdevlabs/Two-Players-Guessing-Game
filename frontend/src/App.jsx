import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { DisconnectAlert } from "./components/DisconnectAlert";
import { HomePage } from "./pages/HomePage";
import { LobbyPage } from "./pages/LobbyPage";
import { SecretSelectionPage } from "./pages/SecretSelectionPage";
import { GamePlayPage } from "./pages/GamePlayPage";
import { ResultsPage } from "./pages/ResultsPage";
import { useGameSocket } from "./hooks/useGameSocket";
import { gameApi, sessionManager } from "./services/api";

export function App() {
  const [session, setSession] = useState(() => sessionManager.getSession());
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // Sync state from WebSocket
  const handleStateUpdate = useCallback((newState) => {
    setGameState(newState);
  }, []);

  const {
    connectionStatus,
    gameState: wsGameState,
    remainingSeconds,
    disconnectAlert,
    clearDisconnectAlert,
    refreshState
  } = useGameSocket({
    gameId: session?.game_id,
    playerId: session?.player_id,
    playerToken: session?.player_token,
    onStateUpdate: handleStateUpdate
  });

  // Keep state synced with WebSocket updates
  useEffect(() => {
    if (wsGameState) {
      setGameState(wsGameState);
    }
  }, [wsGameState]);

  // Initial REST fetch when session exists to ensure instant hydration
  useEffect(() => {
    if (!session?.game_id || !session?.player_id || !session?.player_token) {
      setGameState(null);
      return;
    }

    let active = true;
    async function loadInitialState() {
      setLoading(true);
      setFetchError(null);
      try {
        const state = await gameApi.getGameState(
          session.game_id,
          session.player_id,
          session.player_token
        );
        if (active) {
          setGameState(state);
        }
      } catch (err) {
        if (active) {
          console.warn("Could not fetch game state via REST:", err);
          if (err.status === 404 || err.status === 401) {
            // Expired or invalid game session
            sessionManager.clearSession();
            setSession(null);
            clearDisconnectAlert();
          } else {
            setFetchError(err.message || "Failed to load game room.");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadInitialState();
    return () => {
      active = false;
    };
  }, [session, clearDisconnectAlert]);

  const handleGameJoined = (newSession) => {
    clearDisconnectAlert();
    setSession(newSession);
  };

  const handleLeaveGame = () => {
    if (window.confirm("Are you sure you want to leave this game?")) {
      sessionManager.clearSession();
      setSession(null);
      setGameState(null);
      clearDisconnectAlert();
    }
  };

  const handlePlayAgain = () => {
    sessionManager.clearSession();
    setSession(null);
    setGameState(null);
    clearDisconnectAlert();
  };

  // Determine which screen to render
  const renderCurrentScreen = () => {
    if (loading && session && !gameState) {
      return (
        <div className="glass-card animate-fade-in" style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center", padding: "3rem 1.5rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              border: "3px solid rgba(99, 102, 241, 0.2)",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              margin: "0 auto 1.25rem auto"
            }}
            className="spin"
          />
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.4rem" }}>Connecting to Room...</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Restoring your live game session</p>
        </div>
      );
    }

    if (!session || !gameState) {
      return <HomePage onGameJoined={handleGameJoined} />;
    }

    switch (gameState.status) {
      case "LOBBY":
        return (
          <LobbyPage
            gameState={gameState}
            session={session}
            onStateUpdated={setGameState}
          />
        );

      case "SECRET_SELECTION":
        return (
          <SecretSelectionPage
            gameState={gameState}
            session={session}
            onStateUpdated={setGameState}
          />
        );

      case "ROUND_1":
      case "ROUND_2":
        return (
          <GamePlayPage
            gameState={gameState}
            session={session}
            remainingSeconds={remainingSeconds}
            onStateUpdated={setGameState}
          />
        );

      case "GAME_OVER":
        return (
          <ResultsPage
            gameState={gameState}
            session={session}
            onPlayAgain={handlePlayAgain}
            onHome={handlePlayAgain}
          />
        );

      default:
        return <HomePage onGameJoined={handleGameJoined} />;
    }
  };

  return (
    <div className="app-container">
      <Header
        gameState={gameState}
        connectionStatus={session ? connectionStatus : "offline"}
        onLeaveGame={handleLeaveGame}
      />

      <main className="main-content">
        {disconnectAlert && gameState?.status !== "GAME_OVER" && (
          <DisconnectAlert alert={disconnectAlert} onClose={clearDisconnectAlert} />
        )}

        {fetchError && (
          <div
            style={{
              background: "rgba(244, 63, 94, 0.15)",
              color: "var(--rose)",
              padding: "1rem",
              borderRadius: "0.85rem",
              marginBottom: "1.5rem",
              textAlign: "center"
            }}
          >
            {fetchError}
          </div>
        )}

        {renderCurrentScreen()}
      </main>

      <Footer />
    </div>
  );
}

export default App;
