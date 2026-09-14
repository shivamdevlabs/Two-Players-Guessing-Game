# Production Deployment Guide: Two-Player Guessing Game

This guide explains how to deploy the full **Two-Player Guessing Game** with:
- **Frontend** on **Vercel** (Global edge CDN, ultra-fast Vite React SPA)
- **Backend** on **Render** (Continuous 24/7 Python FastAPI + Real-Time WebSockets)
- **Database** on **MongoDB Atlas** (Free cloud M0 cluster)

---

## 🏛️ Architecture Overview

```
┌──────────────────────────────────────┐
│          Player 1 & Player 2         │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│        Vercel (React Frontend)       │
│    https://guess-dual.vercel.app     │
└──────────────────┬───────────────────┘
                   │ REST (HTTPS) & Real-Time WebSockets (WSS)
                   ▼
┌──────────────────────────────────────┐
│       Render (FastAPI Backend)       │
│    https://guess-backend.onrender.com│
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│         MongoDB Atlas Cluster        │
└──────────────────────────────────────┘
```

> **Why host the backend on Render instead of Vercel Serverless?**  
> Vercel Serverless Functions are stateless and terminate after short requests. Because this game requires **persistent real-time WebSockets (`/ws/games/{id}`)**, **in-memory player state synchronization**, and **server-authoritative 1-second countdown timers**, it needs a continuous container host like Render or Railway.

---

## Step 1: Deploy Backend on Render (Free & Fast)

1. Push your repository to **GitHub**.
2. Go to [Render.com](https://render.com) and log in (with your GitHub account).
3. Click **New +** -> **Web Service**.
4. Select your **`Two-Players-Guessing-Game`** repository.
5. Fill in the service details:
   - **Name**: `two-player-guessing-game-backend`
   - **Region**: Closest to your players (e.g. Frankfurt, Oregon, Singapore)
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
6. Under **Environment Variables**, add:
   - `DEBUG` = `false`
   - `SECRET_KEY` = *(click generate or enter any random string)*
   - `MONGODB_URL` = *(Optional: paste your MongoDB Atlas URI, or leave empty to use built-in memory mode)*
7. Click **Create Web Service**.
8. Render will build and deploy your backend in ~1–2 minutes. Copy your backend URL:
   - Example: `https://two-player-guessing-game-backend.onrender.com`

---

## Step 2: Set up MongoDB Atlas (Optional, for Cloud Persistence)

If you want persistent game history in the cloud:
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and create a free M0 cluster.
2. Under **Database Access**, create a database user (e.g. `guess_user` with a secure password).
3. Under **Network Access**, click **Add IP Address** -> select **Allow Access from Anywhere (`0.0.0.0/0`)**.
4. In Atlas, click **Connect** -> **Drivers** -> Copy the connection string:
   ```
   mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority
   ```
5. In your Render backend dashboard, go to **Environment** and set:
   `MONGODB_URL` = `your_mongodb_connection_string`

*(Note: If you don't configure MongoDB, the backend automatically uses its built-in resilient in-memory storage, so games work immediately!)*

---

## Step 3: Deploy Frontend on Vercel

1. Go to [Vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New...** -> **Project**.
3. Import your **`Two-Players-Guessing-Game`** repository.
4. In the configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and choose `frontend`
   - **Build and Output Settings**: Leave defaults (`npm run build` and `dist`)
5. Open the **Environment Variables** section:
   - Add **Name**: `VITE_API_URL`
   - Add **Value**: `https://two-player-guessing-game-backend.onrender.com/api`  
     *(Replace with your actual Render backend URL from Step 1)*
   
   > **Note on WebSockets:** You do **not** even need to set `VITE_WS_URL`! The frontend automatically converts `https://...` to `wss://...` for real-time WebSockets.
6. Click **Deploy**.
7. Vercel will build your project in ~30 seconds and provide your live production URL (e.g., `https://two-players-guessing-game.vercel.app`).

---

## Step 4: Verify Deployment

1. Open your live Vercel URL in your browser.
2. Check the connection indicator:
   - In the header, you should see the green **"LIVE"** indicator.
3. Click **Create Game**, select a duration (e.g., 5 min), and copy the 6-character room code.
4. Open an **Incognito** or second browser window and join the room with the code.
5. Both players click **Ready**, choose secrets, and play the live game!

---

## 🛠️ Local Testing vs. Production Summary

| Variable | Local Development | Vercel / Production |
| :--- | :--- | :--- |
| `VITE_API_URL` | `http://127.0.0.1:8000/api` | `https://your-backend.onrender.com/api` |
| `VITE_WS_URL` | `ws://127.0.0.1:8000` | `wss://your-backend.onrender.com` *(auto-derived)* |
| `MONGODB_URL` | `mongodb://localhost:27017` *(or mock)* | `mongodb+srv://...` |
| `HOST` | `127.0.0.1` | `0.0.0.0` |
