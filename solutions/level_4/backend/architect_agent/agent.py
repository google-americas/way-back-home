from google.adk.agents.llm_agent import Agent
import os
import redis

REDIS_IP = os.environ.get('REDIS_HOST', 'localhost')
r = redis.Redis(host=REDIS_IP, port=6379, decode_responses=True)

def lookup_schematic_tool(drive_name: str) -> list[str]:
    """Returns the ordered list of parts for a drive from local Redis."""
    
    # Logic to clean input like "TARGET: X" -> "X"
    clean_name = drive_name.replace("TARGET:", "").replace("TARGET", "").strip()
    clean_name = clean_name.replace(":", "").strip()
    
    # LRANGE gets all items in the list (index 0 to -1)
    result = r.lrange(clean_name, 0, -1)
    
    if not result:
        print(f"[ARCHITECT] Error: Drive ID '{clean_name}' not found in Redis.")
        return ["ERROR: Drive ID not found."]
    
    print(f"[ARCHITECT] Returning schematic for {clean_name}: {result}")
    return result


root_agent = Agent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='A helpful assistant for user questions.',
    instruction='''SYSTEM ROLE: Database API.
    INPUT: Text string (Drive Name).
    TASK: Run `lookup_schematic_tool`.
    OUTPUT: Return ONLY the raw list from the tool.
    CONSTRAINT: Do NOT add conversational text.
    ''',
    tools=[lookup_schematic_tool],
)
