import os
from google import genai
from PIL import Image

CLIENT = None


def get_client():
    global CLIENT
    if not CLIENT:
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY environment variable is not set")
        CLIENT = genai.Client(api_key=api_key)
    return CLIENT


STYLES = {
    "corporate": "Using the reference images provided, create a new professional corporate portrait of the same person. The person should be wearing business attire with a professional background, shallow depth of field with f1.8 aperture, 55mm lens. High quality, professional photography, 4k.",
    "bw_headshot": "Using the reference images provided, create a moody, dramatic black and white fashion photography headshot of the same person. Studio lighting, artistic composition, detailed texture and facial features.",
    "casual": "Using the reference images provided, create a casual profile photo of the same person. Cozy cafe background, natural smiling expression, warm natural bokeh lighting. Shallow depth of field with f1.8 aperture, 55mm lens.",
}


def generate_image_from_model(image_paths: list[str], style: str) -> Image.Image:
    client = get_client()

    if style not in STYLES:
        raise ValueError(f"Unknown style: {style}. Available: {list(STYLES.keys())}")

    prompt = STYLES[style]

    contents = [prompt]
    loaded_images = 0
    for path in image_paths:
        try:
            # We assume paths are relative to the project root or absolute
            img = Image.open(path)
            contents.append(img)
            loaded_images += 1
        except Exception as e:
            print(f"Error loading image {path}: {e}")

    if loaded_images == 0:
        raise ValueError("No valid images provided for the model.")

    print(
        f"Generating image with style '{style}' using {loaded_images} reference images..."
    )
    response = client.models.generate_content(
        model="gemini-2.5-flash-image",
        contents=contents,
    )

    if not response.parts:
        raise RuntimeError("Gemini API returned no content.")

    for part in response.parts:
        if part.inline_data:
            return part.as_image()

    raise RuntimeError("No image generated in response.")
