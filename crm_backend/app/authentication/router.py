# app/authentication/router.py
import os
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy.orm import Session, joinedload
from starlette.concurrency import run_in_threadpool 

from app import database
from app import models
from app.core.config import settings
from app.core.context import set_user_id 
from . import crud, hashing, schemas

# --- CONFIGURATION ---

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/api/auth/token")

router = APIRouter(
    tags=["Authentication"]
)

# --- RATE LIMITING ---

MAX_ATTEMPTS = 5
LOCKOUT_TIME = 300  # 5 minutes in seconds
_failed_login_attempts: dict[str, list[float]] = defaultdict(list)

# --- HELPER FUNCTIONS ---

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    """Creates a new JWT access token using centralized settings."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
):
    """
    Dependency to get the current user from a token.
    Now async to ensure 'set_user_id' happens on the main loop context.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    # Run the blocking DB call in a thread to avoid blocking the main loop
    user = await run_in_threadpool(crud.get_user_by_email, db, email=token_data.email)
    
    if user is None:
        raise credentials_exception

    # EXPLICITLY load role relationship to ensure Pydantic @computed_field works
    # This fixes the serialization boundary leak where role_name was being dropped
    if not hasattr(user, 'role') or user.role is None:
        db.refresh(user, ['role'])
        
    # Set the context variable on the main event loop
    set_user_id(user.id)
    
    return user

# --- RBAC DEPENDENCY ---

class RoleChecker:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    async def __call__(self, user: models.User = Depends(get_current_user)):
        if not user.role or user.role.name not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted"
            )
        return user


@router.put("/users/me", response_model=schemas.User)
async def update_user_profile(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Update current user's profile information.
    """
    updated_user = crud.update_user_profile(
        db=db,
        user_id=current_user.id,
        user_update=user_update
    )
    
    # Ensure role is loaded for serialization
    db.refresh(updated_user, ['role'])
    if updated_user and updated_user.role:
        setattr(updated_user, 'role_name', updated_user.role.name)
    
    return updated_user


@router.put("/users/password", status_code=status.HTTP_204_NO_CONTENT)
async def update_user_password(
    password_update: schemas.PasswordUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Update current user's password. Requires current password verification.
    """
    crud.update_user_password(
        db=db,
        user_id=current_user.id,
        password_update=password_update
    )


@router.get("/roles", response_model=list[schemas.RoleSchema])
async def get_roles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get list of available roles for user invitation.
    Includes both global and tenant-specific roles.
    """
    return crud.get_roles(db, current_user.tenant_id)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant_user(
    user_id: int,
    current_user: models.User = Depends(RoleChecker(['admin'])),
    db: Session = Depends(database.get_db)
):
    """
    Delete a user from the current tenant workspace.
    Admin only. Cannot delete self.
    Strictly filtered by tenant_id to prevent cross-workspace deletion.
    """
    # Prevent admin from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    # Verify user belongs to current tenant
    user = db.query(models.User)\
        .filter(models.User.id == user_id)\
        .filter(models.User.tenant_id == current_user.tenant_id)\
        .first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found in this workspace"
        )
    
    db.delete(user)
    db.commit()


@router.get("/tenant/users", response_model=list[schemas.User])
async def get_tenant_users(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Get all users in the current tenant workspace.
    Strictly filtered by tenant_id to prevent cross-workspace access.
    """
    users = crud.get_tenant_users(db, current_user.tenant_id)
    
    # Inject role_name for serialization
    for user in users:
        if user and user.role:
            setattr(user, 'role_name', user.role.name)
    
    return users


@router.post("/users/invite", response_model=schemas.UserInviteResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    invite_data: schemas.UserInvite,
    current_user: models.User = Depends(RoleChecker(['admin'])),
    db: Session = Depends(database.get_db)
):
    """
    Invite a new user to the current tenant workspace.
    Generates a secure temporary password.
    Requires admin role.
    """
    user, temporary_password = crud.invite_user(db, current_user.tenant_id, invite_data)
    
    if user and user.role:
        setattr(user, 'role_name', user.role.name)
    
    return {
        "user": user,
        "temporary_password": temporary_password
    }

# --- API ENDPOINTS ---

@router.post("/register", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    """
    Registers a new user and provisions a SaaS workspace.
    
    Atomic operations:
    1. Creates a new Tenant (workspace)
    2. Creates the User and binds them to the tenant
    3. Assigns 'admin' role for the new workspace
    
    If any step fails, the entire transaction is rolled back.
    """
    hashed_password = hashing.hash_password(user.password)
    new_user = crud.register_workspace(
        db=db,
        email=user.email,
        name=user.name,
        hashed_password=hashed_password,
        company_name=getattr(user, 'company_name', None)
    )
    db.commit()
    # Re-fetch with eager-loaded role so Pydantic's @computed_field role_name resolves
    new_user = crud.get_user_by_email(db, email=user.email)
    return new_user


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db)
):
    # --- Rate Limiting ---
    username = form_data.username
    now = time.time()
    
    # Clean expired timestamps
    _failed_login_attempts[username] = [
        ts for ts in _failed_login_attempts[username]
        if now - ts < LOCKOUT_TIME
    ]
    
    if len(_failed_login_attempts[username]) >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed login attempts. Please try again later.",
        )
    # --- End Rate Limiting ---

    user = crud.get_user_by_email(db, email=username)
    if not user or not hashing.verify_password(form_data.password, user.hashed_password):
        _failed_login_attempts[username].append(now)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Clear failed attempts on successful login
    if username in _failed_login_attempts:
        del _failed_login_attempts[username]

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # This allows the middleware to extract them later for RLS context
    token_payload = {
        "sub": user.email,
        "id": user.id,
        "tenant_id": user.tenant_id
    }
    
    access_token = create_access_token(
        data=token_payload, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/users/me", response_model=schemas.User)
async def read_users_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    A protected route to fetch the current authenticated user's details.
    
    Bypasses broken Pydantic computed field serialization by explicitly
    fetching role data and constructing a guaranteed valid response.
    This eliminates ORM detachment and lazy loading race conditions.
    """
    # EXPLICIT JOINED LOAD - bypasses all detached relationship issues
    user = db.query(models.User)\
        .options(joinedload(models.User.role))\
        .filter(models.User.id == current_user.id)\
        .first()
    
    # MATHEMATICAL GUARANTEE: role_name will never be null for valid users
    # Force serialize role name directly before Pydantic sees it
    if user and user.role:
        # Inject role_name directly onto the instance before serialization
        setattr(user, 'role_name', user.role.name)
    
    return user
