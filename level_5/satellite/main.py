import asyncio
import json
import random
import logging
import ssl
import os
from dotenv import load_dotenv

# Load env from project root
load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel

# A2A Imports
from a2a.client.transports.kafka import KafkaClientTransport
from a2a.client.middleware import ClientCallContext
from a2a.types import (
    AgentCard,
    AgentCapabilities,
    MessageSendParams,
    Message,
    Task,
)


# Configure Logging
logging.basicConfig(level=logging.INFO)
# logging.getLogger("aiokafka").setLevel(logging.DEBUG)
logger = logging.getLogger("satellite_dashboard")
logger.setLevel(logging.INFO)

from contextlib import asynccontextmanager

#REPLACE-CONNECT-TO-KAFKA-CLUSTER

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.cloudshell\.dev|http://localhost.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# State
# Pods: 15 items. Default freeform random.
PODS = []
TARGET_PODS = []
FORMATION = "FREEFORM"

# Global Transport
kafka_transport = None

class FormationRequest(BaseModel):
    formation: str

def init_pods():
    global PODS, TARGET_PODS
    PODS = [{"id": i, "x": random.randint(50, 850), "y": random.randint(100, 600)} for i in range(15)]
    TARGET_PODS = [p.copy() for p in PODS]

init_pods()

#REPLACE-SSE-STREAM

#REPLACE-FORMATION-REQUEST

class PodUpdate(BaseModel):
    id: int
    x: int
    y: int

@app.post("/update_pod")
async def update_pod_manual(update: PodUpdate):
    """Manual override for drag-and-drop."""
    global FORMATION
    FORMATION = "RANDOM"
    
    # Find the pod and update both current and target to stop it from drifting back
    # effectively "teleporting" it or re-anchoring it.
    found = False
    for p in PODS:
        if p["id"] == update.id:
            p["x"] = update.x
            p["y"] = update.y
            found = True
            break
            
    for t in TARGET_PODS:
        if t["id"] == update.id:
            t["x"] = update.x
            t["y"] = update.y
            break
            
    if found:
        # Force immediate update push?
        # The stream loop will pick it up, but we could trigger it.
        pass
        
    return {"status": "updated", "id": update.id}

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Ensure API routes are above this!

# Serve Static Assets (JS/CSS)
# We assume the user has run 'npm run build' in ../frontend
# resulting in ../frontend/dist
dist_dir = os.path.join(os.path.dirname(__file__), "../frontend/dist")

if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # 1. If it matches an underlying file (like favicon.svg), serve it
        possible_file = os.path.join(dist_dir, full_path)
        if os.path.isfile(possible_file):
            return FileResponse(possible_file)
        
        # 2. Otherwise return index.html for SPA routing
        return FileResponse(os.path.join(dist_dir, "index.html"))
else:
    logger.warning("Frontend build not found. Please run 'npm run build' in frontend/.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, proxy_headers=True, forwarded_allow_ips="*")
