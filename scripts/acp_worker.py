#!/usr/bin/env python3
import sys
import os
import asyncio
from groq import Groq
from dotenv import load_dotenv

# Ensure the root repo directory is in the path
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, repo_root)

from core.agent import Agent

def main():
    load_dotenv()
    api_key = os.getenv("API_KEY") or os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Error: No API_KEY found in environment", file=sys.stderr)
        sys.exit(1)

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
