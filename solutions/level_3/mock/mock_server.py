import asyncio
import base64
import json
import os
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

PORT = 8080
AUDIO_FILE = "mock/mock_audio.pcm"
FRONTEND_DIST = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))

# WebSocket Endpoint
@app.websocket("/ws/user1/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()
    print(f"Client connected (Session: {session_id})")
    try:
        # Send initial audio greeting immediately
        if os.path.exists(AUDIO_FILE):
            print("Sending initial audio greeting...")
            with open(AUDIO_FILE, "rb") as f:
                audio_content = f.read()
            
            b64_audio = base64.b64encode(audio_content).decode('utf-8')
            
            response = {
                "serverContent": {
                    "modelTurn": {
                        "parts": [
                            {
                                "inlineData": {
                                    "mimeType": "audio/pcm;rate=24000",
                                    "data": b64_audio
                                }
                            }
                        ]
                    }
                }
            }
            await websocket.send_text(json.dumps(response))
            print("Sent mock audio response")

            # Send mock tool call shortly after
            print("Sending mock tool call in 2 seconds...")
            await asyncio.sleep(2)
            tool_call_response = {
                    "serverContent": {
                    "modelTurn": {
                        "parts": [
                            {
                                "functionCall": {
                                    "name": "report_digit",
                                    "args": {
                                        "count": "3" 
                                    }
                                }
                            }
                        ]
                    }
                    }
            }
            await websocket.send_text(json.dumps(tool_call_response))
            print("Sent mock tool call response")
        else:
            print(f"Error: {AUDIO_FILE} not found")

        while True:
            # Continue to listen for messages to keep connection open and log them
            message = await websocket.receive_text()
            msg_data = json.loads(message)
            print(f"Received message type: {msg_data.get('type')}")


    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {e}")

if os.path.isdir(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")
    print(f"Serving static files from: {FRONTEND_DIST}")
else:
    print(f"Warning: Frontend build not found at {FRONTEND_DIST}")
    print("Please run 'npm run build' in the frontend directory.")

if __name__ == "__main__":
    # Run uvicorn programmatically
    uvicorn.run(app, host="0.0.0.0", port=PORT)
