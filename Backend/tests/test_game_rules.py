import pytest
from app.services.game_service import game_service
from app.models.game import (
    CreateGameRequest,
    JoinGameRequest,
    GameStatus,
    GuessFeedback,
    PlayerRoundStatus
)

@pytest.mark.asyncio
async def test_full_game_lifecycle_and_rules():
    # 1. Player 1 creates game
    create_req = CreateGameRequest(player_name="Shivam", time_limit_seconds=180, min_number=1, max_number=100)
    game_doc, p1_auth = await game_service.create_game(create_req)
    game_id = p1_auth.game_id
    room_code = p1_auth.room_code
    assert game_doc["status"] == GameStatus.LOBBY.value
    assert len(game_doc["players"]) == 1

    # 2. Player 2 joins game
    join_req = JoinGameRequest(player_name="Rahul", room_code=room_code)
    game_doc, p2_auth = await game_service.join_game(join_req)
    assert len(game_doc["players"]) == 2

    # Verify 3rd player cannot join
    with pytest.raises(Exception) as excinfo:
        await game_service.join_game(JoinGameRequest(player_name="Charlie", room_code=room_code))
    assert "already has two players" in str(excinfo.value)

    # 3. Secret number cannot be submitted while still in lobby
    with pytest.raises(Exception):
        await game_service.submit_secret_number(game_id, p1_auth.player_id, 42)

    # 4. Ready states
    game_doc = await game_service.set_player_ready(game_id, p1_auth.player_id, True)
    assert game_doc["status"] == GameStatus.LOBBY.value  # p2 not ready yet

    game_doc = await game_service.set_player_ready(game_id, p2_auth.player_id, True)
    assert game_doc["status"] == GameStatus.SECRET_SELECTION.value

    # 5. Submit secret numbers
    # Shivam chooses 57
    game_doc = await game_service.submit_secret_number(game_id, p1_auth.player_id, 57)
    assert game_doc["status"] == GameStatus.SECRET_SELECTION.value

    # Check that public state for Player 2 hides Shivam's secret
    p2_view = game_service.build_player_public_state(game_doc, p2_auth.player_id)
    assert p2_view.opponent.secret_number is None

    # Rahul chooses 83
    game_doc = await game_service.submit_secret_number(game_id, p2_auth.player_id, 83)
    assert game_doc["status"] == GameStatus.ROUND_1.value
    assert game_doc["round_info"]["current_round"] == 1
    assert game_doc["round_info"]["active_guesser_num"] == 2  # Rahul guesses first

    # 6. Round 1: Rahul guesses Shivam's secret number (57)
    # Turn enforcement: Shivam tries to guess out of turn
    with pytest.raises(Exception) as excinfo:
        await game_service.submit_guess(game_id, p1_auth.player_id, 50)
    assert "not your turn" in str(excinfo.value)

    # Rahul guesses 30 -> Too Low
    game_doc, resp = await game_service.submit_guess(game_id, p2_auth.player_id, 30)
    assert resp.success is True
    assert resp.feedback == GuessFeedback.TOO_LOW
    assert resp.guesses_count == 1

    # Rahul enters duplicate guess 30 -> Should be rejected without incrementing count
    game_doc, resp_dup = await game_service.submit_guess(game_id, p2_auth.player_id, 30)
    assert resp_dup.success is False
    assert resp_dup.is_duplicate is True
    assert resp_dup.guesses_count == 1  # Not incremented

    # Rahul guesses 70 -> Too High
    game_doc, resp = await game_service.submit_guess(game_id, p2_auth.player_id, 70)
    assert resp.feedback == GuessFeedback.TOO_HIGH
    assert resp.guesses_count == 2

    # Rahul guesses 57 -> Correct!
    game_doc, resp = await game_service.submit_guess(game_id, p2_auth.player_id, 57)
    assert resp.feedback == GuessFeedback.CORRECT
    assert resp.guesses_count == 3
    # Game should transition to Round 2!
    assert game_doc["status"] == GameStatus.ROUND_2.value
    assert game_doc["round_info"]["active_guesser_num"] == 1  # Shivam's turn

    # 7. Round 2: Shivam guesses Rahul's secret number (83)
    # Shivam guesses 80 -> Too Low
    game_doc, resp = await game_service.submit_guess(game_id, p1_auth.player_id, 80)
    assert resp.feedback == GuessFeedback.TOO_LOW
    assert resp.guesses_count == 1

    # Shivam guesses 83 -> Correct in 2 guesses!
    game_doc, resp = await game_service.submit_guess(game_id, p1_auth.player_id, 83)
    assert resp.feedback == GuessFeedback.CORRECT
    assert resp.guesses_count == 2
    # Game over!
    assert game_doc["status"] == GameStatus.GAME_OVER.value

    # Shivam took 2 guesses, Rahul took 3 guesses -> Shivam wins!
    assert game_doc["winner"]["winner_player_num"] == 1
    assert game_doc["winner"]["winner_name"] == "Shivam"
    assert "Fewer guesses" in game_doc["winner"]["reason"]

    # 8. Check final results masking
    result_masked = await game_service.get_final_result(game_id, reveal_secrets=False)
    assert result_masked.player1.secret_number_masked == "***"
    assert result_masked.player2.secret_number_masked == "***"

    result_revealed = await game_service.get_final_result(game_id, reveal_secrets=True)
    assert result_revealed.player1.secret_number_revealed == 57
    assert result_revealed.player2.secret_number_revealed == 83
