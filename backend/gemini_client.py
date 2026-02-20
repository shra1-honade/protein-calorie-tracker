import google.generativeai as genai
from config import get_settings
import PIL.Image
import io
import json
from collections import defaultdict


def configure_gemini():
    settings = get_settings()
    if settings.gemini_api_key:
        genai.configure(api_key=settings.gemini_api_key)


async def detect_food_from_image(image_bytes: bytes) -> dict:
    """
    Analyzes food image using Gemini Vision and returns nutrition estimate.

    Returns dict with:
    - foods: list of detected foods with:
        - name: str
        - protein_g: float
        - calories: float
        - confidence: float (0-1)
    - total_protein: float
    - total_calories: float
    """
    configure_gemini()
    # Use gemini-2.5-flash which may have separate quota
    model = genai.GenerativeModel('models/gemini-2.5-flash')

    prompt = """Analyze this food image and provide nutrition estimates.

    Return a JSON object with this exact structure:
    {
      "foods": [
        {"name": "Food Name", "protein_g": 25.0, "calories": 300, "carbs_g": 30.0, "confidence": 0.85}
      ],
      "total_protein": 25.0,
      "total_calories": 300,
      "total_carbs": 30.0
    }

    Rules:
    - Identify all visible foods
    - Estimate serving sizes from visual cues
    - Provide realistic protein (g), carbohydrate (g), and calorie estimates
    - confidence: 0-1 (how certain you are)
    - If unsure, provide best guess with lower confidence
    - Return ONLY the JSON, no other text
    """

    img = PIL.Image.open(io.BytesIO(image_bytes))
    response = model.generate_content([prompt, img])

    # Parse JSON from response - handle markdown code blocks
    response_text = response.text.strip()

    # Remove markdown code blocks if present
    if response_text.startswith('```'):
        # Extract JSON from markdown code block
        lines = response_text.split('\n')
        # Remove first line (```json or ```)
        lines = lines[1:]
        # Remove last line (```)
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        response_text = '\n'.join(lines).strip()

    # Try to find JSON object in the text
    start = response_text.find('{')
    end = response_text.rfind('}') + 1
    if start != -1 and end > start:
        response_text = response_text[start:end]

    result = json.loads(response_text)
    # Ensure carbs fields exist with safe defaults if model omits them
    result.setdefault('total_carbs', 0.0)
    for food in result.get('foods', []):
        food.setdefault('carbs_g', 0.0)
    return result


