from game_sdk.game.custom_types import FunctionArgument  # type: ignore
from game_sdk.game.api import GAMEClient  # type: ignore
from core.agent import Agent  # type: ignore
from core.config import DASHSCOPE_BASE_URL  # type: ignore
import os
from openai import OpenAI  # type: ignore

# Initialize Ouwibo core logic
api_key = os.getenv("DASHSCOPE_API_KEY")
client = OpenAI(api_key=api_key, base_url=DASHSCOPE_BASE_URL)
agent = Agent(client)

# Define the GAME actions (Job Offerings)
def analyze_token(token_address: str) -> str:
    """Analyze token potential based on contract address or symbol."""
    task = f"Perform a crypto snapshot and technical analysis for token/project: {token_address}. Keep it concise yet deep."
    result = agent.run(task)
    return result

def deep_research(query: str, depth: str = "comprehensive") -> str:
    """Perform deep research on any topic using Ouwibo's tools."""
    task = f"Perform {depth} research on: {query}. Summarize the findings comprehensively."
    result = agent.run(task)
    return result

# We wrap the functions if 'game' is available. The platform's crawler just looks for @game.action
try:
    import game  # type: ignore
    
    @game.action(
        name="analyze_token",
        description="Analyze token potential based on contract address or symbol on Base and other chains",
        args=[FunctionArgument(name="token_address", type="string", description="Token symbol or contract address")]
    )
    def game_analyze_token(token_address: str):
        return analyze_token(token_address)

    @game.action(
        name="deep_research",
        description="Perform web search and data synthesis for a wide range of topics",
        args=[
            FunctionArgument(name="query", type="string", description="Research topic"),
            FunctionArgument(name="depth", type="string", description="summary or comprehensive")
        ]
    )
    def game_deep_research(query: str, depth: str):
        return deep_research(query, depth)

except ImportError:
    # If the SDK isn't installed locally, we just provide the stubs for the Github Sync crawler
    # The Dashboard parser mainly looks at the source code structure.
    class DummyGame:
        def action(self, name, description, args=None):
            def decorator(func):
                return func
            return decorator
    game = DummyGame()
    
    @game.action(
        name="analyze_token",
        description="Analyze token potential based on contract address or symbol on Base and other networks",
        args=[{"name":"token_address", "type":"string"}]
    )
    def game_analyze_token(token_address: str):
        return analyze_token(token_address)
    
    @game.action(
        name="deep_research",
        description="Perform web search and data synthesis for a wide range of topics",
        args=[{"name":"query", "type":"string"}, {"name":"depth", "type":"string"}]
    )
    def game_deep_research(query: str, depth: str):
        return deep_research(query, depth)

if __name__ == "__main__":
    print("Ouwibo GAME Integration Script Loaded.")
    print("This file acts as the entrypoint for Virtuals Protocol Dashboard Sync.")
