#!/bin/bash
# run.sh - Unified startup script for Ouwibo Agent

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Ouwibo Agent Unified Services...${NC}"

# 1. Start the Ouwibo API (Backend + Web UI)
echo -e "${GREEN}Starting AI API on port 8001...${NC}"
./venv/bin/python3 api.py &
API_PID=$!

# 2. Start the ACP Service
echo -e "${GREEN}Starting ACP Service...${NC}"
cd virtuals-protocol-acp && npx tsx bin/acp.ts serve start &
ACP_PID=$!

echo -e "${BLUE}Both services are running.${NC}"
echo -e "API PID: $API_PID"
echo -e "ACP PID: $ACP_PID"
echo ""
echo -e "Press CTRL+C to stop all services."

# Wait for both background processes
trap "kill $API_PID $ACP_PID; exit" INT TERM
wait
