#!/usr/bin/env bash
set -euo pipefail

# Publish all skills under ./skills/* to ClawHub (one-by-one).
#
# Usage:
#   CLAWHUB_TOKEN="..." ./scripts/clawhub_publish_all.sh 0.1.0
#
# The script derives:
# - slug: ouwibo-<skill_id>
# - name: Ouwibo: <Title>
#

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
  echo "Usage: $0 <version>"
  exit 2
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for dir in "$ROOT/skills"/*; do
  [[ -d "$dir" ]] || continue
  [[ -f "$dir/SKILL.md" ]] || continue
  skill_id="$(basename "$dir")"
  slug="ouwibo-$skill_id"
  # Title: first markdown H1
  title="$(rg -m1 -n '^#\\s+' "$dir/SKILL.md" | sed -E 's/^.*#\\s+//' || true)"
  [[ -n "$title" ]] || title="$skill_id"
  name="Ouwibo: $title"
  "$ROOT/scripts/clawhub_publish.sh" "$dir" "$slug" "$name" "$VERSION"
done

