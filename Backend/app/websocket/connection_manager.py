import asyncio
import logging
import time
from typing import Dict, Tuple, Optional, Any
from fastapi import WebSocket

logger = logging.getLogger("guessing_game.ws")

class ConnectionManager:
    def __init__(self):
        # (game_id, player_id) -> WebSocket
        self.active_connections: Dict[Tuple[str, str], WebSocket] = {}
        # game_id -> asyncio.Task for timer tick & timeout check
        self.timer_tasks: Dict[str, asyncio.Task] = {}
        # (game_id, player_id) -> disconnect grace task
        self.disconnect_tasks: Dict[Tuple[str, str], asyncio.Task] = {}

    async def connect(self, game_id: str, player_id: str, websocket: WebSocket):
        await websocket.accept()
        key = (game_id, player_id)
        self.active_connections[key] = websocket
        
        # If there was a disconnect grace timer running for this player, cancel it
        if key in self.disconnect_tasks:
            self.disconnect_tasks[key].cancel()
            del self.disconnect_tasks[key]
            logger.info(f"Player {player_id} in game {game_id} reconnected. Cancelled disconnect grace task.")

    def disconnect(self, game_id: str, player_id: str):
        key = (game_id, player_id)
        if key in self.active_connections:
            del self.active_connections[key]
            logger.info(f"Socket removed for player {player_id} in game {game_id}")

    def is_player_connected(self, game_id: str, player_id: str) -> bool:
        return (game_id, player_id) in self.active_connections

    async def send_to_player(self, game_id: str, player_id: str, message: dict):
        key = (game_id, player_id)
        ws = self.active_connections.get(key)
        if ws:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"Error sending ws message to {key}: {e}")

    async def broadcast_game_state(self, game_doc: dict, game_service):
        """
        Broadcast sanitized game state individually to each connected player in the room.
        Player 1 will see their view, Player 2 will see theirs.
        """
        game_id = game_doc["game_id"]
        players = game_doc.get("players", [])
        
        for player in players:
            pid = player["player_id"]
            state = game_service.build_player_public_state(game_doc, pid)
            await self.send_to_player(game_id, pid, {
                "type": "GAME_STATE_UPDATE",
                "state": state.model_dump()
            })

    async def broadcast_timer_tick(self, game_id: str, remaining_seconds: int, round_num: int):
        """Broadcast seconds countdown tick to both players in the room."""
        for (g_id, p_id), ws in list(self.active_connections.items()):
            if g_id == game_id:
                try:
                    await ws.send_json({
                        "type": "TIMER_TICK",
                        "round_num": round_num,
                        "remaining_seconds": max(0, remaining_seconds)
                    })
                except Exception:
                    pass

    def start_round_timer(self, game_id: str, round_num: int, expires_at: float, game_service):
        """Start or restart the background timer task for an active round."""
        self.stop_round_timer(game_id)

        async def _timer_worker():
            try:
                while True:
                    now = time.time()
                    remaining = int(round_expires_at - now)
                    if remaining <= 0:
                        # Timeout triggered!
                        logger.info(f"Timer expired for game {game_id} round {round_num}!")
                        await self.broadcast_timer_tick(game_id, 0, round_num)
                        # Process timeout in game service
                        updated_game = await game_service.handle_round_timeout(game_id, round_num)
                        if updated_game:
                            await self.broadcast_game_state(updated_game, game_service)
                        break

                    await self.broadcast_timer_tick(game_id, remaining, round_num)
                    await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                logger.debug(f"Timer cancelled for game {game_id}")
            except Exception as e:
                logger.error(f"Error in round timer worker for game {game_id}: {e}")

        round_expires_at = expires_at
        task = asyncio.create_task(_timer_worker())
        self.timer_tasks[game_id] = task

    def stop_round_timer(self, game_id: str):
        if game_id in self.timer_tasks:
            self.timer_tasks[game_id].cancel()
            del self.timer_tasks[game_id]

    def schedule_disconnect_grace(self, game_id: str, player_id: str, grace_seconds: int, game_service):
        """Schedule a grace period when a player disconnects, notifying the opponent."""
        key = (game_id, player_id)
        if key in self.disconnect_tasks:
            self.disconnect_tasks[key].cancel()

        async def _grace_worker():
            try:
                # Notify opponent of disconnection with grace countdown
                for (g_id, p_id), ws in list(self.active_connections.items()):
                    if g_id == game_id and p_id != player_id:
                        try:
                            await ws.send_json({
                                "type": "OPPONENT_DISCONNECTED",
                                "grace_seconds": grace_seconds,
                                "message": f"Opponent lost connection. Waiting {grace_seconds}s for reconnection..."
                            })
                        except Exception:
                            pass

                await asyncio.sleep(grace_seconds)
                logger.info(f"Grace period expired for player {player_id} in game {game_id}.")
                # Could trigger forfeit or pause here if needed
            except asyncio.CancelledError:
                # Reconnected before grace ended
                for (g_id, p_id), ws in list(self.active_connections.items()):
                    if g_id == game_id and p_id != player_id:
                        try:
                            await ws.send_json({
                                "type": "OPPONENT_RECONNECTED",
                                "message": "Opponent has reconnected!"
                            })
                        except Exception:
                            pass

        task = asyncio.create_task(_grace_worker())
        self.disconnect_tasks[key] = task

    def cancel_disconnect_grace_for_game(self, game_id: str):
        """Cancel all pending disconnect grace tasks for a game (e.g. on GAME_OVER)."""
        for (g_id, p_id), task in list(self.disconnect_tasks.items()):
            if g_id == game_id:
                task.cancel()
                del self.disconnect_tasks[(g_id, p_id)]

ws_manager = ConnectionManager()
