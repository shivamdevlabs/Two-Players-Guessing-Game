import pytest
from app.services.game_service import game_service
from app.models.game import CreateGameRequest, JoinGameRequest, GameStatus
from app.core.security import verify_player_token

@pytest.mark.asyncio
async def test_secret_number_confidentiality_strict():
    # Verify that at no point in the game is player 1's secret visible to player 2 or vice versa
    c_req = CreateGameRequest(player_name="P1", time_limit_seconds=180)
    game_doc, p1 = await game_service.create_game(c_req)
    
    j_req = JoinGameRequest(player_name="P2", room_code=p1.room_code)
    game_doc, p2 = await game_service.join_game(j_req)

    # Both ready
    await game_service.set_player_ready(p1.game_id, p1.player_id, True)
    game_doc = await game_service.set_player_ready(p1.game_id, p2.player_id, True)

    # Submit secrets
    game_doc = await game_service.submit_secret_number(p1.game_id, p1.player_id, 45)
    # Check p2's view
    v2 = game_service.build_player_public_state(game_doc, p2.player_id)
    assert v2.me.secret_number is None  # P2 hasn't submitted yet
    assert v2.opponent.secret_number is None  # P1's secret NEVER visible

    game_doc = await game_service.submit_secret_number(p1.game_id, p2.player_id, 99)
    # Check both views during Round 1
    v1 = game_service.build_player_public_state(game_doc, p1.player_id)
    v2 = game_service.build_player_public_state(game_doc, p2.player_id)

    assert v1.me.secret_number == 45
    assert v1.opponent.secret_number is None  # P1 cannot see P2's secret

    assert v2.me.secret_number == 99
    assert v2.opponent.secret_number is None  # P2 cannot see P1's secret

@pytest.mark.asyncio
async def test_timeout_transition():
    c_req = CreateGameRequest(player_name="P1", time_limit_seconds=10)
    game_doc, p1 = await game_service.create_game(c_req)
    j_req = JoinGameRequest(player_name="P2", room_code=p1.room_code)
    game_doc, p2 = await game_service.join_game(j_req)

    await game_service.set_player_ready(p1.game_id, p1.player_id, True)
    await game_service.set_player_ready(p1.game_id, p2.player_id, True)

    await game_service.submit_secret_number(p1.game_id, p1.player_id, 25)
    game_doc = await game_service.submit_secret_number(p1.game_id, p2.player_id, 75)
    assert game_doc["status"] == GameStatus.ROUND_1.value

    # Timeout Round 1 (Player 2 times out)
    updated_doc = await game_service.handle_round_timeout(p1.game_id, 1)
    assert updated_doc["status"] == GameStatus.ROUND_2.value
    p2_rec = next(p for p in updated_doc["players"] if p["player_num"] == 2)
    assert p2_rec["round_status"] == "TIMEOUT"
    assert p2_rec["guessed_correctly"] is False

    # Player 1 guesses correctly in Round 2
    updated_doc, guess_resp = await game_service.submit_guess(p1.game_id, p1.player_id, 75)
    assert updated_doc["status"] == GameStatus.GAME_OVER.value
    # P1 should win because P2 timed out!
    assert updated_doc["winner"]["winner_player_num"] == 1
    assert "ran out of time" in updated_doc["winner"]["reason"]
