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
import os


load_dotenv()

from .hazard_db import PART_HAZARDS

ARCHITECT_URL = os.environ.get("ARCHITECT_URL","http://localhost:8081")

#REPLACE-REMOTEA2AAGENT

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

##REPLACE_MONITOR_HAZARD

MODEL_ID = os.getenv("MODEL_ID", "gemini-live-2.5-flash-preview-native-audio-09-2025")
root_agent = Agent(
    name="dispatch_agent",
    model=MODEL_ID,
    #REPLACE_AGENT_TOOLS  
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