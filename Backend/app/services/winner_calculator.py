from typing import Dict, Any, Tuple, Optional
from app.models.game import WinnerInfo

def format_time_duration(seconds: float) -> str:
    """Format seconds into user-friendly string e.g. '1m 24s' or '45s'."""
    if seconds is None:
        return "N/A"
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    if mins > 0:
        return f"{mins}m {secs}s"
    return f"{secs}s"

def determine_game_winner(player1: Dict[str, Any], player2: Dict[str, Any]) -> WinnerInfo:
    """
    Determine the game winner based on the authoritative rules:
    
    1. Completion status:
       - If only one player guessed correctly and the other timed out (or did not complete),
         the player who guessed correctly wins.
       - If neither player guessed correctly (e.g. both timed out), the game is a DRAW.
       
    2. Primary criterion (both guessed correctly):
       - The player with FEWER guesses wins.
       
    3. Secondary tie-breaker (same guesses count):
       - The player who took LESS time wins.
       
    4. Exact tie (same guesses count and exact same time):
       - Result is a DRAW.
    """
    p1_correct = player1.get("guessed_correctly", False)
    p2_correct = player2.get("guessed_correctly", False)
    
    p1_guesses = player1.get("guesses_count", 0)
    p2_guesses = player2.get("guesses_count", 0)
    
    p1_time = player1.get("time_taken_seconds", 0.0) or 0.0
    p2_time = player2.get("time_taken_seconds", 0.0) or 0.0

    p1_name = player1.get("name", "Player 1")
    p2_name = player2.get("name", "Player 2")

    # Case 1: One player guessed correctly, one timed out/failed
    if p1_correct and not p2_correct:
        return WinnerInfo(
            winner_player_num=1,
            winner_name=p1_name,
            reason=f"{p1_name} guessed correctly while {p2_name} ran out of time.",
            is_draw=False
        )
    elif p2_correct and not p1_correct:
        return WinnerInfo(
            winner_player_num=2,
            winner_name=p2_name,
            reason=f"{p2_name} guessed correctly while {p1_name} ran out of time.",
            is_draw=False
        )
    elif not p1_correct and not p2_correct:
        return WinnerInfo(
            winner_player_num=None,
            winner_name=None,
            reason="Neither player guessed the secret number in time.",
            is_draw=True
        )

    # Case 2: Both players guessed correctly
    # Compare guesses count
    if p1_guesses < p2_guesses:
        return WinnerInfo(
            winner_player_num=1,
            winner_name=p1_name,
            reason=f"Fewer guesses ({p1_guesses} vs {p2_guesses})",
            is_draw=False
        )
    elif p2_guesses < p1_guesses:
        return WinnerInfo(
            winner_player_num=2,
            winner_name=p2_name,
            reason=f"Fewer guesses ({p2_guesses} vs {p1_guesses})",
            is_draw=False
        )
    
    # Case 3: Both have the exact same number of guesses -> Tie-breaker by time
    # Compare with small precision tolerance (0.01s)
    if abs(p1_time - p2_time) > 0.05:
        if p1_time < p2_time:
            return WinnerInfo(
                winner_player_num=1,
                winner_name=p1_name,
                reason=f"Tie-breaker: Faster time ({format_time_duration(p1_time)} vs {format_time_duration(p2_time)}) with equal guesses ({p1_guesses})",
                is_draw=False
            )
        else:
            return WinnerInfo(
                winner_player_num=2,
                winner_name=p2_name,
                reason=f"Tie-breaker: Faster time ({format_time_duration(p2_time)} vs {format_time_duration(p1_time)}) with equal guesses ({p2_guesses})",
                is_draw=False
            )
    
    # Case 4: Identical guesses and identical time
    return WinnerInfo(
        winner_player_num=None,
        winner_name=None,
        reason=f"Equal guesses ({p1_guesses}) and equal time ({format_time_duration(p1_time)})",
        is_draw=True
    )
