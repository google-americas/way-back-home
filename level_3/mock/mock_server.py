import asyncio
import websockets
import json
import base64
import time

PORT = 8080
AUDIO_FILE = "mock/mock_audio.pcm"

async def handler(websocket):
    print("Client connected")
    try:
        # Wait for the first message (usually initial setup or "start")
        # In a real scenario, we might wait for an "setup" message.
        # But for this simple test, we can just respond.
        
        async for message in websocket:
            msg_data = json.loads(message)
            print(f"Received message type: {msg_data.get('type')}")
            
            # If we receive audio or image, we can mock a response.
            # Let's just respond immediately with the audio file as "inlineData"
            # simulating the AI speaking "This is mock".
            
            # Read the audio file
            with open(AUDIO_FILE, "rb") as f:
                audio_content = f.read()
                
            # Base64 encode
            b64_audio = base64.b64encode(audio_content).decode('utf-8')
            
            # Construct Gemini-like response
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
            
            # Simulate latency
            print("Simulating 6s latency...")
            await asyncio.sleep(6)
            
            await websocket.send(json.dumps(response))
            print("Sent mock audio response")
            
            # Also send a mock tool call "report_digit" just to see if frontend handles it
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
            await asyncio.sleep(1) # Wait a bit before sending tool call
            await websocket.send(json.dumps(tool_call_response))
            print("Sent mock tool call response")
            
            # Just do it once for the first message to avoid loop spam if client streams constantly
            # But the client streams constantly (audio/video).
            # So we should validly only reply occasionally.
            # For this simple test, I'll sleep for a long time effectively stopping replies for this session
            # or until new connection.
            await asyncio.sleep(100) 

    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")

async def main():
    async with websockets.serve(handler, "localhost", PORT):
        print(f"Mock server started on ws://localhost:{PORT}")
        await asyncio.get_running_loop().create_future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())
