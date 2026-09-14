import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_api_create_and_join_flow(async_client: AsyncClient):
    # Health check
    res = await async_client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

    # 1. Create game
    create_res = await async_client.post("/api/games", json={
        "player_name": "Shivam",
        "time_limit_seconds": 120,
        "min_number": 1,
        "max_number": 50
    })
    assert create_res.status_code == 201
    p1_data = create_res.json()
    game_id = p1_data["game_id"]
    room_code = p1_data["room_code"]
    p1_id = p1_data["player_id"]
    p1_token = p1_data["player_token"]

    # 2. Join game with invalid code
    bad_join = await async_client.post("/api/games/join", json={
        "player_name": "Rahul",
        "room_code": "INVALID"
    })
    assert bad_join.status_code == 404

    # 3. Join with valid code
    join_res = await async_client.post("/api/games/join", json={
        "player_name": "Rahul",
        "room_code": room_code
    })
    assert join_res.status_code == 200
    p2_data = join_res.json()
    p2_id = p2_data["player_id"]
    p2_token = p2_data["player_token"]

    # 4. Fetch state as Player 1
    state_res = await async_client.get(
        f"/api/games/{game_id}",
        headers={"X-Player-Id": p1_id, "X-Player-Token": p1_token}
    )
    assert state_res.status_code == 200
    state_json = state_res.json()
    assert state_json["me"]["name"] == "Shivam"
    assert state_json["opponent"]["name"] == "Rahul"

    # 5. Toggle ready
    r1 = await async_client.post(
        f"/api/games/{game_id}/ready",
        headers={"X-Player-Id": p1_id, "X-Player-Token": p1_token},
        json={"is_ready": True}
    )
    assert r1.status_code == 200
    assert r1.json()["status"] == "LOBBY"

    r2 = await async_client.post(
        f"/api/games/{game_id}/ready",
        headers={"X-Player-Id": p2_id, "X-Player-Token": p2_token},
        json={"is_ready": True}
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "SECRET_SELECTION"
