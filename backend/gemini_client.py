import google.generativeai as genai
from config import get_settings
import PIL.Image
import io
import json


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
