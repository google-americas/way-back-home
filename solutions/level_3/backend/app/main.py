import asyncio
import json
import logging
import uvicorn
import warnings
import os
from pathlib import Path


from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from google.adk.agents.live_request_queue import LiveRequestQueue
from google.adk.agents.run_config import RunConfig, StreamingMode
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Load environment variables from .env file BEFORE importing agent
load_dotenv()

# Import agent after loading environment variables
# pylint: disable=wrong-import-position
from biometric_agent.agent import root_agent  # noqa: E402

# Configure logging
logging.basicConfig(
    level=logging.INFO, # Default to INFO
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Suppress noisy loggers
logging.getLogger("websockets").setLevel(logging.WARNING)
logging.getLogger("google_adk").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# Suppress Pydantic serialization warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

PORT = 8080
APP_NAME = "alpha-drone"
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
# ========================================
# Phase 1: Application Initialization (once at startup)
# ========================================

app = FastAPI()

# Add CORS middleware to allow WebSocket connections from any origin
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Define your session service
session_service = InMemorySessionService()

# Define your runner
runner = Runner(app_name=APP_NAME, agent=root_agent, session_service=session_service)

# ========================================
# WebSocket Endpoint
# ========================================


@app.websocket("/ws/{user_id}/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str,
    session_id: str,
    proactivity: bool = True,
    affective_dialog: bool = False,
) -> None:
    """WebSocket endpoint for bidirectional streaming with ADK.

    Args:
        websocket: The WebSocket connection
        user_id: User identifier
        session_id: Session identifier
        proactivity: Enable proactive audio (native audio models only)
        affective_dialog: Enable affective dialog (native audio models only)
    """
    await websocket.accept()
    logger.info(f"WebSocket connected: {user_id}/{session_id}")

    # ========================================
    # Phase 2: Session Initialization (once per streaming session)
    # ========================================

    # Automatically determine response modality based on model architecture
    # Native audio models (containing "native-audio" in name)
    # ONLY support AUDIO response modality.
    # Half-cascade models support both TEXT and AUDIO;
    # we default to TEXT for better performance.

    model_name = root_agent.model
    is_native_audio = "native-audio" in model_name.lower() or "live" in model_name.lower()

    if is_native_audio:
        # Native audio models require AUDIO response modality
        # with audio transcription
        response_modalities = ["AUDIO"]

        # Build RunConfig with optional proactivity and affective dialog
        # These features are only supported on native audio models
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=response_modalities,
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            session_resumption=types.SessionResumptionConfig(),
            proactivity=(
                types.ProactivityConfig(proactive_audio=True) if proactivity else None
            ),
            enable_affective_dialog=affective_dialog if affective_dialog else None,
        )
        logger.info(f"Model Config: {model_name} (Modalities: {response_modalities}, Proactivity: {proactivity})")
    else:
        # Half-cascade models support TEXT response modality
        # for faster performance
        response_modalities = ["TEXT"]
        run_config = RunConfig(
            streaming_mode=StreamingMode.BIDI,
            response_modalities=response_modalities,
            input_audio_transcription=None,
            output_audio_transcription=None,
            session_resumption=types.SessionResumptionConfig(),
        )
        logger.info(f"Model Config: {model_name} (Modalities: {response_modalities})")

    # Get or create session (handles both new sessions and reconnections)
    session = await session_service.get_session(
        app_name=APP_NAME, user_id=user_id, session_id=session_id
    )
    if not session:
        await session_service.create_session(
            app_name=APP_NAME, user_id=user_id, session_id=session_id
        )
    
    # ========================================
    # Phase 3: Active Session (concurrent bidirectional communication)
    # ========================================

    live_request_queue = LiveRequestQueue()

    # Send an initial "Hello" to the model to wake it up/force a turn
    logger.info("Sending initial 'Hello' stimulus to model...")
    live_request_queue.send_content(types.Content(parts=[types.Part(text="Hello")]))

    async def upstream_task() -> None:
        """Receives messages from WebSocket and sends to LiveRequestQueue."""
        frame_count = 0
        audio_count = 0

        try:
            while True:
                # Receive message from WebSocket (text or binary)
                message = await websocket.receive()
                
                # Handle binary frames (audio data)
                if "bytes" in message:
                    audio_data = message["bytes"]
                    audio_blob = types.Blob(
                        mime_type="audio/pcm;rate=16000", data=audio_data
                    )
                    live_request_queue.send_realtime(audio_blob)

                # Handle text frames (JSON messages)
                elif "text" in message:
                    text_data = message["text"]
                    json_message = json.loads(text_data)

                    # Extract text from JSON and send to LiveRequestQueue
                    if json_message.get("type") == "text":
                        logger.info(f"User says: {json_message['text']}")
                        content = types.Content(
                            parts=[types.Part(text=json_message["text"])]
                        )
                        live_request_queue.send_content(content)

                    # Handle audio data (microphone)
                    elif json_message.get("type") == "audio":
                        import base64
                        # Decode base64 audio data
                        audio_data = base64.b64decode(json_message.get("data", ""))

                        # Send to Live API as PCM 16kHz
                        audio_blob = types.Blob(
                            mime_type="audio/pcm;rate=16000", 
                            data=audio_data
                        )
                        live_request_queue.send_realtime(audio_blob)

                    # Handle image data
                    elif json_message.get("type") == "image":
                        import base64
                        # Decode base64 image data
                        image_data = base64.b64decode(json_message["data"])
                        mime_type = json_message.get("mimeType", "image/jpeg")

                        # Send image as blob
                        image_blob = types.Blob(mime_type=mime_type, data=image_data)
                        live_request_queue.send_realtime(image_blob)
        finally:
             pass
    async def downstream_task() -> None:
        """Receives Events from run_live() and sends to WebSocket."""
        logger.info("Connecting to Gemini Live API...")
        async for event in runner.run_live(
            user_id=user_id,
            session_id=session_id,
            live_request_queue=live_request_queue,
            run_config=run_config,
        ):
            # Parse event for human-readable logging
            event_type = "UNKNOWN"
            details = ""
            
            # Check for tool calls
            if hasattr(event, "tool_call") and event.tool_call:
                 event_type = "TOOL_CALL"
                 details = str(event.tool_call.function_calls)
                 logger.info(f"[SERVER-SIDE TOOL EXECUTION] {details}")
            
            # Check for user input transcription (Text or Audio Transcript)
            input_transcription = getattr(event, "input_audio_transcription", None)
            if input_transcription and input_transcription.final_transcript:
                 logger.info(f"USER: {input_transcription.final_transcript}")
            
            # Check for model output transcription
            output_transcription = getattr(event, "output_audio_transcription", None)
            if output_transcription and output_transcription.final_transcript:
                 logger.info(f"GEMINI: {output_transcription.final_transcript}")

            event_json = event.model_dump_json(exclude_none=True, by_alias=True)
            await websocket.send_text(event_json)
        logger.info("Gemini Live API connection closed.")

    # Run both tasks concurrently
    # Exceptions from either task will propagate and cancel the other task
    try:
        await asyncio.gather(upstream_task(), downstream_task())
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=False) # Reduced stack trace noise
    finally:
        # ========================================
        # Phase 4: Session Termination
        # ========================================

        # Always close the queue, even if exceptions occurred
        logger.debug("Closing live_request_queue")
        live_request_queue.close()


# Serve Static Files (Fallback for SPA)
# Mount static files if directory exists
if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")
    print(f"Serving static files from: {FRONTEND_DIST}")
else:
    print(f"Warning: Frontend build not found at {FRONTEND_DIST}")
    print("Please run 'npm run build' in the frontend directory.")

if __name__ == "__main__":
    # Run uvicorn programmatically
    uvicorn.run(app, host="0.0.0.0", port=PORT)