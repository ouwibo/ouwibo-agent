#!/usr/bin/env python3
import sys
import os
import asyncio

# Ensure the root repo directory is in the path
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, repo_root)

from core.agent import Agent
from core.config import setup_openai

def main():
    if len(sys.argv) < 2:
        print("Error: query required", file=sys.stderr)
        sys.exit(1)
        
    query = sys.argv[1]
    depth = sys.argv[2] if len(sys.argv) > 2 else "summary"
    
    # Initialize the client and agent
    try:
        client = setup_openai()
        agent = Agent(client)
        
        # Format task
        task = f"Perform {depth} research on: {query}. Summarize the findings comprehensively."
        
        # Run agent
        result = agent.run(task)
        
        # Output result for TS handler to pick up
        print(result)
        
    except Exception as e:
        print(f"Error executing agent: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
