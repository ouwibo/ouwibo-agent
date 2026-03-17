#!/usr/bin/env python3
import os
import subprocess
import sys

ACP_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "virtuals-protocol-acp")

def run_acp_command(cmd_args: list[str]) -> None:
    full_cmd = ["npx", "tsx", "bin/acp.ts"] + cmd_args
    print(f"Running: {' '.join(full_cmd)}")
    result = subprocess.run(full_cmd, cwd=ACP_DIR)
    if result.returncode != 0:
        print(f"Command failed with exit code {result.returncode}")
        sys.exit(result.returncode)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 acp_register.py [init|create|resource_init|resource_create] [name]")
        sys.exit(1)
        
    action = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else ""
    
    if action == "init":
        run_acp_command(["sell", "init", name])
    elif action == "create":
        run_acp_command(["sell", "create", name])
    elif action == "resource_init":
        run_acp_command(["sell", "resource", "init", name])
    elif action == "resource_create":
        run_acp_command(["sell", "resource", "create", name])
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)

if __name__ == "__main__":
    main()
