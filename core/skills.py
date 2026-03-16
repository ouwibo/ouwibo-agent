# core/skills.py
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Skill:
    slug: str
    title: str
    description: str
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


def _parse_title_and_description(md: str, fallback_title: str) -> tuple[str, str]:
    title = ""
    desc = ""
    lines = (md or "").splitlines()

    # Title: first "# ..." heading
    for line in lines:
        m = re.match(r"^\s*#\s+(.+?)\s*$", line)
        if m:
            title = m.group(1).strip()
            break

    if not title:
        title = fallback_title

    # Description: first non-empty paragraph line after title
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
            # Allow blockquote description as well.
            s = s.lstrip(">").strip()
        desc = s
        break

    desc = (desc or "").strip()
    if len(desc) > 160:
        desc = desc[:157].rstrip() + "..."
    return title, desc


def list_skills() -> list[Skill]:
    base = skills_dir()
    if not base.exists():
        return []

    out: list[Skill] = []
    for p in sorted(base.iterdir()):
        if not p.is_dir():
            continue
        md_path = p / "SKILL.md"
        if not md_path.exists():
            continue

        slug = p.name.strip().lower()
        try:
            slug = _validate_slug(slug)
        except ValueError:
            # Skip folders that aren't valid skill ids.
            continue

        content = md_path.read_text(encoding="utf-8", errors="replace").strip()
        if not content:
            continue

        title, desc = _parse_title_and_description(content, fallback_title=slug)
        out.append(Skill(slug=slug, title=title, description=desc, content=content))

    return out


def get_skill(slug: str) -> Skill:
    sid = _validate_slug(slug)
    md_path = skills_dir() / sid / "SKILL.md"
    if not md_path.exists():
        raise FileNotFoundError(f"Skill not found: {sid}")
    content = md_path.read_text(encoding="utf-8", errors="replace").strip()
    if not content:
        raise FileNotFoundError(f"Skill has no content: {sid}")
    title, desc = _parse_title_and_description(content, fallback_title=sid)
    return Skill(slug=sid, title=title, description=desc, content=content)

