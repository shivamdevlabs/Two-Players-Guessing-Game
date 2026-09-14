import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from app.core.security import verify_player_token
from app.websocket.connection_manager import ws_manager
from app.services.game_service import game_service
from app.core.config import settings

logger = logging.getLogger("guessing_game.ws")

router = APIRouter(tags=["WebSockets"])

@router.websocket("/ws/games/{game_id}")
async def game_websocket_endpoint(
    websocket: WebSocket,
    game_id: str,
    token: str = Query(...),
    player_id: str = Query(...)
):
    # Verify player authorization
    if not verify_player_token(token, game_id, player_id):
        logger.warning(f"WS auth failed for game {game_id}, player {player_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        # Verify game exists
        game_doc = await game_service.get_game(game_id)
    except Exception as e:
        logger.warning(f"WS game not found: {e}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(game_id, player_id, websocket)
    logger.info(f"WebSocket client connected: game={game_id}, player={player_id}")

    try:
        # Mark player as connected in DB
        await game_service.update_player_connection(game_id, player_id, connected=True)
        game_doc = await game_service.get_game(game_id)
        
        # Broadcast refreshed state to both players (shows connection status)
        await ws_manager.broadcast_game_state(game_doc, game_service)

        # Main message loop
        while True:
            raw_text = await websocket.receive_text()
            try:
                data = json.loads(raw_text)
                msg_type = data.get("type")

                if msg_type == "PING":
                    await websocket.send_json({"type": "PONG"})
                elif msg_type == "REFRESH_STATE":
                    doc = await game_service.get_game(game_id)
                    state = game_service.build_player_public_state(doc, player_id)
                    await websocket.send_json({
                        "type": "GAME_STATE_UPDATE",
                        "state": state.model_dump()
                    })
            except json.JSONDecodeError:
                pass

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: game={game_id}, player={player_id}")
    except Exception as exc:
        logger.error(f"WebSocket error on {game_id}/{player_id}: {exc}")
    finally:
        ws_manager.disconnect(game_id, player_id)
        try:
            await game_service.update_player_connection(game_id, player_id, connected=False)
            # Only schedule disconnect grace if the match is actively in progress
            game_doc = await game_service.get_game(game_id)
            if game_doc.get("status") not in ("GAME_OVER", "CANCELLED"):
                ws_manager.schedule_disconnect_grace(
                    game_id,
                    player_id,
                    settings.RECONNECT_GRACE_PERIOD_SECONDS,
                    game_service
                )
        except Exception as e:
            logger.error(f"Error handling disconnect cleanup: {e}")
