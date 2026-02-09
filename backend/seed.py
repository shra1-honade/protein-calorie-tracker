import aiosqlite
from config import get_settings

COMMON_FOODS = [
    ("Chicken Breast (100g)", 31.0, 165, "meat", "\U0001f357", 1),
    ("Eggs (2 whole)", 12.0, 140, "egg", "\U0001f95a", 2),
    ("Greek Yogurt (200g)", 20.0, 130, "dairy", "\U0001f95b", 3),
    ("Whey Protein Scoop", 25.0, 120, "supplement", "\U0001f4aa", 4),
    ("Paneer (100g)", 18.0, 265, "dairy", "\U0001f9c0", 5),
    ("Dal / Lentils (1 cup)", 18.0, 230, "legume", "\U0001f372", 6),
    ("Tofu (100g)", 8.0, 76, "legume", "\U0001f96c", 7),
    ("Salmon (100g)", 25.0, 208, "meat", "\U0001f41f", 8),
    ("Milk (1 glass, 250ml)", 8.0, 150, "dairy", "\U0001f95b", 9),
    ("Rice (1 cup cooked)", 4.0, 206, "grain", "\U0001f35a", 10),
    ("Oats (1 cup cooked)", 5.0, 150, "grain", "\U0001f35e", 11),
    ("Peanut Butter (2 tbsp)", 7.0, 190, "legume", "\U0001f95c", 12),
    ("Chickpeas (1 cup)", 15.0, 269, "legume", "\U0001fad8", 13),
    ("Almonds (30g)", 6.0, 170, "legume", "\U0001f330", 14),
    ("Banana (1 medium)", 1.0, 105, "fruit", "\U0001f34c", 15),
]


async def seed_common_foods():
    db = await aiosqlite.connect(get_settings().database_url)
    try:
        cursor = await db.execute("SELECT COUNT(*) FROM common_foods")
        count = (await cursor.fetchone())[0]
        if count == 0:
            await db.executemany(
                """INSERT INTO common_foods
                   (name, protein_g, calories, category, icon, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                COMMON_FOODS,
            )
            await db.commit()
            print(f"Seeded {len(COMMON_FOODS)} common foods")
        else:
            print(f"Common foods already seeded ({count} entries)")
    finally:
        await db.close()
