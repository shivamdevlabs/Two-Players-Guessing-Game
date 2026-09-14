const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const SESSION_KEY = "two_player_game_session";

export const sessionManager = {
  saveSession(sessionData) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    } catch (e) {
      console.warn("Could not save session to sessionStorage", e);
    }
  },
  getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },
  clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {
      console.warn("Could not clear session", e);
    }
  }
};

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  }

  if (!response.ok) {
    const errorMsg = data?.detail || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const gameApi = {
  async createGame({ playerName, timeLimitSeconds, minNumber = 1, maxNumber = 100 }) {
    return await apiRequest("/games", {
      method: "POST",
      body: JSON.stringify({
        player_name: playerName,
        time_limit_seconds: timeLimitSeconds,
        min_number: minNumber,
        max_number: maxNumber
      })
    });
  },

  async joinGame({ playerName, roomCode }) {
    return await apiRequest("/games/join", {
      method: "POST",
      body: JSON.stringify({
        player_name: playerName,
        room_code: roomCode.trim().toUpperCase()
      })
    });
  },

  async getGameState(gameId, playerId, playerToken) {
    return await apiRequest(`/games/${gameId}`, {
      method: "GET",
      headers: {
        "X-Player-Id": playerId,
        "X-Player-Token": playerToken
      }
    });
  },

  async setReady(gameId, playerId, playerToken, isReady = true) {
    return await apiRequest(`/games/${gameId}/ready`, {
      method: "POST",
      headers: {
        "X-Player-Id": playerId,
        "X-Player-Token": playerToken
      },
      body: JSON.stringify({ is_ready: isReady })
    });
  },

  async submitSecret(gameId, playerId, playerToken, secretNumber) {
    return await apiRequest(`/games/${gameId}/secret`, {
      method: "POST",
      headers: {
        "X-Player-Id": playerId,
        "X-Player-Token": playerToken
      },
      body: JSON.stringify({ secret_number: Number(secretNumber) })
    });
  },

  async submitGuess(gameId, playerId, playerToken, guess) {
    return await apiRequest(`/games/${gameId}/guess`, {
      method: "POST",
      headers: {
        "X-Player-Id": playerId,
        "X-Player-Token": playerToken
      },
      body: JSON.stringify({ guess: Number(guess) })
    });
  },

  async getFinalResults(gameId, revealSecrets = false) {
    return await apiRequest(`/games/${gameId}/result?reveal_secrets=${revealSecrets}`, {
      method: "GET"
    });
  }
};
