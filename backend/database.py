import aiosqlite
from config import get_settings

CURRENT_SCHEMA_VERSION = 1


async def get_db_connection():
    db = await aiosqlite.connect(get_settings().database_url)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db


async def init_db():
    db = await get_db_connection()
    try:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                google_id TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                display_name TEXT NOT NULL,
                avatar_url TEXT,
                protein_goal REAL DEFAULT 150,
                calorie_goal REAL DEFAULT 2000,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS common_foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                protein_g REAL NOT NULL,
                calories REAL NOT NULL,
                category TEXT NOT NULL,
                icon TEXT NOT NULL,
                sort_order INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS food_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id),
                food_name TEXT NOT NULL,
                protein_g REAL NOT NULL,
                calories REAL NOT NULL,
                fdc_id TEXT,
                meal_type TEXT DEFAULT 'snack',
                serving_qty REAL DEFAULT 1.0,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_food_entries_user_date
                ON food_entries(user_id, logged_at);

            CREATE TABLE IF NOT EXISTS groups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                invite_code TEXT UNIQUE NOT NULL,
                created_by INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS group_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                group_id INTEGER NOT NULL REFERENCES groups(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(group_id, user_id)
            );
        """)

        # Check and set schema version
        cursor = await db.execute("SELECT version FROM schema_version")
        row = await cursor.fetchone()
        if row is None:
            await db.execute(
                "INSERT INTO schema_version (version) VALUES (?)",
                (CURRENT_SCHEMA_VERSION,),
            )
        else:
            current = row[0]
            if current < CURRENT_SCHEMA_VERSION:
                await run_migrations(db, current, CURRENT_SCHEMA_VERSION)
                await db.execute(
                    "UPDATE schema_version SET version = ?",
                    (CURRENT_SCHEMA_VERSION,),
                )

        await db.commit()
    finally:
        await db.close()


async def run_migrations(db, from_version: int, to_version: int):
    """Run numbered migrations sequentially. Add new migrations here."""
    migrations = {
        # Example: 2: migrate_v1_to_v2,
    }
    for v in range(from_version + 1, to_version + 1):
        if v in migrations:
            await migrations[v](db)
