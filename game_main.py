from game_sdk.game.custom_types import FunctionArgument
from game_sdk.game.api import GAMEClient
from core.agent import Agent
from core.config import setup_openai

# Initialize Ouwibo core logic
client = setup_openai()
agent = Agent(client)

# Define the GAME actions (Job Offerings)
def analyze_token(token_address: str) -> str:
    """Menganalisis potensi token berdasarkan alamat kontrak atau simbol."""
    task = f"Lakukan crypto snapshot dan teknikal analisis untuk token/proyek: {token_address}. Buat ringkas namun mendalam."
    result = agent.run(task)
    return result

def deep_research(query: str, depth: str = "comprehensive") -> str:
    """Melakukan riset mendalam pada topik apa saja menggunakan Ouwibo."""
    task = f"Perform {depth} research on: {query}. Summarize the findings comprehensively."
    result = agent.run(task)
    return result

# We wrap the functions if 'game' is available. The platform's crawler just looks for @game.action
try:
    import game
    
    @game.action(
        name="analyze_token",
        description="Menganalisis potensi token berdasarkan alamat kontrak atau simbol di jaringan Base/lainnya",
        args=[FunctionArgument(name="token_address", type="string", description="Simbol token atau kontrak address")]
    )
    def game_analyze_token(token_address: str):
        return analyze_token(token_address)

    @game.action(
        name="deep_research",
        description="Melakukan web search dan sintesis data untuk berbagai macam topik",
        args=[
            FunctionArgument(name="query", type="string", description="Topik riset"),
            FunctionArgument(name="depth", type="string", description="summary atau comprehensive")
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
        description="Menganalisis potensi token berdasarkan alamat kontrak atau simbol di jaringan Base/lainnya",
        args=[{"name":"token_address", "type":"string"}]
    )
    def game_analyze_token(token_address: str):
        return analyze_token(token_address)
    
    @game.action(
        name="deep_research",
        description="Melakukan web search dan sintesis data untuk berbagai macam topik",
        args=[{"name":"query", "type":"string"}, {"name":"depth", "type":"string"}]
    )
    def game_deep_research(query: str, depth: str):
        return deep_research(query, depth)

if __name__ == "__main__":
    print("Ouwibo GAME Integration Script Loaded.")
    print("This file acts as the entrypoint for Virtuals Protocol Dashboard Sync.")
