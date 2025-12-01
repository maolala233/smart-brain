from pydantic import BaseModel
from typing import Optional, Dict, Any

# --- Request Schemas (请求参数) ---

class UserCreate(BaseModel):
    name: str
    role: str
    domain: str

class LogicTestSubmit(BaseModel):
    score: int
    answers: Dict[int, int]

# --- Response Schemas (返回结果) ---

class PersonaResponse(BaseModel):
    base_logic_type: Optional[str] = None
    extracted_positive_logic: Optional[str] = None
    extracted_tone_style: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    name: str
    role: str
    domain: str
    persona: Optional[PersonaResponse] = None

    class Config:
        from_attributes = True