import time
import uuid
import random
import string
import logging
from typing import Dict, Any, Optional, List, Tuple
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import generate_player_token
from app.database.mongo import get_database
from app.models.game import (
    GameStatus,
    PlayerRoundStatus,
    GuessFeedback,
    GuessRecord,
    CreateGameRequest,
    JoinGameRequest,
    AuthPlayerResponse,
    GamePublicState,
    PlayerPublicView,
    GameRoundInfo,
    WinnerInfo,
    GuessResponse,
    FinalResultResponse,
    FinalResultPlayerSummary
)
from app.services.winner_calculator import determine_game_winner, format_time_duration

logger = logging.getLogger("guessing_game.service")

def generate_room_code(length: int = 6) -> str:
    """Generate a clean, unambiguous uppercase room code."""
    # Exclude 0, O, 1, I to avoid confusion
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choices(chars, k=length))

class GameService:
    def __init__(self):
        pass

    @property
    def col(self):
        db = get_database()
        return db["games"]

    async def create_game(self, req: CreateGameRequest) -> Tuple[dict, AuthPlayerResponse]:
        room_code = generate_room_code()
        # Verify uniqueness
        while await self.col.find_one({"room_code": room_code, "status": {"$ne": GameStatus.GAME_OVER}}):
            room_code = generate_room_code()

        game_id = str(uuid.uuid4())
        player_id = str(uuid.uuid4())
        token = generate_player_token(game_id, player_id)

        player1 = {
            "player_id": player_id,
            "player_num": 1,
            "name": req.player_name.strip(),
            "token": token,
            "connected": True,
            "ready": False,
            "has_submitted_secret": False,
            "secret_number": None,
            "guesses": [],
            "guesses_count": 0,
            "guessed_correctly": False,
            "time_taken_seconds": None,
            "round_status": PlayerRoundStatus.WAITING.value
        }

        game_doc = {
            "game_id": game_id,
            "room_code": room_code,
            "status": GameStatus.LOBBY.value,
            "min_number": req.min_number if req.min_number is not None else settings.MIN_NUMBER,
            "max_number": req.max_number if req.max_number is not None else settings.MAX_NUMBER,
            "time_limit_seconds": req.time_limit_seconds,
            "created_at": time.time(),
            "round_info": {
                "current_round": 0,
                "active_guesser_num": None,
                "target_player_num": None,
                "round_start_timestamp": None,
                "round_expires_at_timestamp": None,
                "time_limit_seconds": req.time_limit_seconds
            },
            "players": [player1],
            "winner": None
        }

        await self.col.insert_one(game_doc)
        auth = AuthPlayerResponse(
            game_id=game_id,
            room_code=room_code,
            player_id=player_id,
            player_num=1,
            player_token=token
        )
        return game_doc, auth

    async def join_game(self, req: JoinGameRequest) -> Tuple[dict, AuthPlayerResponse]:
        clean_code = req.room_code.strip().upper()
        game_doc = await self.col.find_one({"room_code": clean_code})
        
        if not game_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Game not found. Please check the game code."
            )

        if game_doc.get("status") != GameStatus.LOBBY.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This game is already in progress or has finished."
            )

        players = game_doc.get("players", [])
        if len(players) >= 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This game already has two players."
            )

        game_id = game_doc["game_id"]
        player_id = str(uuid.uuid4())
        token = generate_player_token(game_id, player_id)

        player2 = {
            "player_id": player_id,
            "player_num": 2,
            "name": req.player_name.strip(),
            "token": token,
            "connected": True,
            "ready": False,
            "has_submitted_secret": False,
            "secret_number": None,
            "guesses": [],
            "guesses_count": 0,
            "guessed_correctly": False,
            "time_taken_seconds": None,
            "round_status": PlayerRoundStatus.WAITING.value
        }

        players.append(player2)
        await self.col.update_one(
            {"game_id": game_id},
            {"$set": {"players": players}}
        )
        game_doc["players"] = players

        auth = AuthPlayerResponse(
            game_id=game_id,
            room_code=clean_code,
            player_id=player_id,
            player_num=2,
            player_token=token
        )
        return game_doc, auth

    async def get_game(self, game_id: str) -> dict:
        doc = await self.col.find_one({"game_id": game_id})
        if not doc:
            raise HTTPException(status_code=404, detail="Game not found.")
        return doc

    async def set_player_ready(self, game_id: str, player_id: str, is_ready: bool) -> dict:
        game_doc = await self.get_game(game_id)
        if game_doc["status"] != GameStatus.LOBBY.value:
            raise HTTPException(status_code=400, detail="Cannot change ready state once game has started.")

        players = game_doc["players"]
        player_found = False
        for p in players:
            if p["player_id"] == player_id:
                p["ready"] = is_ready
                player_found = True
                break

        if not player_found:
            raise HTTPException(status_code=404, detail="Player not found in this game.")

        # Check if both players are ready and there are 2 players
        all_ready = len(players) == 2 and all(p.get("ready") for p in players)
        new_status = GameStatus.SECRET_SELECTION.value if all_ready else GameStatus.LOBBY.value
        game_doc["status"] = new_status

        await self.col.update_one(
            {"game_id": game_id},
            {"$set": {"players": players, "status": new_status}}
        )
        return game_doc

    async def submit_secret_number(self, game_id: str, player_id: str, secret_num: int) -> dict:
        game_doc = await self.get_game(game_id)
        if game_doc["status"] != GameStatus.SECRET_SELECTION.value:
            raise HTTPException(status_code=400, detail="Game is not currently accepting secret numbers.")

        min_num = game_doc.get("min_number", settings.MIN_NUMBER)
        max_num = game_doc.get("max_number", settings.MAX_NUMBER)
        if secret_num < min_num or secret_num > max_num:
            raise HTTPException(
                status_code=400,
                detail=f"Secret number must be between {min_num} and {max_num}."
            )

        players = game_doc["players"]
        player = next((p for p in players if p["player_id"] == player_id), None)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found.")

        if player.get("has_submitted_secret"):
            raise HTTPException(status_code=400, detail="You have already submitted your secret number.")

        player["secret_number"] = secret_num
        player["has_submitted_secret"] = True

        # Check if both players submitted secrets
        both_submitted = len(players) == 2 and all(p.get("has_submitted_secret") for p in players)

        if both_submitted:
            # Transition to ROUND 1: Player 2 guesses Player 1's secret number
            now = time.time()
            time_limit = game_doc["time_limit_seconds"]
            expires_at = now + time_limit

            game_doc["status"] = GameStatus.ROUND_1.value
            game_doc["round_info"] = {
                "current_round": 1,
                "active_guesser_num": 2,  # Player 2 guesses first
                "target_player_num": 1,   # Player 1's number is target
                "round_start_timestamp": now,
                "round_expires_at_timestamp": expires_at,
                "time_limit_seconds": time_limit
            }
            # Set player 2 status to PLAYING, player 1 to WAITING
            for p in players:
                if p["player_num"] == 2:
                    p["round_status"] = PlayerRoundStatus.PLAYING.value
                else:
                    p["round_status"] = PlayerRoundStatus.WAITING.value

        await self.col.update_one(
            {"game_id": game_id},
            {
                "$set": {
                    "players": players,
                    "status": game_doc["status"],
                    "round_info": game_doc["round_info"]
                }
            }
        )
        return game_doc

    async def submit_guess(self, game_id: str, player_id: str, guess: int) -> Tuple[dict, GuessResponse]:
        game_doc = await self.get_game(game_id)
        status_val = game_doc["status"]
        if status_val not in (GameStatus.ROUND_1.value, GameStatus.ROUND_2.value):
            raise HTTPException(status_code=400, detail="Game is not currently in an active guessing round.")

        round_info = game_doc["round_info"]
        active_guesser_num = round_info["active_guesser_num"]
        target_player_num = round_info["target_player_num"]

        players = game_doc["players"]
        guesser = next((p for p in players if p["player_id"] == player_id), None)
        if not guesser:
            raise HTTPException(status_code=404, detail="Player not found.")

        if guesser["player_num"] != active_guesser_num:
            raise HTTPException(status_code=400, detail="It is not your turn to guess.")

        # Check server-side round expiration
        now = time.time()
        expires_at = round_info.get("round_expires_at_timestamp", now)
        if now > expires_at + 1.0:  # 1s grace margin for network latency
            # Process timeout
            game_doc = await self.handle_round_timeout(game_id, round_info["current_round"])
            raise HTTPException(status_code=400, detail="Time limit expired for this round!")

        # Validate range
        min_num = game_doc.get("min_number", settings.MIN_NUMBER)
        max_num = game_doc.get("max_number", settings.MAX_NUMBER)
        if guess < min_num or guess > max_num:
            raise HTTPException(
                status_code=400,
                detail=f"Guess must be a valid number between {min_num} and {max_num}."
            )

        # Check for duplicate guess
        existing_guesses = [g["guess"] for g in guesser.get("guesses", [])]
        if guess in existing_guesses:
            # Duplicate guess: does not increment guess count
            response = GuessResponse(
                success=False,
                feedback=None,
                message=f"You already tried {guess}. Please try a different number.",
                guesses_count=guesser.get("guesses_count", 0),
                is_duplicate=True
            )
            return game_doc, response

        # Target secret number
        target_player = next((p for p in players if p["player_num"] == target_player_num), None)
        if not target_player or target_player.get("secret_number") is None:
            raise HTTPException(status_code=500, detail="Target secret number missing.")

        target_secret = target_player["secret_number"]
        start_time = round_info["round_start_timestamp"] or now

        # Evaluate guess
        if guess < target_secret:
            feedback = GuessFeedback.TOO_LOW
            message = "Too Low! Go Higher."
            correct = False
        elif guess > target_secret:
            feedback = GuessFeedback.TOO_HIGH
            message = "Too High! Go Lower."
            correct = False
        else:
            feedback = GuessFeedback.CORRECT
            message = "Congratulations! You guessed the number correctly."
            correct = True

        # Append guess
        new_count = guesser.get("guesses_count", 0) + 1
        guesser["guesses_count"] = new_count
        guesser.setdefault("guesses", []).append({
            "guess": guess,
            "feedback": feedback.value,
            "message": message,
            "timestamp": now
        })

        if correct:
            time_taken = round(now - start_time, 2)
            guesser["guessed_correctly"] = True
            guesser["round_status"] = PlayerRoundStatus.COMPLETED.value
            guesser["time_taken_seconds"] = time_taken

            # Progress round
            current_round = round_info["current_round"]
            if current_round == 1:
                # Transition to Round 2: Player 1 guesses Player 2's number
                time_limit = game_doc["time_limit_seconds"]
                r2_start = time.time()
                r2_expires = r2_start + time_limit

                game_doc["status"] = GameStatus.ROUND_2.value
                game_doc["round_info"] = {
                    "current_round": 2,
                    "active_guesser_num": 1,  # Player 1's turn
                    "target_player_num": 2,   # Player 2's number
                    "round_start_timestamp": r2_start,
                    "round_expires_at_timestamp": r2_expires,
                    "time_limit_seconds": time_limit
                }
                for p in players:
                    if p["player_num"] == 1:
                        p["round_status"] = PlayerRoundStatus.PLAYING.value
                    else:
                        p["round_status"] = PlayerRoundStatus.COMPLETED.value
            else:
                # Round 2 finished -> GAME OVER
                game_doc["status"] = GameStatus.GAME_OVER.value
                p1 = next(p for p in players if p["player_num"] == 1)
                p2 = next(p for p in players if p["player_num"] == 2)
                winner_info = determine_game_winner(p1, p2)
                game_doc["winner"] = winner_info.model_dump()

        # Update in database
        await self.col.update_one(
            {"game_id": game_id},
            {
                "$set": {
                    "players": players,
                    "status": game_doc["status"],
                    "round_info": game_doc["round_info"],
                    "winner": game_doc.get("winner")
                }
            }
        )

        resp = GuessResponse(
            success=True,
            feedback=feedback,
            message=message,
            guesses_count=new_count,
            is_duplicate=False
        )
        return game_doc, resp

    async def handle_round_timeout(self, game_id: str, round_num: int) -> Optional[dict]:
        """Handle timer expiration for a round."""
        game_doc = await self.col.find_one({"game_id": game_id})
        if not game_doc:
            return None

        # Check if the game is indeed in that round
        if game_doc["round_info"]["current_round"] != round_num:
            return game_doc

        players = game_doc["players"]
        time_limit = game_doc["time_limit_seconds"]
        active_guesser_num = game_doc["round_info"]["active_guesser_num"]

        guesser = next((p for p in players if p["player_num"] == active_guesser_num), None)
        if guesser and guesser.get("round_status") == PlayerRoundStatus.PLAYING.value:
            guesser["round_status"] = PlayerRoundStatus.TIMEOUT.value
            guesser["guessed_correctly"] = False
            guesser["time_taken_seconds"] = float(time_limit)

        if round_num == 1:
            # Move to Round 2
            r2_start = time.time()
            r2_expires = r2_start + time_limit
            game_doc["status"] = GameStatus.ROUND_2.value
            game_doc["round_info"] = {
                "current_round": 2,
                "active_guesser_num": 1,
                "target_player_num": 2,
                "round_start_timestamp": r2_start,
                "round_expires_at_timestamp": r2_expires,
                "time_limit_seconds": time_limit
            }
            for p in players:
                if p["player_num"] == 1:
                    p["round_status"] = PlayerRoundStatus.PLAYING.value
        elif round_num == 2:
            # Move to GAME OVER
            game_doc["status"] = GameStatus.GAME_OVER.value
            p1 = next((p for p in players if p["player_num"] == 1), {})
            p2 = next((p for p in players if p["player_num"] == 2), {})
            winner_info = determine_game_winner(p1, p2)
            game_doc["winner"] = winner_info.model_dump()

        await self.col.update_one(
            {"game_id": game_id},
            {
                "$set": {
                    "players": players,
                    "status": game_doc["status"],
                    "round_info": game_doc["round_info"],
                    "winner": game_doc.get("winner")
                }
            }
        )
        return game_doc

    async def update_player_connection(self, game_id: str, player_id: str, connected: bool):
        await self.col.update_one(
            {"game_id": game_id, "players.player_id": player_id},
            {"$set": {"players.$.connected": connected}}
        )

    def build_player_public_state(self, game_doc: dict, viewer_player_id: str) -> GamePublicState:
        """
        Produce a safe, sanitized game state tailored specifically for viewer_player_id.
        Secret numbers of the opponent are NEVER included!
        Opponent's guess values are NEVER included!
        """
        players = game_doc.get("players", [])
        me_raw = next((p for p in players if p["player_id"] == viewer_player_id), None)
        opp_raw = next((p for p in players if p["player_id"] != viewer_player_id), None)

        def _to_view(p: Optional[dict], is_me: bool) -> Optional[PlayerPublicView]:
            if not p:
                return None
            return PlayerPublicView(
                player_id=p["player_id"],
                player_num=p["player_num"],
                name=p["name"],
                connected=p.get("connected", True),
                ready=p.get("ready", False),
                has_submitted_secret=p.get("has_submitted_secret", False),
                # Only self sees own secret number. Opponent NEVER sees it.
                secret_number=p.get("secret_number") if is_me else None,
                guesses_count=p.get("guesses_count", 0),
                guessed_correctly=p.get("guessed_correctly", False),
                time_taken_seconds=p.get("time_taken_seconds"),
                round_status=PlayerRoundStatus(p.get("round_status", PlayerRoundStatus.WAITING.value)),
                # Guess history is ONLY shown to the guesser themselves
                guess_history=[
                    GuessRecord(
                        guess=g["guess"],
                        feedback=GuessFeedback(g["feedback"]),
                        message=g["message"],
                        timestamp=g["timestamp"]
                    ) for g in p.get("guesses", [])
                ] if is_me else []
            )

        me_view = _to_view(me_raw, is_me=True)
        opp_view = _to_view(opp_raw, is_me=False)

        # Compute remaining seconds
        r_info = game_doc.get("round_info", {})
        expires_at = r_info.get("round_expires_at_timestamp")
        rem_sec = None
        if expires_at and game_doc["status"] in (GameStatus.ROUND_1.value, GameStatus.ROUND_2.value):
            rem_sec = max(0, int(expires_at - time.time()))

        round_info_obj = GameRoundInfo(
            current_round=r_info.get("current_round", 0),
            active_guesser_num=r_info.get("active_guesser_num"),
            target_player_num=r_info.get("target_player_num"),
            round_start_timestamp=r_info.get("round_start_timestamp"),
            round_expires_at_timestamp=expires_at,
            time_limit_seconds=r_info.get("time_limit_seconds", game_doc["time_limit_seconds"]),
            remaining_seconds=rem_sec
        )

        winner_obj = None
        if game_doc.get("winner"):
            winner_obj = WinnerInfo(**game_doc["winner"])

        return GamePublicState(
            game_id=game_doc["game_id"],
            room_code=game_doc["room_code"],
            status=GameStatus(game_doc["status"]),
            min_number=game_doc.get("min_number", settings.MIN_NUMBER),
            max_number=game_doc.get("max_number", settings.MAX_NUMBER),
            time_limit_seconds=game_doc["time_limit_seconds"],
            created_at=game_doc.get("created_at", time.time()),
            round_info=round_info_obj,
            winner=winner_obj,
            me=me_view,
            opponent=opp_view
        )

    async def get_final_result(self, game_id: str, reveal_secrets: bool = False) -> FinalResultResponse:
        game_doc = await self.get_game(game_id)
        if game_doc["status"] != GameStatus.GAME_OVER.value:
            raise HTTPException(status_code=400, detail="Game is not over yet.")

        players = game_doc["players"]
        p1 = next(p for p in players if p["player_num"] == 1)
        p2 = next(p for p in players if p["player_num"] == 2)

        winner = game_doc.get("winner") or determine_game_winner(p1, p2).model_dump()

        def _player_summary(p: dict) -> FinalResultPlayerSummary:
            t_sec = p.get("time_taken_seconds") or 0.0
            s_val = p.get("secret_number")
            return FinalResultPlayerSummary(
                player_num=p["player_num"],
                name=p["name"],
                guesses_count=p.get("guesses_count", 0),
                time_taken_formatted=format_time_duration(t_sec),
                time_taken_seconds=t_sec,
                status=p.get("round_status", "COMPLETED"),
                guessed_correctly=p.get("guessed_correctly", False),
                secret_number_masked="***" if not reveal_secrets else str(s_val),
                secret_number_revealed=s_val if reveal_secrets else None
            )

        total_sec = (p1.get("time_taken_seconds") or 0.0) + (p2.get("time_taken_seconds") or 0.0)

        return FinalResultResponse(
            game_id=game_doc["game_id"],
            room_code=game_doc["room_code"],
            winner_player_num=winner.get("winner_player_num"),
            winner_name=winner.get("winner_name"),
            reason=winner.get("reason", "Game completed"),
            is_draw=winner.get("is_draw", False),
            total_duration_formatted=format_time_duration(total_sec),
            player1=_player_summary(p1),
            player2=_player_summary(p2)
        )

game_service = GameService()
