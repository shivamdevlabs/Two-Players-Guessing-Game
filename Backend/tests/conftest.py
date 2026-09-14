import pytest
from mongomock_motor import AsyncMongoMockClient
from app.core.config import settings
from app.database import mongo
from app.main import app
from httpx import AsyncClient, ASGITransport

@pytest.fixture(autouse=True)
async def setup_test_db():
    # Force mock database for isolated unit and integration testing
    mongo.db_manager.client = AsyncMongoMockClient()
    mongo.db_manager.db = mongo.db_manager.client[settings.DATABASE_NAME]
    mongo.db_manager.is_mock = True
    await mongo.db_manager._create_indexes()
    yield
    if mongo.db_manager.client:
        mongo.db_manager.client.close()

@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
