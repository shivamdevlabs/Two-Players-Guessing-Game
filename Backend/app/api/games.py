import logging
from typing import Optional
from fastapi import APIRouter, Header, Query, HTTPException, status, Depends
from app.models.game import (
    CreateGameRequest,
    JoinGameRequest,
    ReadyRequest,
    SecretNumberRequest,
    GuessRequest,
    AuthPlayerResponse,
    GamePublicState,
    GuessResponse,
    FinalResultResponse
)
from app.services.game_service import game_service
from app.websocket.connection_manager import ws_manager
from app.core.security import verify_player_token

logger = logging.getLogger("guessing_game.api")

router = APIRouter(prefix="/games", tags=["Games"])

def extract_and_verify_player(
    game_id: str,
    x_player_id: Optional[str] = Header(None, alias="X-Player-Id"),
    x_player_token: Optional[str] = Header(None, alias="X-Player-Token"),
    token_query: Optional[str] = Query(None, alias="token"),
    player_id_query: Optional[str] = Query(None, alias="player_id")
) -> str:
    pid = x_player_id or player_id_query
    tok = x_player_token or token_query
    if not pid or not tok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing player authentication headers (X-Player-Id, X-Player-Token)."
        )
    if not verify_player_token(tok, game_id, pid):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired player authentication token."
        )
    return pid

@router.post("", response_model=AuthPlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_game(req: CreateGameRequest):
    """Create a new game room and register Player 1."""
    game_doc, auth = await game_service.create_game(req)
    return auth

@router.post("/join", response_model=AuthPlayerResponse)
async def join_game(req: JoinGameRequest):
    """Join an existing game room as Player 2."""
    game_doc, auth = await game_service.join_game(req)
    # Broadcast to lobby that player 2 has joined
    await ws_manager.broadcast_game_state(game_doc, game_service)
    return auth

@router.get("/{game_id}", response_model=GamePublicState)
async def get_game_state(
    game_id: str,
    player_id: str = Depends(extract_and_verify_player)
):
    """Get the sanitized public game state tailored for the authenticated player."""
    game_doc = await game_service.get_game(game_id)
    return game_service.build_player_public_state(game_doc, player_id)

@router.post("/{game_id}/ready", response_model=GamePublicState)
async def toggle_ready(
    game_id: str,
    req: ReadyRequest,
    player_id: str = Depends(extract_and_verify_player)
):
    """Toggle ready status in the lobby. Starts secret selection when both are ready."""
    game_doc = await game_service.set_player_ready(game_id, player_id, req.is_ready)
    await ws_manager.broadcast_game_state(game_doc, game_service)
    return game_service.build_player_public_state(game_doc, player_id)

@router.post("/{game_id}/secret", response_model=GamePublicState)
async def submit_secret(
    game_id: str,
    req: SecretNumberRequest,
    player_id: str = Depends(extract_and_verify_player)
):
    """Submit player's confidential secret number. Starts Round 1 when both submitted."""
    game_doc = await game_service.submit_secret_number(game_id, player_id, req.secret_number)
    
    # If round 1 started, start timer task
    if game_doc["status"] == "ROUND_1":
        expires_at = game_doc["round_info"]["round_expires_at_timestamp"]
        ws_manager.start_round_timer(game_id, 1, expires_at, game_service)

    await ws_manager.broadcast_game_state(game_doc, game_service)
    return game_service.build_player_public_state(game_doc, player_id)

@router.post("/{game_id}/guess", response_model=GuessResponse)
async def submit_guess(
    game_id: str,
    req: GuessRequest,
    player_id: str = Depends(extract_and_verify_player)
):
    """Submit a guess during player's turn."""
    game_doc, guess_resp = await game_service.submit_guess(game_id, player_id, req.guess)
    
    # If Round transitioned to Round 2 or Game Over, handle timers accordingly
    if game_doc["status"] == "ROUND_2" and game_doc["round_info"]["current_round"] == 2:
        expires_at = game_doc["round_info"]["round_expires_at_timestamp"]
        ws_manager.start_round_timer(game_id, 2, expires_at, game_service)
    elif game_doc["status"] == "GAME_OVER":
        ws_manager.stop_round_timer(game_id)
        ws_manager.cancel_disconnect_grace_for_game(game_id)

    # Broadcast updated state to both players
    await ws_manager.broadcast_game_state(game_doc, game_service)

    # Attach current player's view to response
    guess_resp.game_state = game_service.build_player_public_state(game_doc, player_id)
    return guess_resp

@router.get("/{game_id}/result", response_model=FinalResultResponse)
async def get_results(
    game_id: str,
    reveal_secrets: bool = Query(default=False)
):
    """Get final completed game results, statistics, and winner details."""
    return await game_service.get_final_result(game_id, reveal_secrets=reveal_secrets)
