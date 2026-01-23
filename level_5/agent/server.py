import asyncio
import logging
import sys
import os
import ssl
from dotenv import load_dotenv

# Load env from project root
load_dotenv()


current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)


from agent.agent_to_kafka_a2a import create_kafka_server
from agent.formation.agent import root_agent


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("formation_controller")

async def main():
    logger.info("Initializing Kafka Server...")
    
    bootstrap_server = os.getenv("KAFKA_BOOTSTRAP_SERVERS")


    try:
        server_app = await create_kafka_server(
            agent=root_agent,
            bootstrap_servers=bootstrap_server,
            request_topic="a2a-formation-request",
            # No security params needed for local default
        )
        
        logger.info("Starting Kafka Server Loop...")
        await server_app.run()
        
    except Exception as e:
        logger.error(f"Failed to run server: {e}")
        raise

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user.")