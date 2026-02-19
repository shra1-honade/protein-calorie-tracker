import database

# Format: (name, protein_g, calories, carbs_g, category, icon, sort_order)
COMMON_FOODS = [
    ("Chicken Breast (100g)", 31.0, 165,  0.0, "meat",       "\U0001f357", 1),
    ("Eggs (2 whole)",        12.0, 140,  1.0, "egg",        "\U0001f95a", 2),
    ("Greek Yogurt (200g)",   20.0, 130,  9.0, "dairy",      "\U0001f95b", 3),
    ("Whey Protein Scoop",    25.0, 120,  3.0, "supplement", "\U0001f4aa", 4),
    ("Paneer (100g)",         18.0, 265,  1.5, "dairy",      "\U0001f9c0", 5),
    ("Dal / Lentils (1 cup)", 18.0, 230, 40.0, "legume",     "\U0001f372", 6),
    ("Tofu (100g)",            8.0,  76,  1.9, "legume",     "\U0001f96c", 7),
    ("Salmon (100g)",         25.0, 208,  0.0, "meat",       "\U0001f41f", 8),
    ("Milk (1 glass, 250ml)",  8.0, 150, 12.0, "dairy",      "\U0001f95b", 9),
    ("Rice (1 cup cooked)",    4.0, 206, 45.0, "grain",      "\U0001f35a", 10),
    ("Oats (1 cup cooked)",    5.0, 150, 27.0, "grain",      "\U0001f35e", 11),
    ("Peanut Butter (2 tbsp)", 7.0, 190,  6.0, "legume",     "\U0001f95c", 12),
    ("Chickpeas (1 cup)",     15.0, 269, 45.0, "legume",     "\U0001fad8", 13),
    ("Almonds (30g)",          6.0, 170,  6.0, "legume",     "\U0001f330", 14),
    ("Banana (1 medium)",      1.0, 105, 27.0, "fruit",      "\U0001f34c", 15),
]


async def seed_common_foods():
    async with database.pool.acquire() as conn:
        count = await conn.fetchval("SELECT COUNT(*) FROM common_foods")
        if count == 0:
            await conn.executemany(
                """INSERT INTO common_foods
                   (name, protein_g, calories, carbs_g, category, icon, sort_order)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                COMMON_FOODS,
            )
            print(f"Seeded {len(COMMON_FOODS)} common foods")
        else:
            # Backfill carbs_g if migration just added the column (all zeros)
            zero_count = await conn.fetchval(
                "SELECT COUNT(*) FROM common_foods WHERE carbs_g = 0"
            )
            if zero_count == count:
                carbs_updates = [(row[3], row[0]) for row in COMMON_FOODS]
                await conn.executemany(
                    "UPDATE common_foods SET carbs_g = $1 WHERE name = $2",
                    carbs_updates,
                )
                print(f"Backfilled carbs_g for {len(carbs_updates)} common foods")
            else:
                print(f"Common foods already seeded ({count} entries)")
