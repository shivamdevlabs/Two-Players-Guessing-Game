import { useState, useEffect, useRef, useCallback } from "react";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://127.0.0.1:8000";

export function useGameSocket({ gameId, playerId, playerToken, onStateUpdate }) {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [gameState, setGameState] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [disconnectAlert, setDisconnectAlert] = useState(null);
  const socketRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const unmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!gameId || !playerId || !playerToken) return;

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setConnectionStatus("connecting");
    const wsUrl = `${WS_BASE}/ws/games/${gameId}?token=${encodeURIComponent(playerToken)}&player_id=${encodeURIComponent(playerId)}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (unmountedRef.current) {
          ws.close();
          return;
        }
        setConnectionStatus("connected");

        // Start ping keepalive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "PING" }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "GAME_STATE_UPDATE":
              setGameState(data.state);
              if (data.state?.round_info?.remaining_seconds !== undefined) {
                setRemainingSeconds(data.state.round_info.remaining_seconds);
              }
              if (data.state?.status === "GAME_OVER") {
                setDisconnectAlert(null);
              }
              if (onStateUpdate) onStateUpdate(data.state);
              break;

            case "TIMER_TICK":
              setRemainingSeconds(data.remaining_seconds);
              break;

            case "OPPONENT_DISCONNECTED":
              // Only alert if the game is still active, not after GAME_OVER
              setGameState((current) => {
                if (current?.status !== "GAME_OVER") {
                  setDisconnectAlert({
                    message: data.message,
                    graceSeconds: data.grace_seconds
                  });
                }
                return current;
              });
              break;

            case "OPPONENT_RECONNECTED":
              setDisconnectAlert(null);
              break;

            case "PONG":
              break;

            default:
              break;
          }
        } catch (err) {
          console.error("Error parsing WebSocket message", err);
        }
      };

      ws.onerror = (e) => {
        console.warn("WebSocket error:", e);
      };

      ws.onclose = (e) => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        if (unmountedRef.current) return;

        setConnectionStatus("disconnected");
        // Reconnect after 2 seconds if not a policy violation close
        if (e.code !== 1008) {
          setConnectionStatus("reconnecting");
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!unmountedRef.current) {
              connect();
            }
          }, 2000);
        }
      };
    } catch (err) {
      console.error("Failed to construct WebSocket", err);
      setConnectionStatus("disconnected");
    }
  }, [gameId, playerId, playerToken, onStateUpdate]);

  const refreshState = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "REFRESH_STATE" }));
    }
  }, []);

  const clearDisconnectAlert = useCallback(() => {
    setDisconnectAlert(null);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    connect();

    return () => {
      unmountedRef.current = true;
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  return {
    connectionStatus,
    gameState,
    setGameState,
    remainingSeconds,
    setRemainingSeconds,
    disconnectAlert,
    clearDisconnectAlert,
    refreshState
  };
}
