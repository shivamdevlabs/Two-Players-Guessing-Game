import asyncio
import json
import httpx
import websockets

async def recv_until_status(ws, expected_status, timeout=5.0):
    start = asyncio.get_event_loop().time()
    while asyncio.get_event_loop().time() - start < timeout:
        raw = await asyncio.wait_for(ws.recv(), timeout=2.0)
        data = json.loads(raw)
        if data.get("type") == "GAME_STATE_UPDATE":
            if data["state"].get("status") == expected_status:
                return data
    raise TimeoutError(f"Did not receive status {expected_status} within timeout")

async def simulate_two_player_game():
    print("=== STARTING FULL MULTIPLAYER REAL-TIME SIMULATION ===")
    base_url = "http://127.0.0.1:8000/api"
    ws_base = "ws://127.0.0.1:8000"

    async with httpx.AsyncClient() as client:
        # 1. Player 1 (Shivam) creates a game
        print("\n1. Player 1 creates game...")
        res = await client.post(f"{base_url}/games", json={
            "player_name": "Shivam",
            "time_limit_seconds": 60,
            "min_number": 1,
            "max_number": 100
        })
        assert res.status_code == 201, f"Failed create: {res.text}"
        p1 = res.json()
        game_id = p1["game_id"]
        room_code = p1["room_code"]
        print(f"-> Game Created! Game ID: {game_id}, Room Code: {room_code}")

        # 2. Player 2 (Rahul) joins the game
        print("\n2. Player 2 joins with Room Code:", room_code)
        res = await client.post(f"{base_url}/games/join", json={
            "player_name": "Rahul",
            "room_code": room_code
        })
        assert res.status_code == 200, f"Failed join: {res.text}"
        p2 = res.json()
        print(f"-> Player 2 Joined! Player ID: {p2['player_id']}")

        # 3. Connect both players to WebSockets
        print("\n3. Connecting both players to WebSockets...")
        ws1_url = f"{ws_base}/ws/games/{game_id}?token={p1['player_token']}&player_id={p1['player_id']}"
        ws2_url = f"{ws_base}/ws/games/{game_id}?token={p2['player_token']}&player_id={p2['player_id']}"

        async with websockets.connect(ws1_url) as ws1, websockets.connect(ws2_url) as ws2:
            print("-> Both WebSockets connected.")

            # 4. Both players toggle Ready
            print("\n4. Both players click Ready...")
            await client.post(f"{base_url}/games/{game_id}/ready", headers={
                "X-Player-Id": p1["player_id"],
                "X-Player-Token": p1["player_token"]
            }, json={"is_ready": True})

            await client.post(f"{base_url}/games/{game_id}/ready", headers={
                "X-Player-Id": p2["player_id"],
                "X-Player-Token": p2["player_token"]
            }, json={"is_ready": True})

            # Receive until SECRET_SELECTION
            data1 = await recv_until_status(ws1, "SECRET_SELECTION")
            data2 = await recv_until_status(ws2, "SECRET_SELECTION")
            print("-> Both players ready! Game transitioned to SECRET_SELECTION.")

            # 5. Secret Number Selection
            print("\n5. Submitting Secret Numbers...")
            # Shivam chooses 57
            await client.post(f"{base_url}/games/{game_id}/secret", headers={
                "X-Player-Id": p1["player_id"],
                "X-Player-Token": p1["player_token"]
            }, json={"secret_number": 57})
            print("-> Shivam secretly chose 57.")

            # Rahul chooses 83
            await client.post(f"{base_url}/games/{game_id}/secret", headers={
                "X-Player-Id": p2["player_id"],
                "X-Player-Token": p2["player_token"]
            }, json={"secret_number": 83})
            print("-> Rahul secretly chose 83.")

            # Check WebSocket state for ROUND_1
            r1_state = await recv_until_status(ws1, "ROUND_1")
            assert r1_state["state"]["round_info"]["active_guesser_num"] == 2
            # Verify Shivam cannot see Rahul's secret number!
            assert r1_state["state"]["opponent"]["secret_number"] is None
            print("-> Round 1 Started! Active Guesser is Player 2 (Rahul). Opponent's secret is strictly confidential.")

            # 6. Round 1: Rahul guesses Shivam's secret number (57)
            print("\n6. Round 1 Guessing (Rahul guesses Shivam's number):")
            # Guess 30
            res = await client.post(f"{base_url}/games/{game_id}/guess", headers={
                "X-Player-Id": p2["player_id"],
                "X-Player-Token": p2["player_token"]
            }, json={"guess": 30})
            print("-> Guess 30:", res.json()["message"], f"(Attempts: {res.json()['guesses_count']})")
            assert res.json()["feedback"] == "TOO_LOW"

            # Duplicate guess 30
            res_dup = await client.post(f"{base_url}/games/{game_id}/guess", headers={
                "X-Player-Id": p2["player_id"],
                "X-Player-Token": p2["player_token"]
            }, json={"guess": 30})
            print("-> Duplicate Guess 30:", res_dup.json()["message"], f"(Attempts: {res_dup.json()['guesses_count']})")
            assert res_dup.json()["is_duplicate"] is True
            assert res_dup.json()["guesses_count"] == 1

            # Guess 70
            res = await client.post(f"{base_url}/games/{game_id}/guess", headers={
                "X-Player-Id": p2["player_id"],
                "X-Player-Token": p2["player_token"]
            }, json={"guess": 70})
            print("-> Guess 70:", res.json()["message"], f"(Attempts: {res.json()['guesses_count']})")
            assert res.json()["feedback"] == "TOO_HIGH"

            # Guess 57 (Correct!)
            res = await client.post(f"{base_url}/games/{game_id}/guess", headers={
                "X-Player-Id": p2["player_id"],
                "X-Player-Token": p2["player_token"]
            }, json={"guess": 57})
            print("-> Guess 57:", res.json()["message"], f"(Attempts: {res.json()['guesses_count']})")
            assert res.json()["feedback"] == "CORRECT"

            # Check that Round transitioned to Round 2!
            r2_state = await recv_until_status(ws2, "ROUND_2")
            assert r2_state["state"]["round_info"]["active_guesser_num"] == 1
            print("-> Round 1 Finished! Game transitioned to Round 2. Active Guesser is Player 1 (Shivam).")

            # 7. Round 2: Shivam guesses Rahul's secret number (83)
            print("\n7. Round 2 Guessing (Shivam guesses Rahul's number):")
            # Shivam guesses 80
            res = await client.post(f"{base_url}/games/{game_id}/guess", headers={
                "X-Player-Id": p1["player_id"],
                "X-Player-Token": p1["player_token"]
            }, json={"guess": 80})
            print("-> Guess 80:", res.json()["message"], f"(Attempts: {res.json()['guesses_count']})")
            assert res.json()["feedback"] == "TOO_LOW"

            # Shivam guesses 83 (Correct in 2 guesses!)
            res = await client.post(f"{base_url}/games/{game_id}/guess", headers={
                "X-Player-Id": p1["player_id"],
                "X-Player-Token": p1["player_token"]
            }, json={"guess": 83})
            print("-> Guess 83:", res.json()["message"], f"(Attempts: {res.json()['guesses_count']})")
            assert res.json()["feedback"] == "CORRECT"

            # 8. Check Game Over and Results
            game_over_state = await recv_until_status(ws1, "GAME_OVER")
            winner = game_over_state["state"]["winner"]
            print(f"\n8. GAME OVER! Winner: {winner['winner_name']} | Reason: {winner['reason']}")
            assert winner["winner_name"] == "Shivam"

            # 9. Verify Final Results Endpoint
            res_results = await client.get(f"{base_url}/games/{game_id}/result")
            final_res = res_results.json()
            print("\n=== FINAL RESULTS DASHBOARD ===")
            print(f"Winner: {final_res['winner_name']}")
            print(f"Reason: {final_res['reason']}")
            print(f"Player 1 ({final_res['player1']['name']}): Guesses={final_res['player1']['guesses_count']}, Secret={final_res['player1']['secret_number_masked']}")
            print(f"Player 2 ({final_res['player2']['name']}): Guesses={final_res['player2']['guesses_count']}, Secret={final_res['player2']['secret_number_masked']}")

            # Reveal secrets
            res_revealed = await client.get(f"{base_url}/games/{game_id}/result?reveal_secrets=true")
            rev = res_revealed.json()
            print(f"Revealed Secrets: P1={rev['player1']['secret_number_revealed']}, P2={rev['player2']['secret_number_revealed']}")
            assert rev['player1']['secret_number_revealed'] == 57
            assert rev['player2']['secret_number_revealed'] == 83
            print("\n*** ALL LIVE END-TO-END MULTIPLAYER CHECKS PASSED PERFECTLY! ***")

if __name__ == "__main__":
    asyncio.run(simulate_two_player_game())
