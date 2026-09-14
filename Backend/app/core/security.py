import secrets
import hmac
import hashlib
from app.core.config import settings

def generate_player_token(game_id: str, player_id: str) -> str:
    """Generate a tamper-evident player session token."""
    raw_nonce = secrets.token_hex(16)
    payload = f"{game_id}:{player_id}:{raw_nonce}"
    signature = hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    return f"{payload}:{signature}"

def verify_player_token(token: str, game_id: str, player_id: str) -> bool:
    """Verify that a player token corresponds to the given game and player."""
    try:
        parts = token.split(":")
        if len(parts) != 4:
            return False
        token_game_id, token_player_id, nonce, signature = parts
        if token_game_id != game_id or token_player_id != player_id:
            return False
        expected_payload = f"{game_id}:{player_id}:{nonce}"
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            expected_payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(signature, expected_sig)
    except Exception:
        return False
