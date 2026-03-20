import sys
import os
# Force backend and root into path
curr = os.path.dirname(os.path.abspath(__file__)) # /backend/core/
parent = os.path.dirname(curr) # /backend/
root = os.path.dirname(parent) # /ouwibo-agent/
for p in [root, parent, curr]:
    if p not in sys.path: sys.path.insert(0, p)

import re
import json
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any, cast
from pydantic import BaseModel, Field
try:
    from core import schemas
except ImportError:
    import schemas  # fallback for direct execution in some environments

class Skill(BaseModel):
    slug: str
    manifest: schemas.SkillManifest
    content: str


_SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")


def _repo_root() -> Path:
    # core/skills.py -> core/ -> repo root
    return Path(__file__).resolve().parents[1]


def skills_dir() -> Path:
    return _repo_root() / "skills"


def _validate_slug(slug: str) -> str:
    s = (slug or "").strip().lower()
    if not _SLUG_RE.match(s):
        raise ValueError("Invalid skill id. Use a-z, 0-9, _ or -, max 64 chars.")
    return s


def _humanize_slug(slug: str) -> str:
    s = (slug or "").strip().replace("_", " ").replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s.title() if s else "Skill"


def _simplify_title(title: str, slug: str) -> str:
    t = (title or "").strip()
    if not t:
        return _humanize_slug(slug)
    return t


def _split_frontmatter(md: str) -> tuple[dict[str, str], str]:
    """
    Parse YAML-ish frontmatter at the very top of SKILL.md.

    Supports both:
      - Standard: ---\nkey: value\n---\n
      - Commented: # ---\n# key: value\n# ---\n  (keeps file readable in raw markdown)
    """
    text = md or ""
    lines = text.splitlines()
    if not lines:
        return {}, ""

    def _is_delim(line: str) -> bool:
        s = line.strip()
        return s == "---" or s == "# ---"

    if not _is_delim(lines[0]):
        return {}, text.strip()

    i = 1
    meta: dict[str, str] = {}
    while i < len(lines):
        if _is_delim(lines[i]):
            i += 1
            break
        raw = lines[i].strip()
        if raw.startswith("#"):
            raw = raw.lstrip("#").strip()
        if raw and ":" in raw:
            k, v = raw.split(":", 1)
            key = k.strip().lower()
            val = v.strip().strip('"').strip("'")
            if key and val:
                meta[key] = val
        i += 1

    all_lines: list[str] = list(lines)
    body: str = "\n".join(all_lines[i:]).strip()  # type: ignore
    return meta, body


def _parse_title_and_description(md_body: str, fallback_title: str, meta: dict[str, str] | None = None) -> tuple[str, str]:
    meta = meta or {}
    title = (meta.get("name") or meta.get("title") or "").strip()
    desc = (meta.get("description") or "").strip()

    lines = (md_body or "").splitlines()

    # Title: first "# ..." heading (skip accidental "# ---")
    if not title:
        for line in lines:
            m = re.match(r"^\s*#\s+(.+?)\s*$", line)
            if m:
                cand = m.group(1).strip()
                if cand != "---":
                    title = cand
                    break

    if not title:
        title = fallback_title

    # Description: first non-empty paragraph line after title (if not already set by meta)
    if not desc:
        after_title = False
        for line in lines:
            if not after_title:
                if re.match(r"^\s*#\s+.+\s*$", line):
                    after_title = True
                continue
            s = line.strip()
            if not s:
                continue
            if s.startswith(">"):
                s = s.lstrip(">").strip()
            desc = s
            break

    title = _simplify_title(title, fallback_title)
    desc = (desc or "").strip()
    if len(desc) > 160:
        desc_str: str = cast(str, desc)
        desc = desc_str[:157].rstrip() + "..."  # type: ignore
    return title, desc


def list_skills() -> List[Skill]:
    base = skills_dir()
    if not base.exists():
        return []

    out: List[Skill] = []
    for p in sorted(base.iterdir()):
        if not p.is_dir():
            continue
        
        md_path = p / "SKILL.md"
        json_path = p / "skill.json"
        
        if not md_path.exists():
            continue

        slug = p.name.strip().lower()
        try:
            slug = _validate_slug(slug)
        except ValueError:
            continue

        skill_content = md_path.read_text(encoding="utf-8", errors="replace").strip()
        
        # Load manifest from skill.json or fallback to frontmatter/parsing
        manifest: Optional[schemas.SkillManifest] = None
        if json_path.exists():
            try:
                manifest_data = json.loads(json_path.read_text(encoding="utf-8"))
                manifest = schemas.SkillManifest(**manifest_data)
            except Exception as e:
                # Log error and fallback
                pass
        
        if not manifest:
            meta, body = _split_frontmatter(skill_content)
            title, desc = _parse_title_and_description(body, fallback_title=slug, meta=meta)
            manifest = schemas.SkillManifest(name=title, description=desc)
            skill_body = body
        else:
            _, skill_body = _split_frontmatter(skill_content)

        out.append(Skill(slug=slug, manifest=manifest, content=skill_body))

    return out


def get_skill(slug: str) -> Skill:
    sid = _validate_slug(slug)
    base = skills_dir() / sid
    md_path = base / "SKILL.md"
    json_path = base / "skill.json"

    if not md_path.exists():
        raise FileNotFoundError(f"Skill not found: {sid}")
    
    skill_content = md_path.read_text(encoding="utf-8", errors="replace").strip()
    
    manifest: Optional[schemas.SkillManifest] = None
    if json_path.exists():
        try:
            manifest_data = json.loads(json_path.read_text(encoding="utf-8"))
            manifest = schemas.SkillManifest(**manifest_data)
        except Exception:
            pass

    if not manifest:
        meta, body = _split_frontmatter(skill_content)
        title, desc = _parse_title_and_description(body, fallback_title=sid, meta=meta)
        manifest = schemas.SkillManifest(name=title, description=desc)
        skill_body = body
    else:
        _, skill_body = _split_frontmatter(skill_content)

    return Skill(slug=sid, manifest=manifest, content=skill_body)
