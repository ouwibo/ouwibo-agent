import os
import json
import argparse
from pathlib import Path

def create_skill(name: str):
    """Scaffold a new skill directory with SKILL.md and skill.json."""
    slug = name.lower().replace(" ", "_")
    base_dir = Path(__file__).resolve().parents[1] / "skills" / slug
    
    if base_dir.exists():
        print(f"Error: Skill '{slug}' already exists at {base_dir}")
        return

    os.makedirs(base_dir, exist_ok=True)
    
    # Create skill.json
    manifest = {
        "name": name.title(),
        "description": f"Professional skill for {name}.",
        "version": "1.0.0",
        "author": "Ouwibo Team",
        "tools_required": [],
        "category": "general"
    }
    
    with open(base_dir / "skill.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    # Create SKILL.md
    skill_md = f"""# {name.title()}
> {manifest['description']}

## Goal
Describe what this skill accomplishes.

## Instructions
1. Step one
2. Step two
"""
    with open(base_dir / "SKILL.md", "w") as f:
        f.write(skill_md)

    print(f"✅ Skill '{slug}' scaffolded successfully at {base_dir}")

def main():
    parser = argparse.ArgumentParser(description="Ouwibo Agent CLI Tool")
    subparsers = parser.add_subparsers(dest="command")

    # create-skill command
    create_parser = subparsers.add_parser("create-skill", help="Scaffold a new skill")
    create_parser.add_argument("name", help="Name of the skill")

    args = parser.parse_args()

    if args.command == "create-skill":
        create_skill(args.name)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
