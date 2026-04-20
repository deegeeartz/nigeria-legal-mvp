from __future__ import annotations

import sys

from sqlalchemy import create_engine, text

from app.settings import DATABASE_URL, database_backend


def main() -> int:
    backend = database_backend(DATABASE_URL)
    if backend != "postgresql":
        print("DATABASE_URL is not configured for PostgreSQL.")
        print(f"Current DATABASE_URL: {DATABASE_URL}")
        return 1

    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1 AS ok"))
        value = result.scalar_one()

    print(f"PostgreSQL smoke check passed: {value}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
