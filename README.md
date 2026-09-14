# Real-Time Two Player Guessing Game

A production-grade, real-time multiplayer 2-player guessing game web application built with **FastAPI**, **WebSockets**, **MongoDB**, and modern **React (Vite)**.

Originally inspired by a Python CLI two-player guessing game, this application transforms the experience into a modern web duel with live synchronization, authoritative server-side countdown timers, secret number confidentiality, and instant feedback.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack](#technology-stack)
4. [Architecture & Game Flow](#architecture--game-flow)
5. [Project Structure](#project-structure)
6. [MongoDB Setup & Resilient Fallback](#mongodb-setup--resilient-fallback)
7. [Environment Variables](#environment-variables)
8. [Backend Installation & Setup](#backend-installation--setup)
9. [Frontend Installation & Setup](#frontend-installation--setup)
10. [How to Run Locally](#how-to-run-locally)
11. [REST API Documentation](#rest-api-documentation)
12. [WebSocket Architecture](#websocket-architecture)
13. [Game Rules & Turn Progression](#game-rules--turn-progression)
14. [Winner Calculation Engine](#winner-calculation-engine)
15. [Testing Suite](#testing-suite)
16. [Troubleshooting](#troubleshooting)

---

## Project Overview

In this 2-player guessing game:
- **Player 1** creates a game room, sets a configurable time limit (1m, 5m, 10m, 15m, 30m, or Custom), and shares a unique 6-character room code.
- **Player 2** joins using the room code.
- Both players enter the **Lobby** and click **Ready**.
- During **Secret Selection**, each player secretly chooses a number within the configured range (default: `1 – 100`). The backend guarantees that neither player's secret number is ever leaked to the opponent.
- **Round 1**: Player 2 guesses Player 1's secret number while Player 1 spectates the attempt count in real-time.
- **Round 2**: Player 1 guesses Player 2's secret number while Player 2 spectates.
- **Results**: Winner is calculated based on fewer guesses, with time taken as a tie-breaker.

---

## Key Features

- **Real-Time Multiplayer Synchronization**: Low-latency WebSocket channel for lobby presence, ready status, turn progression, and live guess counts.
- **Server-Authoritative Timer**: Timers and expirations are strictly enforced by the backend to prevent browser-side clock manipulation.
- **Confidential Secret Numbers**: Opponent secret numbers and guess history are filtered at the Pydantic serialization layer and never transmitted over public endpoints or WebSockets until post-game review.
- **Duplicate Guess Prevention**: Re-entering a previously attempted guess alerts the user without penalizing their guess count.
- **Graceful Disconnection Handling**: Detects network drops, displays a grace period countdown banner, and allows seamless reconnection using tamper-evident player session tokens.
- **Aesthetic Glassmorphism UI**: Vibrant dark arcade/cyber theme with smooth transitions, animated badges, and celebratory confetti.
- **Zero-Setup Database Fallback**: Automatically connects to MongoDB if available, or falls back to an in-memory `mongomock_motor` client for immediate local development.

---

## Technology Stack

### Backend
- **Python 3.10+ / 3.14**
- **FastAPI**: REST endpoints, OpenAPI docs, and WebSocket router.
- **Uvicorn**: High-performance ASGI server.
- **Motor / PyMongo**: Async MongoDB driver with indexes on `room_code` and `game_id`.
- **mongomock-motor**: Seamless in-memory fallback for zero-config local testing.
- **Pydantic v2**: Strict schema validation and sanitized public state projections.
- **Pytest & Pytest-Asyncio**: Comprehensive test coverage for game rules and API flows.

### Frontend
- **React 19 (Vite)**: Ultra-fast HMR and lightweight bundle.
- **Vanilla CSS (Glassmorphism)**: Custom CSS design system with Outfit typography, responsive flex/grid layouts, and micro-animations.
- **Lucide React**: Clean iconography.
- **Canvas Confetti**: Celebratory particle effects on victory.

---

## Architecture & Game Flow

```
[Browser A: Player 1]                  [Backend: FastAPI + WebSockets]                 [Browser B: Player 2]
         |                                           |                                           |
         |--- POST /api/games (Create) ------------->|                                           |
         |<-- Room Code (e.g. ABX72K) + Token -------|                                           |
         |                                           |<-- POST /api/games/join (Join) -----------|
         |                                           |--- Room Code Validated + Token ---------->|
         |<== WebSocket Connect ====================>|<==================== WebSocket Connect ==>|
         |                                           |                                           |
         |--- POST /games/{id}/ready (Ready) ------->|                                           |
         |                                           |<-- POST /games/{id}/ready (Ready) --------|
         |<== Broadcast: SECRET_SELECTION ==========>|<== Broadcast: SECRET_SELECTION ==========>|
         |                                           |                                           |
         |--- POST /secret (Pick 57) --------------->|                                           |
         |                                           |<-- POST /secret (Pick 83) ----------------|
         |<== Broadcast: ROUND_1 ===================>|<== Broadcast: ROUND_1 ===================>|
         |                                           |                                           |
         |    [Spectator View: Watches attempts]     |    [Guesser View: Player 2 guesses 57]    |
         |                                           |<-- POST /guess (30 -> Too Low) -----------|
         |<== WS: Attempts: 1 ======================>|<== WS: Too Low! Go Higher ===============>|
         |                                           |<-- POST /guess (57 -> Correct!) ----------|
         |                                           |                                           |
         |<== Broadcast: ROUND_2 ===================>|<== Broadcast: ROUND_2 ===================>|
         |                                           |                                           |
         |    [Guesser View: Player 1 guesses 83]    |    [Spectator View: Watches attempts]     |
         |--- POST /guess (83 -> Correct!) --------->|                                           |
         |                                           |                                           |
         |<== Broadcast: GAME_OVER =================>|<== Broadcast: GAME_OVER =================>|
         |    [Winner: Shivam (Fewer guesses)]       |    [Winner: Shivam (Fewer guesses)]       |
```

---

## Project Structure

```text
two-players-guessing-game/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── games.py              # REST API endpoints (create, join, ready, secret, guess, results)
│   │   │   └── ws.py                 # WebSocket endpoint with token authentication & ping/pong
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py             # App settings (Pydantic BaseSettings)
│   │   │   └── security.py           # HMAC player tokens and session validation
│   │   ├── database/
│   │   │   ├── __init__.py
│   │   │   └── mongo.py              # Motor client with resilient in-memory fallback & indexing
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   └── game.py               # Pydantic schemas, Enums, and sanitized view builders
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── game_service.py       # Core game state engine, turns, duplicate check, timeout
│   │   │   └── winner_calculator.py  # Authoritative winner & tie-breaker calculations
│   │   ├── websocket/
│   │   │   ├── __init__.py
│   │   │   └── connection_manager.py # Room-based WS broadcasting, tick timers, disconnect grace
│   │   ├── __init__.py
│   │   └── main.py                   # FastAPI app entry point, CORS, lifespan
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py               # Pytest fixtures and mock DB isolation
│   │   ├── test_game_rules.py        # Guessing rules, duplicates, number ranges
│   │   ├── test_winner.py            # Winner logic (fewer guesses, tie-break, draw, timeout)
│   │   ├── test_api.py               # REST API lifecycle tests
│   │   ├── test_disconnect_and_security.py # Confidentiality & timeout tests
│   │   └── test_live_simulation.py   # Live dual-client WebSocket/REST integration test
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── .env
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx            # Top navbar with room code copy badge & connection status
│   │   │   ├── CountdownTimer.jsx    # Authoritative synchronized timer
│   │   │   ├── GuessHistory.jsx      # Animated feedback table with chips
│   │   │   └── DisconnectAlert.jsx   # Opponent disconnect warning with grace countdown
│   │   ├── pages/
│   │   │   ├── HomePage.jsx          # Create Game / Join Game tabs with presets & validation
│   │   │   ├── LobbyPage.jsx         # Player cards, room code, ready toggle
│   │   │   ├── SecretSelectionPage.jsx # Confidential secret number input
│   │   │   ├── GamePlayPage.jsx      # Dual Guesser / Spectator views
│   │   │   └── ResultsPage.jsx       # Winner dashboard, side-by-side stats, secret reveal
│   │   ├── hooks/
│   │   │   └── useGameSocket.js      # WebSocket hook with auto-reconnect and state sync
│   │   ├── services/
│   │   │   └── api.js                # REST API client & sessionStorage manager
│   │   ├── App.jsx                   # Screen orchestrator
│   │   ├── index.css                 # Glassmorphic dark theme design system
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## MongoDB Setup & Resilient Fallback

The backend connects to MongoDB using the `MONGODB_URL` environment variable.

1. **Production / Local MongoDB**:
   Ensure MongoDB is running on port 27017:
   ```bash
   mongod --dbpath <data-dir>
   ```
2. **Automatic Development Fallback**:
   If no running MongoDB daemon is detected on startup, the application logs a friendly notice and automatically initializes an in-memory `mongomock_motor` client. All collections, queries, atomic updates, and indexes operate identically with zero manual database setup required!

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```

| Variable | Default | Description |
|---|---|---|
| `HOST` | `127.0.0.1` | Backend host address |
| `PORT` | `8000` | Backend port |
| `DEBUG` | `True` | Debug mode |
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection URI |
| `DATABASE_NAME` | `two_player_guessing_game` | Target MongoDB database |
| `SECRET_KEY` | *(random key)* | HMAC key for player session tokens |
| `MIN_NUMBER` | `1` | Default minimum secret number |
| `MAX_NUMBER` | `100` | Default maximum secret number |
| `DEFAULT_TIME_LIMIT_SECONDS` | `300` | Default time limit per round (5 mins) |
| `RECONNECT_GRACE_PERIOD_SECONDS` | `60` | Grace period for disconnected player |

---

## Backend Installation & Setup

1. Open a terminal in `backend/`:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
4. Verify backend health:
   Navigate to `http://127.0.0.1:8000/api/health` or `http://127.0.0.1:8000/docs`.

---

## Frontend Installation & Setup

1. Open a terminal in `frontend/`:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Run the Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
4. Open the application in your browser at `http://127.0.0.1:5173`.

---

## How to Run Locally

To test the two-player game on the same computer:
1. Start the Backend server on port `8000`.
2. Start the Frontend server on port `5173`.
3. Open **Browser Window 1** (e.g. Normal window) at `http://127.0.0.1:5173`:
   - Enter Player Name: **Shivam**.
   - Select Time Limit: **5 mins**.
   - Click **Create Game**.
   - Copy the 6-character room code (e.g. `NQNTBD`).
4. Open **Browser Window 2** (e.g. Incognito window or different browser) at `http://127.0.0.1:5173`:
   - Click the **Join Game** tab.
   - Enter Player Name: **Rahul**.
   - Enter the copied room code.
   - Click **Join Game**.
5. Both players see each other in the Lobby and click **Ready / Start Game**.
6. Both enter secret numbers (e.g. Shivam enters 57, Rahul enters 83).
7. Play Round 1 (Rahul guesses 57) and Round 2 (Shivam guesses 83).
8. View the final victory celebration and detailed results!

---

## REST API Documentation

Interactive Swagger documentation is available at `http://127.0.0.1:8000/docs`.

### Key Endpoints:
- `POST /api/games`: Creates a game room. Returns `game_id`, `room_code`, `player_id`, `player_token`.
- `POST /api/games/join`: Joins an existing room using `room_code`.
- `GET /api/games/{game_id}`: Returns the sanitized public state for the calling player (requires `X-Player-Id` and `X-Player-Token` headers).
- `POST /api/games/{game_id}/ready`: Toggles ready state. Transitions to `SECRET_SELECTION` when both are ready.
- `POST /api/games/{game_id}/secret`: Submits player's confidential secret number. Transitions to `ROUND_1` when both submitted.
- `POST /api/games/{game_id}/guess`: Submits a guess during the player's active turn. Returns feedback (`TOO_LOW`, `TOO_HIGH`, `CORRECT`) and updated state.
- `GET /api/games/{game_id}/result?reveal_secrets=false`: Returns the finalized match statistics, winner, and reasons.

---

## WebSocket Architecture

- **Endpoint**: `/ws/games/{game_id}?token={player_token}&player_id={player_id}`
- **Authentication**: Validates HMAC player token before accepting the connection.
- **Broadcast Events**:
  - `GAME_STATE_UPDATE`: Dispatched whenever a player joins, changes ready status, submits a secret, or guesses. Sanitized so Player 1 and Player 2 receive only their authorized data.
  - `TIMER_TICK`: Broadcasts remaining round seconds every second to keep the visual countdown in sync with server authority.
  - `OPPONENT_DISCONNECTED`: Notifies the active player when their opponent drops connection, indicating grace period remaining.
  - `OPPONENT_RECONNECTED`: Notifies that the opponent has reconnected.
- **Heartbeat**: Client sends `{"type": "PING"}` every 15 seconds; server responds with `{"type": "PONG"}`.

---

## Game Rules & Turn Progression

1. **Configurable Range**: Numbers must be integers between `MIN_NUMBER` and `MAX_NUMBER` (default: `1 – 100`).
2. **Round 1**: Player 2 attempts to guess Player 1's secret number.
3. **Round 2**: Player 1 attempts to guess Player 2's secret number.
4. **Duplicate Guess Rule**: Submitting an already tried guess returns `"You already tried this number"` and does not increment the guess counter.
5. **Timer Expiration**: If the round timer reaches zero, that player is marked as `TIMEOUT`, and the game advances to the next round or concludes.

---

## Winner Calculation Engine

The authoritative winner logic is executed on the backend in `app/services/winner_calculator.py`:

1. **Successful Guess vs. Timeout**:
   - If one player successfully guesses the opponent's number and the other player times out, the successful player wins.
   - If both players timed out, the match is declared a **DRAW**.
2. **Primary Winning Criterion**:
   - The player who guessed the opponent's secret number in **FEWER guesses** wins.
3. **Secondary Tie-Breaker**:
   - If both players have the exact same number of guesses, the player with **LESS time taken** wins.
4. **Exact Tie**:
   - If both guesses count and time taken are identical, the result is a **DRAW**.

---

## Testing Suite

Run the comprehensive pytest suite:
```bash
cd backend
python -m pytest tests -v
```

Includes:
- `test_api.py`: Creation, validation, and REST lifecycle.
- `test_winner.py`: All winner permutations (fewer guesses, faster time tie-breaker, draw, timeout win).
- `test_game_rules.py`: Turn enforcement, duplicate guess rejection, range limits.
- `test_disconnect_and_security.py`: Verifies opponent secret numbers are never leaked across any state.
- `test_live_simulation.py`: Complete live dual-client WebSocket integration test against the running server.

---

## Troubleshooting

- **CORS Errors**: The backend CORS middleware permits origins from Vite (`http://localhost:5173`, `http://127.0.0.1:5173`). If accessing via another host, update `CORS_ORIGINS` in `backend/.env`.
- **Port Conflict**: If port 8000 or 5173 is already in use, run Uvicorn on another port:
  ```bash
  python -m uvicorn app.main:app --port 8001
  ```
  And pass `VITE_API_URL=http://127.0.0.1:8001/api` and `VITE_WS_URL=ws://127.0.0.1:8001` when running the frontend.
- **Connection Lost**: If your Wi-Fi drops temporarily, refresh the browser; your active session in `sessionStorage` will automatically reconnect you to the room.
