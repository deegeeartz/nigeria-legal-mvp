import asyncio
import sys
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db import reset_db_for_tests

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@pytest.fixture(scope="session")
def event_loop_policy():
    if sys.platform == "win32":
        return asyncio.get_event_loop_policy()
    return asyncio.DefaultEventLoopPolicy()

@pytest_asyncio.fixture(autouse=True)
async def reset_db():
    await reset_db_for_tests()

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
