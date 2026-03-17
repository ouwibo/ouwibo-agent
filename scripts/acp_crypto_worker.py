#!/usr/bin/env python3
import sys
import os
import asyncio

repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, repo_root)

from core.agent import Agent
from core.config import setup_openai

def main():
    if len(sys.argv) < 2:
        print("Error: token/project required", file=sys.stderr)
        sys.exit(1)
        
    token = sys.argv[1]
    analysis_type = sys.argv[2] if len(sys.argv) > 2 else "snapshot"
    
    try:
        client = setup_openai()
        agent = Agent(client)
        
        task = f"As a crypto analyst, perform a {analysis_type} analysis on '{token}'. Use your crypto_market, wallet, or other technical tools if necessary. Provide a structured and highly technical summary."
        
        result = agent.run(task)
        
        print(result)
        
    except Exception as e:
        print(f"Error executing agent: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
