import logging
import asyncio
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger("guessing_game.db")

class DatabaseManager:
    client: Optional[object] = None
    db: Optional[object] = None
    is_mock: bool = False

    async def connect(self):
        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")
            # Try real MongoDB with a fast 1.5s server selection timeout
            real_client = AsyncIOMotorClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=1500
            )
            # Ping to verify reachability
            await real_client.admin.command('ping')
            self.client = real_client
            self.db = self.client[settings.DATABASE_NAME]
            self.is_mock = False
            logger.info(f"Connected successfully to real MongoDB: {settings.DATABASE_NAME}")
        except Exception as exc:
            logger.warning(
                f"Real MongoDB not reachable ({exc}). Falling back to in-memory mongomock_motor database for seamless development."
            )
            try:
                from mongomock_motor import AsyncMongoMockClient
                self.client = AsyncMongoMockClient()
                self.db = self.client[settings.DATABASE_NAME]
                self.is_mock = True
                logger.info("Initialized in-memory MongoDB mock client successfully.")
            except Exception as mock_exc:
                logger.error(f"Failed to initialize mock database: {mock_exc}")
                raise

        # Ensure indexes
        await self._create_indexes()

    async def _create_indexes(self):
        try:
            games_col = self.db["games"]
            await games_col.create_index("game_id", unique=True)
            await games_col.create_index("room_code")
            await games_col.create_index("created_at")
            logger.info("MongoDB indexes verified.")
        except Exception as e:
            logger.warning(f"Note on creating indexes: {e}")

    async def close(self):
        if self.client and not self.is_mock:
            self.client.close()
            logger.info("MongoDB client closed.")

db_manager = DatabaseManager()

def get_database():
    return db_manager.db
