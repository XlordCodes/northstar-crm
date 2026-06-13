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
    role_name: Optional[str] = None
    phone_number: Optional[str] = None

    # Modern Pydantic V2 configuration for ORM compatibility
    model_config = ConfigDict(
        from_attributes=True,
        extra='allow'
    )


class UserUpdate(BaseModel):
    """
    Payload for updating user profile information.
    Email is intentionally excluded to prevent unauthorized changes.
    """
    name: Optional[str] = None
    phone_number: Optional[str] = None


class PasswordUpdate(BaseModel):
    """
    Payload for updating user password.
    """
    current_password: str
    new_password: str

    @field_validator('new_password')
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
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class Token(BaseModel):
    """
    JWT Token response structure.
    """
    access_token: str
    token_type: str

class RoleSchema(BaseModel):
    """
    Role selection data for user invitation forms.
    """
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserInvite(BaseModel):
    """
    Payload for inviting a new user to the workspace.
    """
    name: str
    email: EmailStr
    role_id: int


class UserInviteResponse(BaseModel):
    """
    Response containing created user and temporary password.
    """
    user: User
    temporary_password: str


class TokenData(BaseModel):
    """
    Data embedded in the JWT payload.
    """
    email: Optional[str] = None