"""
Level 0: Avatar Generator

This module generates your unique space explorer avatar using
multi-turn image generation with Gemini (Nano Banana) for
character consistency across portrait and icon.

=== CODELAB INSTRUCTIONS ===

You will implement three steps in the generate_explorer_avatar() function:

1. MODULE_5_STEP_1_CREATE_CHAT_SESSION
   Create a chat session to maintain character consistency

2. MODULE_5_STEP_2_GENERATE_PORTRAIT
   Generate the explorer portrait with your customizations

3. MODULE_5_STEP_3_GENERATE_ICON
   Generate a consistent map icon using the same chat session

Follow the instructions in the codelab to complete each step.
"""

from google import genai
from google.genai import types
from PIL import Image
import json
import os
import io

# Load configuration from setup (config.json is in project root)
CONFIG_PATH = "../config.json"

with open(CONFIG_PATH) as f:
    config = json.load(f)

USERNAME = config["username"]
SUIT_COLOR = config["suit_color"]
APPEARANCE = config["appearance"]

# Initialize the Gemini client for Vertex AI
client = genai.Client(
    vertexai=True,
    project=os.environ.get("GOOGLE_CLOUD_PROJECT", config.get("project_id")),
    location="us-central1"
)

def get_portrait_prompt() -> str:
    return f"""Create a stylized space explorer portrait.

Character appearance: {APPEARANCE}
Name on suit patch: "{USERNAME}"
Suit color: {SUIT_COLOR}

CRITICAL STYLE REQUIREMENTS:
- Digital illustration style, clean lines, vibrant saturated colors
- Futuristic but weathered space suit with visible mission patches
- Background: Pure solid white (#FFFFFF) - absolutely no gradients, patterns, or elements
- Frame: Head and shoulders only, 3/4 view facing slightly left
- Lighting: Soft diffused studio lighting, no harsh shadows
- Expression: Determined but approachable
- Art style: Modern animated movie character portrait (similar to Pixar or Dreamworks style)

The white background is essential - the avatar will be composited onto a map."""

def get_photo_portrait_prompt() -> str:
    return f"""Transform this person into a stylized space explorer portrait.

PRESERVE from the original photo:
- The person's facial features, face shape, and likeness
- Their general expression and personality
- Any distinctive features (glasses, facial hair, etc.)

TRANSFORM with this style:
- Digital illustration style, clean lines, vibrant saturated colors
- Add a futuristic space suit with the name "{USERNAME}" on a shoulder patch
- Suit color: {SUIT_COLOR}
- Background: Pure solid white (#FFFFFF) - no gradients or elements
- Frame: Head and shoulders, 3/4 view
- Lighting: Soft diffused studio lighting
- Art style: Modern animated movie character (Pixar/Dreamworks aesthetic)

The result should be clearly recognizable as THIS specific person, but illustrated as a heroic space explorer."""


def get_icon_prompt() -> str:
    return """Now create a circular map icon of this SAME character.

CRITICAL REQUIREMENTS:
- SAME person, SAME face, SAME expression, SAME suit — maintain perfect consistency with the portrait
- Tighter crop: just the head and very top of shoulders
- Background: Pure solid white (#FFFFFF)
- Optimized for small display sizes (will be used as a 64px map marker)
- Keep the exact same art style, colors, and lighting as the portrait
- Square 1:1 aspect ratio

This icon must be immediately recognizable as the same character from the portrait."""