async def generate_meal_plan(user: dict, today_entries: list, history_entries: list = []) -> dict:
    """
    Generates a personalized meal plan using Gemini based on user profile and
    what they've already eaten today.
    """
    configure_gemini()
    model = genai.GenerativeModel('models/gemini-2.5-flash')

    # Determine which meal slots have already been logged today
    logged_meal_types = {e['meal_type'] for e in today_entries}
    all_meal_types = ['breakfast', 'lunch', 'dinner', 'snack']
    remaining_meals = [m for m in all_meal_types if m not in logged_meal_types]

    # Compute totals consumed
    total_protein = sum(e.get('protein_g', 0) for e in today_entries)
    total_calories = sum(e.get('calories', 0) for e in today_entries)
    total_carbs = sum(e.get('carbs_g', 0) for e in today_entries)

    protein_goal = user.get('protein_goal', 150)
    calorie_goal = user.get('calorie_goal', 2000)
    carb_goal = user.get('carb_goal', 200)

    remaining_protein = max(0, protein_goal - total_protein)
    remaining_cal = max(0, calorie_goal - total_calories)
    remaining_carbs = max(0, carb_goal - total_carbs)

    dietary_preference = user.get('dietary_preference', 'non_vegetarian')
    food_dislikes = user.get('food_dislikes') or 'None'

    # Build 7-day history summary
    day_totals = defaultdict(lambda: {'protein': 0, 'calories': 0, 'carbs': 0})
    food_freq = defaultdict(int)
    for e in history_entries:
        day = str(e['log_date'])
        day_totals[day]['protein'] += e.get('protein_g', 0)
        day_totals[day]['calories'] += e.get('calories', 0)
        day_totals[day]['carbs'] += e.get('carbs_g', 0)
        food_freq[e['food_name']] += 1

    history_lines = [
        f"  {day}: {v['protein']:.0f}g P | {v['calories']:.0f} cal | {v['carbs']:.0f}g C"
        for day, v in sorted(day_totals.items())
    ]
    top_foods = sorted(food_freq.items(), key=lambda x: -x[1])[:5]
    top_foods_str = ', '.join(f"{name} (x{cnt})" for name, cnt in top_foods) or 'None'
    history_section = '\n'.join(history_lines) if history_lines else '  No history yet'

    # Build list of logged entries for context
    if today_entries:
        entries_text = '\n'.join(
            f"  - {e['food_name']} ({e.get('meal_type', 'snack')}): "
            f"{e.get('protein_g', 0):.1f}g protein | {e.get('calories', 0):.0f} cal | {e.get('carbs_g', 0):.1f}g carbs"
            for e in today_entries
        )
    else:
        entries_text = '  (Nothing logged yet today)'

    remaining_meals_str = ', '.join(remaining_meals) if remaining_meals else 'none (all meals logged)'

    prompt = f"""You are an expert sports nutritionist and dietitian. Generate a precise, personalized meal plan.

USER PROFILE:
- Dietary type: {dietary_preference} (vegetarian/vegan/non_vegetarian)
- Food dislikes/allergies: {food_dislikes}
- Daily targets: {protein_goal}g protein | {calorie_goal} calories | {carb_goal}g carbs

RECENT EATING HISTORY (last 7 days):
{history_section}
Most frequent foods: {top_foods_str}
Use this to:
- Detect and fix macro shortfalls (e.g., consistently low protein days)
- Avoid repeating the same meals too frequently
- Account for typical eating patterns when suggesting portions

ALREADY CONSUMED TODAY:
{entries_text}
- Total consumed: {total_protein:.1f}g protein | {total_calories:.0f} cal | {total_carbs:.1f}g carbs
- Remaining budget: {remaining_protein:.1f}g protein | {remaining_cal:.0f} cal | {remaining_carbs:.1f}g carbs

INSTRUCTIONS:
- Suggest meals ONLY for remaining/upcoming meal slots: {remaining_meals_str}
- If no meals remain, provide a summary and tip for the day
- Each meal must fit within the remaining macro budget
- Use realistic, commonly available foods in India
- Respect dietary preference strictly — no meat/fish for vegetarian, no animal products for vegan
- Avoid ALL foods listed in dislikes
- Provide exact gram quantities (e.g., "150g chicken breast")
- Include macros for every food item

Return ONLY a JSON object with this exact structure:
{{
  "meal_plan": [
    {{
      "meal_type": "breakfast|lunch|dinner|snack",
      "already_eaten": false,
      "items": [
        {{"food": "...", "quantity": "...", "protein_g": 0, "calories": 0, "carbs_g": 0}}
      ],
      "meal_protein": 0,
      "meal_calories": 0,
      "meal_carbs": 0,
      "meal_tip": "..."
    }}
  ],
  "day_summary": {{"total_protein": 0, "total_calories": 0, "total_carbs": 0}},
  "nutritionist_note": "..."
}}"""

    response = model.generate_content(prompt)
    response_text = response.text.strip()

    # Remove markdown code blocks if present
    if response_text.startswith('```'):
        lines = response_text.split('\n')
        lines = lines[1:]
        if lines and lines[-1].strip() == '```':
            lines = lines[:-1]
        response_text = '\n'.join(lines).strip()

    # Find JSON object
    start = response_text.find('{')
    end = response_text.rfind('}') + 1
    if start != -1 and end > start:
        response_text = response_text[start:end]

    return json.loads(response_text)
