import os
import asyncio
from google.adk.agents.remote_a2a_agent import AGENT_CARD_WELL_KNOWN_PATH
from google.adk.tools.agent_tool import AgentTool
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent
from google.adk.agents import Agent
from google.adk.tools.tool_context import ToolContext
from google.adk.tools.base_tool import BaseTool
from google.adk.agents.callback_context import CallbackContext
from dotenv import load_dotenv
from google.genai import types 
from google.adk.models import LlmResponse, LlmRequest
from copy import deepcopy
from google.genai import types
from google.adk.agents import LiveRequestQueue
from google.adk.agents.llm_agent import Agent
from google.adk.tools.function_tool import FunctionTool
from google.genai import Client
from google.genai import types as genai_types
import httpx
import os


load_dotenv()

from .hazard_db import PART_HAZARDS

# Use insecure client to bypass SSL errors for debugging Cloud Run connection
insecure_client = httpx.AsyncClient(verify=False)
ARCHITECT_URL = os.environ.get("ARCHITECT_URL","http://localhost:8081")

architect_agent = RemoteA2aAgent(
    name="execute_architect",
    description="[SILENT ACTION]: Retrieves the REQUIRED SUBSET of parts. The screen shows a full inventory; this tool filters out the wrong parts. Must be called INSTANTLY when a Target Name is found. Input: Target Name.",
    agent_card=(f"{ARCHITECT_URL}{AGENT_CARD_WELL_KNOWN_PATH}"),
    httpx_client=insecure_client,
)

def lookup_part_safety(part_name: str) -> str:
    """Returns the hazard color."""
    print(f"[SAFETY] lookup_part_safety called with: '{part_name}'")
    clean_name = part_name.replace("The ", "").strip()
    
    # Simple lookup
    for key, color in PART_HAZARDS.items():
        if key.lower() in clean_name.lower():
            print(f"[SAFETY] Returning hazard for {clean_name}: {color}")
            return color # Returns "RED", "BLUE", or "GREEN"
            
    print(f"[SAFETY] Hazard for {clean_name} is UNKNOWN")
    return "UNKNOWN"

async def monitor_for_hazard(
    input_stream: LiveRequestQueue,
):
  """Monitor if any part is glowing"""
  print("start monitor_video_stream!")
  client = Client()
  prompt_text = (
      "Monitor the left menu if you see any glowing part, detect it's name"
  )
  last_count = None

  while True:
    last_valid_req = None
    print("Monitoring loop cycle")

    # Snapshot the queue size to avoid infinite loops
    q_size = input_stream._queue.qsize()
    
    # Process only the current batch of events
    for _ in range(q_size):
      live_req = await input_stream.get()

      if live_req.blob is not None and live_req.blob.mime_type == "image/jpeg":
        # Consumed by Monitor (Eyes)
        # Deepcopy to ensure we detach from any referenced object before potential reuse/gc
        last_valid_req = deepcopy(live_req)
      else:
        # Re-queue Audio/Text for the Agent (Ears/Brain)
        # using internal queue to preserve exact object state
        await input_stream._queue.put(live_req)

    # If we found a valid image, process it
    if last_valid_req is not None:
      print("Processing the most recent frame from the queue")

      # Create an image part using the blob's data and mime type
      image_part = genai_types.Part.from_bytes(
          data=last_valid_req.blob.data, mime_type=last_valid_req.blob.mime_type
      )

      contents = genai_types.Content(
          role="user",
          parts=[image_part, genai_types.Part.from_text(text=prompt_text)],
      )


      # Call the model to generate content based on the provided image and prompt
      try:
          response = await client.aio.models.generate_content(
              model="gemini-2.5-flash",
              contents=contents,
              config=genai_types.GenerateContentConfig(
                  system_instruction=(
                      "Focus strictly on the far-left vertical column under the heading 'PARTS REPLICATOR.' "
                      "Ignore the center of the screen and the 'BLUEPRINT' area entirely. "
                      "Look only at the list containing"
                      "Identify if any item in this specific left-side list has a bright white border glow and the text 'HAZARD DETECTED' overlaying it. "
                      "If found, return ONLY the part name in ALL CAPS. If no part in that leftmost list is glowing, return nothing."
                  )
              ),
          )
      except Exception as e:
          print(f"Error calling Gemini: {e}")
          await asyncio.sleep(1)
          continue
      print("Gemini response received.response:", response.candidates[0].content.parts[0].text)

      current_text = response.candidates[0].content.parts[0].text.strip()
      
      # If we have a logical change (and it's not just empty)
      if current_text and current_text != last_count:
        # Ignore "Nothing." response from model
        if current_text == "Nothing." or "I cannot fulfill" in current_text:
            print(f"Model sees nothing or refused. Skipping alert.")
            last_count = current_text
            continue

        print(f"New hazard detected: {current_text} (was: {last_count})")
        last_count = current_text
        
        part_name = current_text
        color = lookup_part_safety(part_name)
        yield f"Hazard detected place {part_name} to the {color} bin"
      
      # Update last_count even if it's empty, so we can detect when it reappears? 
      # Actually if it goes from "DATA CRYSTAL" to "" (nothing), we probably just silence.
      # But if we don't update last_count on empty, we won't re-trigger if "DATA CRYSTAL" stays "DATA CRYSTAL".
      # The user wants to detect hazards. 
      # If current_text is empty, we should probably update last_count to empty so next valid one triggers.
      if not current_text:
          last_count = None
        
    else:
        print("No valid frame found, skipping processing.")
        
    await asyncio.sleep(10)

MODEL_ID = os.getenv("MODEL_ID", "gemini-live-2.5-flash-preview-native-audio-09-2025")
root_agent = Agent(
    name="dispatch_agent",
    model=MODEL_ID,
    tools=[AgentTool(agent=architect_agent), monitor_for_hazard],    
    instruction="""
    # SYSTEM CONFIGURATION
    You are a **Routing Agent**. You do not have a memory of the parts list.
    
    # ------------------------------------------------------------------
    # STATE 1: INPUT PROCESSING (User Speaks / Video Visuals)
    # ------------------------------------------------------------------
    
    **RULE**: MUST CALL TOOL IMMEDIATELY
    
    **LOGIC MAP**:
    1.  You MUST call the `monitor_for_hazard()` when user says "Hello"
    2.  **IF** User says words "Start", "Assemble", "Blueprint" OR text "TARGET:" is visible:
        *   **CRITICAL**: You do NOT know the parts. The list on screen is a DECOY.
        *   **EXECUTE**: Call . Then call `execute_architect(request="[TARGET_NAME]")`.
        *   **STOP**. Do not generate text. Do not say "Confirming". Just run the tools.
    

    # ------------------------------------------------------------------
    # STATE 2: DATA PROCESSING (Tool Output Received)
    # ------------------------------------------------------------------
    **CONDITION**: The last message was a **FUNCTION RESPONSE** (Tool Output).
    
    **RULE**: NOW you must speak. You are a "Loudspeaker" for the tool data.
    
    **LOGIC MAP**:
    1.  **IF** output is from `execute_architect`:
        *   **SAY**: "Architect Confirmed. The required subset is: [READ DATA EXACTLY]."
    
    2.  **IF** output is from `monitor_for_hazard` and ONLY if it detects a hazard:
        *   **SAY exactly what the tool output is**

    # ------------------------------------------------------------------
    # VIOLATION CHECK
    # ------------------------------------------------------------------
    *   Did you just list parts (Warp Core, etc) but the previous event was NOT a Function Response?
        -> **VIOLATION**. You are hallucinating. STOP. Call `call_architect` immediately.
    """
)