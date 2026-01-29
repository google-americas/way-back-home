import logging
from google.adk.agents import Agent, SequentialAgent, LlmAgent
from agent.tools.extraction_tools import (
    upload_media, extract_from_media, save_to_spanner
)
import os
logger = logging.getLogger(__name__)

# --- Option 2: Sequential Pipeline ---

# TODO: REPLACE_UPLOAD_AGENT

# TODO: REPLACE_EXTRACT_AGENT

# TODO: REPLACE_SPANNER_AGENT


# Define summary instructions dynamically based on memory bank availability

summary_instruction="" # TODO: REPLACE_SUMMARY_AGENT_PROMPT

summary_agent = LlmAgent(
    name="SummaryAgent",
    model="gemini-2.5-flash",
    instruction=summary_instruction,
    output_key="final_summary"
)

multimedia_agent = SequentialAgent(
    name="MultimediaExtractionPipeline",
    description="Process media uploads: Upload -> Extract -> Save -> Summarize",
    # TODO: REPLACE_ORCHESTRATION
)
