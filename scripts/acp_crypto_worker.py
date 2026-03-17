#!/usr/bin/env python3
import sys
import os
import asyncio
from groq import Groq
from dotenv import load_dotenv

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
        print("Error: token/project required", file=sys.stderr)
        sys.exit(1)
        
    token = sys.argv[1]
    analysis_type = sys.argv[2] if len(sys.argv) > 2 else "snapshot"
    
    try:
        client = Groq(api_key=api_key)
        agent = Agent(client)
        
        task = f"As a crypto analyst, perform a {analysis_type} analysis on '{token}'. Use your crypto_market, wallet, or other technical tools if necessary. Provide a structured and highly technical summary."
        
        result = agent.run(task)
        print(result)
        
    except Exception as e:
        print(f"Error executing agent: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
