from fastapi import APIRouter
from models.chat import ChatRequest, ChatResponse
from agent.agent import root_agent

from google.adk import Runner
from google.adk.sessions import InMemorySessionService, VertexAiSessionService
from google.adk.memory import InMemoryMemoryService, VertexAiMemoryBankService
from google.genai.types import Content, Part
import os
import time

router = APIRouter()

# Initialize Services
# Ensure API Key is set for GenAI client
google_api_key = os.getenv('GOOGLE_API_KEY')
if google_api_key and "GOOGLE_API_KEY" not in os.environ:
    os.environ["GOOGLE_API_KEY"] = google_api_key

use_memory_bank = os.getenv('USE_MEMORY_BANK', 'false').lower() == 'true'
agent_engine_id = os.getenv('AGENT_ENGINE_ID')



if use_memory_bank and agent_engine_id:
    project_id = os.getenv('PROJECT_ID')
    location = os.getenv('REGION')
    
    print(f"INFO: Initializing Vertex AI Services with Agent Engine: {agent_engine_id}")
    
    # TODO: REPLACE_VERTEXAI_SERVICES

else:
    print("INFO: Initializing InMemory Services")
    
    # TODO: REPLACE_INMEMORY_SERVICES
    

# Initialize Runner
# For sub-agents using memory bank, we must ensure memory service is passed to the runner
# TODO: REPLACE_RUNNER


# Global session map to persist mapping between client conversation_ids and ADK session_ids
# Note: In a production environment with multiple workers, this should be in Redis or database
SESSION_MAP = {} 

@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        user_id = "test-user" # In a real app, get this from auth
        conversation_id = request.conversation_id or "default-session"
        
        # Check if we have an existing session_id providing mapping
        if conversation_id in SESSION_MAP:
            session_id = SESSION_MAP[conversation_id]
            print(f"DEBUG: Found existing session {session_id} for conversation {conversation_id}")
            
            # Verify session still exists (especially for in-memory)
            try:
                await session_service.get_session(app_name="survivor-network", session_id=session_id, user_id=user_id)
            except Exception:
                print(f"DEBUG: Session {session_id} not found, creating new one.")
                session_id = None
        else:
            session_id = None
            
        if not session_id:
            # Create a new session
            session = await session_service.create_session(user_id=user_id, app_name="survivor-network")
            print(f"DEBUG: Created new session {session.id}")
            session_id = session.id
            SESSION_MAP[conversation_id] = session_id
        
        # Accumulate response text
        response_text = ""
        
        # Helper to run agent cycle
        async def run_agent_cycle(parts, context_text=""):
            nonlocal response_text
            async for event in runner.run_async(
                user_id=user_id, 
                session_id=session_id, 
                new_message=Content(role="user", parts=parts)
            ):
                try:
                    if hasattr(event, "text") and event.text:
                        response_text += event.text
                    elif hasattr(event, "content") and event.content:
                        for part in event.content.parts:
                            if hasattr(part, "text") and part.text:
                                response_text += part.text
                    elif hasattr(event, "parts"):
                         for part in event.parts:
                            if hasattr(part, "text") and part.text:
                                response_text += part.text
                except Exception as e:
                    print(f"Error processing event: {e}")
            response_text += "\n\n"

        # Logic to handle multiple attachments:
        # If multiple attachments, we process them sequentially to ensure the SequentialAgent pipeline 
        # (Upload -> Extract -> Save) runs for EACH file.
        if request.attachments and len(request.attachments) > 0:
            total_files = len(request.attachments)
            for i, attachment in enumerate(request.attachments):
                print(f"DEBUG: Processing attachment {i+1}/{total_files}: {attachment['path']}")
                
                current_parts = []
                # For the first attachment, include the user's actual message text
                # For subsequent, we can imply context or repeat a simplified version
                if i == 0:
                     current_parts.append(Part(text=request.message))
                else:
                     current_parts.append(Part(text=f"Processing next attachment ({i+1}/{total_files})..."))

                try:
                    with open(attachment["path"], "rb") as f:
                        file_data = f.read()
                        current_parts.append(Part.from_bytes(data=file_data, mime_type=attachment["mime_type"]))
                    # Append file path as text context for the agent tools
                    current_parts.append(Part(text=f"\n[System] Attached file path: {attachment['path']}"))
                    
                    # Run the cycle for this attachment
                    await run_agent_cycle(current_parts)
                    
                except Exception as e:
                    error_msg = f"Error reading/processing attachment {attachment['path']}: {e}"
                    print(error_msg)
                    response_text += f"\n[Error processing {os.path.basename(attachment['path'])}: {str(e)}]\n"

        else:
            # No attachments, standard single run
            message_parts = [Part(text=request.message)]
            await run_agent_cycle(message_parts)

        if not response_text.strip():
            response_text = "I received your message, but I couldn't generate a text response."

        return ChatResponse(
            answer=response_text.strip(),
            gql_query=None,
            nodes_to_highlight=[],
            edges_to_highlight=[],
            suggested_followups=[]
        )
    except Exception as e:
        import traceback
        error_msg = f"Error processing message: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return ChatResponse(
            answer=error_msg,
            gql_query=None,
            nodes_to_highlight=[],
            edges_to_highlight=[],
            suggested_followups=[]
        )
