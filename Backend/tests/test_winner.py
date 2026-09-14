import pytest
from app.services.winner_calculator import determine_game_winner, format_time_duration

def test_winner_fewer_guesses():
    # Player 1 guessed in 4 attempts, Player 2 in 7 attempts
    p1 = {
        "name": "Alice",
        "guesses_count": 4,
        "time_taken_seconds": 90.0,
        "guessed_correctly": True
    }
    p2 = {
        "name": "Bob",
        "guesses_count": 7,
        "time_taken_seconds": 60.0,
        "guessed_correctly": True
    }
    winner = determine_game_winner(p1, p2)
    assert winner.winner_player_num == 1
    assert winner.winner_name == "Alice"
    assert "Fewer guesses" in winner.reason
    assert not winner.is_draw

def test_winner_tie_breaker_faster_time():
    # Both players made 5 guesses, but Player 2 was faster
    p1 = {
        "name": "Alice",
        "guesses_count": 5,
        "time_taken_seconds": 120.0,
        "guessed_correctly": True
    }
    p2 = {
        "name": "Bob",
        "guesses_count": 5,
        "time_taken_seconds": 84.0,
        "guessed_correctly": True
    }
    winner = determine_game_winner(p1, p2)
    assert winner.winner_player_num == 2
    assert winner.winner_name == "Bob"
    assert "Faster time" in winner.reason
    assert not winner.is_draw

def test_winner_exact_draw():
    # Both players made 5 guesses in 80 seconds
    p1 = {
        "name": "Alice",
        "guesses_count": 5,
        "time_taken_seconds": 80.0,
        "guessed_correctly": True
    }
    p2 = {
        "name": "Bob",
        "guesses_count": 5,
        "time_taken_seconds": 80.0,
        "guessed_correctly": True
    }
    winner = determine_game_winner(p1, p2)
    assert winner.is_draw
    assert winner.winner_player_num is None
    assert "Equal guesses" in winner.reason

def test_winner_one_player_timed_out():
    p1 = {
        "name": "Alice",
        "guesses_count": 6,
        "time_taken_seconds": 95.0,
        "guessed_correctly": True
    }
    p2 = {
        "name": "Bob",
        "guesses_count": 12,
        "time_taken_seconds": 300.0,
        "guessed_correctly": False
    }
    winner = determine_game_winner(p1, p2)
    assert winner.winner_player_num == 1
    assert winner.winner_name == "Alice"
    assert "ran out of time" in winner.reason

def test_winner_both_timed_out():
    p1 = {
        "name": "Alice",
        "guesses_count": 8,
        "time_taken_seconds": 300.0,
        "guessed_correctly": False
    }
    p2 = {
        "name": "Bob",
        "guesses_count": 10,
        "time_taken_seconds": 300.0,
        "guessed_correctly": False
    }
    winner = determine_game_winner(p1, p2)
    assert winner.is_draw
    assert "Neither player guessed" in winner.reason
