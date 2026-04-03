# app/authentication/schemas.py
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator, computed_field
from datetime import datetime
from typing import Optional
import re

class UserBase(BaseModel):
    """
    Shared properties for user input/output.
    """
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    """
    Payload for registering a new user.
    
    SECURITY: tenant_id and role_id are intentionally excluded from public input
    to prevent IDOR and privilege escalation vulnerabilities. Tenant and role
    assignment is deferred to a secure workspace creation/invitation flow.
    """
    password: str = Field(..., min_length=8)
    company_name: Optional[str] = None

    @field_validator('password')
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        """
        Enforces password complexity requirements:
        - At least one uppercase letter
        - At least one lowercase letter
        - At least one digit
        - At least one special character
        """
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

class User(UserBase):
    """
    Public User profile (excludes password).
    """
    id: int
    created_at: datetime
    tenant_id: Optional[int] = None
    role_id: Optional[int] = None

    @computed_field
    @property
    def role_name(self) -> Optional[str]:
        """Derives the role name from the loaded role relationship."""
        if hasattr(self, 'role') and self.role is not None:
            return self.role.name
        return None

    # Modern Pydantic V2 configuration for ORM compatibility
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    """
    JWT Token response structure.
    """
    access_token: str
    token_type: str

class TokenData(BaseModel):
    """
    Data embedded in the JWT payload.
    """
    email: Optional[str] = None