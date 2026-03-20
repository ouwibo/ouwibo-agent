from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=32000)
    session_id: str = Field(..., min_length=1, max_length=64)
    skill: Optional[str] = Field(default=None, min_length=1, max_length=64)

class ToolExecuteRequest(BaseModel):
    tool: str = Field(..., min_length=1, max_length=64)
    arg: str = Field(default="", max_length=4000)

class MessageResponse(BaseModel):
    role: str
    content: str
    time: datetime

class HistoryResponse(BaseModel):
    messages: List[MessageResponse]

class SessionResponse(BaseModel):
    sessions: List[str]

class HealthConfig(BaseModel):
    ai_key_configured: bool
    active_key_index: int
    total_keys: int
    access_token_configured: bool
    search_provider: str

class HealthResponse(BaseModel):
    status: str
    version: str
    database: str
    auth: bool
    ai_client: str
    config: HealthConfig

class ToolInfo(BaseModel):
    name: str
    description: str

class ToolListResponse(BaseModel):
    count: int
    tools: List[ToolInfo]

class SkillInfo(BaseModel):
    id: str
    title: str
    description: str

class SkillListResponse(BaseModel):
    count: int
    skills: List[SkillInfo]

class SkillDetailResponse(SkillInfo):
    content: str

class SkillManifest(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: str = Field(..., max_length=500)
    version: str = Field(default="1.0.0")
    author: Optional[str] = None
    tools_required: List[str] = Field(default_factory=list)
    category: str = Field(default="general")
