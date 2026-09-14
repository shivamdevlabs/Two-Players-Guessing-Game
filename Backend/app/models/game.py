from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class GameStatus(str, Enum):
    LOBBY = "LOBBY"
    SECRET_SELECTION = "SECRET_SELECTION"
    ROUND_1 = "ROUND_1"
    ROUND_2 = "ROUND_2"
    GAME_OVER = "GAME_OVER"
    CANCELLED = "CANCELLED"

class PlayerRoundStatus(str, Enum):
    WAITING = "WAITING"
    PLAYING = "PLAYING"
    COMPLETED = "COMPLETED"
    TIMEOUT = "TIMEOUT"

class GuessFeedback(str, Enum):
    TOO_LOW = "TOO_LOW"
    TOO_HIGH = "TOO_HIGH"
    CORRECT = "CORRECT"

class GuessRecord(BaseModel):
    guess: int
    feedback: GuessFeedback
    message: str
    timestamp: float

# Request Schemas
class CreateGameRequest(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=24)
    time_limit_seconds: int = Field(default=300, ge=10, le=3600)
    min_number: Optional[int] = Field(default=1, ge=1)
    max_number: Optional[int] = Field(default=100, le=10000)

class JoinGameRequest(BaseModel):
    player_name: str = Field(..., min_length=1, max_length=24)
    room_code: str = Field(..., min_length=4, max_length=10)

class ReadyRequest(BaseModel):
    is_ready: bool = True

class SecretNumberRequest(BaseModel):
    secret_number: int

class GuessRequest(BaseModel):
    guess: int

# Responses
class AuthPlayerResponse(BaseModel):
    game_id: str
    room_code: str
    player_id: str
    player_num: int
    player_token: str

class PlayerPublicView(BaseModel):
    player_id: str
    player_num: int
    name: str
    connected: bool
    ready: bool
    has_submitted_secret: bool
    secret_number: Optional[int] = None  # None for opponent, revealed only for self or at game_over if explicitly opted
    guesses_count: int
    guessed_correctly: bool
    time_taken_seconds: Optional[float] = None
    round_status: PlayerRoundStatus
    # Only visible to the player themselves
    guess_history: List[GuessRecord] = []

class GameRoundInfo(BaseModel):
    current_round: int  # 1 or 2, or 0 for lobby/secret
    active_guesser_num: Optional[int] = None  # 2 in Round 1, 1 in Round 2
    target_player_num: Optional[int] = None   # 1 in Round 1, 2 in Round 2
    round_start_timestamp: Optional[float] = None
    round_expires_at_timestamp: Optional[float] = None
    time_limit_seconds: int
    remaining_seconds: Optional[int] = None

class WinnerInfo(BaseModel):
    winner_player_num: Optional[int] = None  # 1, 2, or None for DRAW
    winner_name: Optional[str] = None
    reason: Optional[str] = None
    is_draw: bool = False

class GamePublicState(BaseModel):
    game_id: str
    room_code: str
    status: GameStatus
    min_number: int
    max_number: int
    time_limit_seconds: int
    created_at: float
    round_info: GameRoundInfo
    winner: Optional[WinnerInfo] = None
    me: Optional[PlayerPublicView] = None
    opponent: Optional[PlayerPublicView] = None
    disconnect_warning: Optional[Dict[str, Any]] = None

class GuessResponse(BaseModel):
    success: bool
    feedback: Optional[GuessFeedback] = None
    message: str
    guesses_count: int
    is_duplicate: bool = False
    game_state: Optional[GamePublicState] = None

class FinalResultPlayerSummary(BaseModel):
    player_num: int
    name: str
    guesses_count: int
    time_taken_formatted: str
    time_taken_seconds: float
    status: str
    guessed_correctly: bool
    secret_number_masked: str
    secret_number_revealed: Optional[int] = None

class FinalResultResponse(BaseModel):
    game_id: str
    room_code: str
    winner_player_num: Optional[int] = None
    winner_name: Optional[str] = None
    reason: str
    is_draw: bool
    total_duration_formatted: str
    player1: FinalResultPlayerSummary
    player2: FinalResultPlayerSummary
