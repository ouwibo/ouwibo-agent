#!/usr/bin/env bash
set -euo pipefail

# Publish one skill folder to ClawHub using the ClawHub CLI.
#
# Usage:
#   CLAWHUB_TOKEN="..." ./scripts/clawhub_publish.sh skills/general ouwibo-general "Ouwibo: General" 0.1.0
#
# Notes:
# - Token is read from env var to avoid committing secrets.
# - This script uses npx so you don't need a global install.

if [[ $# -lt 4 ]]; then
  echo "Usage: $0 <skill_dir> <slug> <name> <version>"
  exit 2
fi

SKILL_DIR="$1"
SLUG="$2"
NAME="$3"
VERSION="$4"

if [[ -z "${CLAWHUB_TOKEN:-}" ]]; then
  echo "Missing CLAWHUB_TOKEN env var."
  echo "Example:"
  echo "  export CLAWHUB_TOKEN='(your token)'"
  exit 2
fi

if [[ ! -d "$SKILL_DIR" ]]; then
  echo "Skill directory not found: $SKILL_DIR"
  exit 2
fi

if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
  echo "SKILL.md not found in: $SKILL_DIR"
  exit 2
fi

# Login (non-interactive), then publish.
npx -y clawhub@latest login --no-browser --token "$CLAWHUB_TOKEN" --label "ouwibo-agent"
npx -y clawhub@latest publish "$SKILL_DIR" --slug "$SLUG" --name "$NAME" --version "$VERSION"

echo "Published: $SLUG@$VERSION"

