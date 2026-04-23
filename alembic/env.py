from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.settings import DATABASE_URL

from sqlalchemy import create_engine
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

config = context.config

def _cleanup_url(url: str) -> str:
    # psycopg (v3) doesn't like pgbouncer=true in the URL
    parsed = urlparse(url)
    params = dict(parse_qsl(parsed.query))
    params.pop("pgbouncer", None)
    new_query = urlencode(params)
    return urlunparse(parsed._replace(query=new_query))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # SQL Alchemy 2.x defaults to psycopg2 for postgresql://, but we use psycopg (v3)
    url = _cleanup_url(DATABASE_URL)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)

    # Use create_engine directly to avoid ConfigParser interpolation bugs with %
    connectable = create_engine(
        url,
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
