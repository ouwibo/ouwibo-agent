# models.py
import sys
import os
# Force backend and root into path
curr = os.path.dirname(os.path.abspath(__file__)) # /backend/
root = os.path.dirname(curr) # /ouwibo-agent/
for p in [root, curr]:
    if p not in sys.path: sys.path.insert(0, p)

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, String

try:
    from backend.database import Base
except ImportError:
    from database import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True, nullable=False)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(String, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat()
            if self.created_at is not None
            else None,
        }
