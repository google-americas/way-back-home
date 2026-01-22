import asyncio
import logging
import sys
import os
import ssl
from dotenv import load_dotenv

# Load env from project root
load_dotenv()

# Adapt sys.path to ensure we can import from local modules if running as a script
# This allows 'python agent/server.py' to work if imports are relative or from root
# But robustly, we should assume running from project root. 
# However, to be safe for the user:
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)
# Also add agent dir itself if needed for direct imports, but relative imports in server.py are better avoided if running as script

try:
    from agent.agent_to_kafka_a2a import create_kafka_server
    from agent.formation.agent import root_agent
except ImportError:
    # Fallback if running from within agent/ directory
    try:
        from agent_to_kafka_a2a import create_kafka_server
        from formation.agent import root_agent
    except ImportError as e:
        print(f"Error importing modules: {e}")
        print("Please run this script from the project root using: python -m agent.server")
        sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
# logging.getLogger("aiokafka").setLevel(logging.DEBUG) # Uncomment for debugging
logger = logging.getLogger("formation_controller")

async def main():
    logger.info("Initializing Kafka Server...")
    
    # Redpanda Cloud Configuration
    # Redpanda Cloud Configuration
    bootstrap_server = os.getenv("KAFKA_BOOTSTRAP_SERVERS")
    username = os.getenv("KAFKA_SASL_USERNAME")
    password = os.getenv("KAFKA_SASL_PASSWORD")

    try:
        server_app = await create_kafka_server(
            agent=root_agent,
            bootstrap_servers=bootstrap_server,
            request_topic="a2a-formation-request",
            
            # Security Protocol
            security_protocol="SASL_SSL",
            
            # Authentication (SCRAM-SHA-256)
            sasl_mechanism="SCRAM-SHA-256",
            sasl_plain_username=username,
            sasl_plain_password=password,
            
            # Standard SSL Context (system certs)
            ssl_context=ssl.create_default_context(),
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