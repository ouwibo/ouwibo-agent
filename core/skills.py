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


def _humanize_slug(slug: str) -> str:
    s = (slug or "").strip().replace("_", " ").replace("-", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s.title() if s else "Skill"


def _simplify_title(title: str, slug: str) -> str:
    t = (title or "").strip()
    if not t:
        return _humanize_slug(slug)

    # Remove branding prefix in UI
    for prefix in ("Ouwibo Agent ", "Ouwibo "):
        if t.lower().startswith(prefix.lower()):
            t = t[len(prefix) :].strip()

    low = t.lower()
    if "web3" in low and "crypto" in low:
        return "Web3"
    if "web3" in low:
        return "Web3"
    if "wallet" in low:
        return "Wallet"
    if "social" in low:
        return "Social"
    if "research" in low:
        return "Research"
    if "general" in low:
        return "General"
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

    body = "\n".join(lines[i:]).strip()
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

        meta, body = _split_frontmatter(content)
        title, desc = _parse_title_and_description(body, fallback_title=slug, meta=meta)
        out.append(Skill(slug=slug, title=title, description=desc, content=body))

    return out


def get_skill(slug: str) -> Skill:
    sid = _validate_slug(slug)
    md_path = skills_dir() / sid / "SKILL.md"
    if not md_path.exists():
        raise FileNotFoundError(f"Skill not found: {sid}")
    content = md_path.read_text(encoding="utf-8", errors="replace").strip()
    if not content:
        raise FileNotFoundError(f"Skill has no content: {sid}")
    meta, body = _split_frontmatter(content)
    title, desc = _parse_title_and_description(body, fallback_title=sid, meta=meta)
    return Skill(slug=sid, title=title, description=desc, content=body)
