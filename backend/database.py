import asyncpg
from config import get_settings

CURRENT_SCHEMA_VERSION = 1

pool: asyncpg.Pool = None


async def create_pool():
    """Create the asyncpg connection pool."""
    global pool
    dsn = get_settings().database_url
    # Handle sslmode param (asyncpg needs it as a separate kwarg)
    ssl_mode = None
    if 'sslmode=' in dsn:
        if 'sslmode=require' in dsn:
            ssl_mode = 'require'
        # Strip sslmode from DSN
        base, _, query = dsn.partition('?')
        params = '&'.join(p for p in query.split('&') if not p.startswith('sslmode='))
        dsn = base + ('?' + params if params else '')
    pool = await asyncpg.create_pool(dsn=dsn, ssl=ssl_mode, min_size=1, max_size=10)


async def close_pool():
    """Close the connection pool."""
    global pool
    if pool:
        await pool.close()
        pool = None


async def init_db():
    """Create tables and manage schema versions."""
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER NOT NULL
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                google_id VARCHAR UNIQUE NOT NULL,
                email VARCHAR UNIQUE NOT NULL,
                display_name VARCHAR NOT NULL,
                avatar_url VARCHAR,
                protein_goal REAL DEFAULT 150,
                calorie_goal REAL DEFAULT 2000,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS common_foods (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                protein_g REAL NOT NULL,
                calories REAL NOT NULL,
                category VARCHAR NOT NULL,
                icon VARCHAR NOT NULL,
                sort_order INTEGER DEFAULT 0
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS food_entries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                food_name VARCHAR NOT NULL,
                protein_g REAL NOT NULL,
                calories REAL NOT NULL,
                fdc_id VARCHAR,
                meal_type VARCHAR DEFAULT 'snack',
                serving_qty REAL DEFAULT 1.0,
                logged_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_food_entries_user_date
                ON food_entries(user_id, logged_at)
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS groups (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                invite_code VARCHAR UNIQUE NOT NULL,
                created_by INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS group_members (
                id SERIAL PRIMARY KEY,
                group_id INTEGER NOT NULL REFERENCES groups(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                joined_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(group_id, user_id)
            )
        """)

        # Check and set schema version
        row = await conn.fetchrow("SELECT version FROM schema_version")
        if row is None:
            await conn.execute(
                "INSERT INTO schema_version (version) VALUES ($1)",
                CURRENT_SCHEMA_VERSION,
            )
        else:
            current = row['version']
            if current < CURRENT_SCHEMA_VERSION:
                await run_migrations(conn, current, CURRENT_SCHEMA_VERSION)
                await conn.execute(
                    "UPDATE schema_version SET version = $1",
                    CURRENT_SCHEMA_VERSION,
                )


async def run_migrations(conn, from_version: int, to_version: int):
    """Run numbered migrations sequentially. Add new migrations here."""
    migrations = {
        # Example: 2: migrate_v1_to_v2,
    }
    for v in range(from_version + 1, to_version + 1):
        if v in migrations:
            await migrations[v](conn)
