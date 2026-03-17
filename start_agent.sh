#!/bin/bash
# start_agent.sh - Helper script to start Ouwibo Agent ACP Service
echo "🚀 Starting Ouwibo Agent ACP Service..."
cd virtuals-protocol-acp
npx tsx bin/acp.ts serve start