def generate_explorer_avatar() -> dict:
    """
    Generate portrait and icon using multi-turn chat for consistency.

    The key technique here is using a CHAT SESSION rather than independent
    API calls. This allows Gemini to "remember" the character it created
    in the first turn, ensuring the icon matches the portrait.

    Returns:
        dict with portrait_path and icon_path
    """

    # =========================================================================
    # MODULE_5_STEP_1_CREATE_CHAT_SESSION
    # =========================================================================
    # Create a chat session using client.chats.create() with:
    # - model: "gemini-2.5-flash-image" (Nano Banana)
    # - config: GenerateContentConfig with response_modalities=["TEXT", "IMAGE"]
    #
    # Hint: You need to use types.GenerateContentConfig
    # =========================================================================
    chat = client.chats.create(
        model="gemini-2.5-flash-image",  # Nano Banana - Gemini with image generation
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"]
        )
    )

    # =========================================================================
    # MODULE_5_STEP_2_GENERATE_PORTRAIT
    # =========================================================================
    # 1. Create a portrait_prompt string that includes:
    #    - APPEARANCE, USERNAME, and SUIT_COLOR variables
    #    - Style requirements (digital illustration, white background, etc.)
    #
    # 2. Send the prompt using chat.send_message(portrait_prompt)
    #
    # 3. Extract the image from the response:
    #    - Loop through portrait_response.candidates[0].content.parts
    #    - Find the part where part.inline_data is not None
    #    - Convert to PIL Image: Image.open(io.BytesIO(part.inline_data.data))
    #    - Save to "outputs/portrait.png"
    #
    # 4. Print progress messages for user feedback
    # =========================================================================
    
    # Load your photo
    portrait_response = None
    photo_path = "/home/aliceliu123321/my_photo.jpg"
    if os.path.isfile(photo_path):
        user_photo = Image.open(photo_path)
    
        # Convert photo to bytes for the API
        photo_buffer = io.BytesIO()
        user_photo.save(photo_buffer, format="JPEG")
        photo_bytes = photo_buffer.getvalue()

        print("🎨 Transforming your photo into an explorer portrait...")
        
        # Send both the prompt AND the image
        portrait_response = chat.send_message([
            get_photo_portrait_prompt(),
            types.Part.from_bytes(data=photo_bytes, mime_type="image/jpeg")
        ])
    else:
        print("🎨 Generating your portrait...")
        portrait_response = chat.send_message(get_portrait_prompt())


    # Extract the image from the response.
    # Gemini returns a response with multiple "parts" - we need to find the image part.
    portrait_image = None
    for part in portrait_response.candidates[0].content.parts:
        if part.inline_data is not None:
            # Found the image! Convert from bytes to PIL Image and save.
            image_bytes = part.inline_data.data
            portrait_image = Image.open(io.BytesIO(image_bytes))
            portrait_image.save("outputs/portrait.png")
            break
    
    if portrait_image is None:
        raise Exception("Failed to generate portrait - no image in response")
    
    print("✓ Portrait generated!")

    # =========================================================================
    # MODULE_5_STEP_3_GENERATE_ICON
    # =========================================================================
    # 1. Create an icon_prompt that asks for the SAME character
    #    - Emphasize consistency: "SAME person, SAME face, SAME suit"
    #    - Request tighter crop (head and shoulders only)
    #    - Request white background and square aspect ratio
    #
    # 2. Send the prompt using chat.send_message(icon_prompt)
    #    - The chat session remembers the character from step 2!
    #
    # 3. Extract and save the icon image to "outputs/icon.png"
    #
    # 4. Print progress messages for user feedback
    # =========================================================================
    print("🖼️  Creating map icon...")
    icon_response = chat.send_message(get_icon_prompt())
    
    # Extract the icon image from the response
    icon_image = None
    for part in icon_response.candidates[0].content.parts:
        if part.inline_data is not None:
            image_bytes = part.inline_data.data
            icon_image = Image.open(io.BytesIO(image_bytes))
            icon_image.save("outputs/icon.png")
            break
    
    if icon_image is None:
        raise Exception("Failed to generate icon - no image in response")
    
    print("✓ Icon generated!")

    return {
        "portrait_path": "outputs/portrait.png",
        "icon_path": "outputs/icon.png"
    }


if __name__ == "__main__":
    # Create outputs directory if it doesn't exist
    os.makedirs("outputs", exist_ok=True)

    print(f"Generating avatar for {USERNAME}...")
    result = generate_explorer_avatar()
    print(f"✅ Avatar created!")
    print(f"   Portrait: {result['portrait_path']}")
    print(f"   Icon: {result['icon_path']}")
