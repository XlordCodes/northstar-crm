# app/authentication/crud.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_
from fastapi import HTTPException
from typing import Optional, List

from .. import models
from . import schemas
from . import hashing
from ..repos.role_repo import RoleRepo


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """
    Fetches a single user from the database by their email address.
    """
    return (
        db.query(models.User)
        .options(joinedload(models.User.role))
        .filter(models.User.email == email)
        .first()
    )


def get_all_users(db: Session) -> List[models.User]:
    """
    Fetches all users from the database.
    """
    return db.query(models.User).options(joinedload(models.User.role)).all()


def update_user_profile(db: Session, user_id: int, user_update: schemas.UserUpdate) -> models.User:
    """
    Updates a user's profile information (name and phone number only).
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_update.name is not None:
        user.name = user_update.name
    
    if user_update.phone_number is not None:
        user.phone_number = user_update.phone_number
    
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user_id: int, password_update: schemas.PasswordUpdate) -> None:
    """
    Updates a user's password after verifying current password.
    Raises 400 if current password is invalid.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password matches stored hash
    if not hashing.verify_password(password_update.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Hash and update new password
    user.hashed_password = hashing.hash_password(password_update.new_password)
    db.commit()


def get_roles(db: Session, tenant_id: int) -> list[models.Role]:
    """
    Get all available roles for a tenant.
    Includes both global roles (tenant_id NULL) and tenant-specific roles.
    """
    return db.query(models.Role).filter(or_(models.Role.tenant_id == tenant_id, models.Role.tenant_id.is_(None))).all()


def get_tenant_users(db: Session, tenant_id: int) -> list[models.User]:
    """
    Get all users belonging to a specific tenant.
    """
    return db.query(models.User)\
        .filter(models.User.tenant_id == tenant_id)\
        .options(joinedload(models.User.role))\
        .all()


def invite_user(db: Session, tenant_id: int, invite_data: schemas.UserInvite) -> tuple[models.User, str]:
    """
    Invite a new user to the tenant workspace.
    Generates a secure temporary password.
    Returns (created_user, temporary_password) tuple.
    """
    import secrets
    import string
    
    # Generate secure 12 character temporary password
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    temporary_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    
    hashed_password = hashing.hash_password(temporary_password)
    
    user = models.User(
        name=invite_data.name,
        email=invite_data.email,
        tenant_id=tenant_id,
        role_id=invite_data.role_id,
        hashed_password=hashed_password
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Load role relationship before returning
    db.refresh(user, ['role'])
    
    return user, temporary_password


def create_user(
    db: Session,
    name: str,
    email: str,
    hashed_password: str,
    tenant_id: Optional[int] = None,
    role_id: Optional[int] = None,
) -> models.User:
    """
    Creates a new user instance and adds it to the session.
    Flushes but does NOT commit — caller is responsible for final commit.
    """
    existing_user = get_user_by_email(db, email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered",
        )

    db_user = models.User(
        name=name,
        email=email,
        hashed_password=hashed_password,
        tenant_id=tenant_id,
        role_id=role_id,
    )

    try:
        db.add(db_user)
        db.flush()
        return db_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Database integrity error: email already exists or invalid role/tenant ID provided.",
        )





def register_workspace(
    db: Session,
    name: str,
    email: str,
    hashed_password: str,
    company_name: Optional[str] = None,
) -> models.User:
    """
    Atomic SaaS workspace provisioning:
    1. Creates a new Tenant (workspace)
    2. Dynamically resolves the 'admin' role (case-insensitive, via RoleRepo)
    3. Creates the User bound to the tenant with the admin role

    All operations are wrapped in a single transaction.
    If any step fails, the entire transaction is rolled back.

    Args:
        db: The SQLAlchemy database session.
        name: The user's full name.
        email: The user's email address.
        hashed_password: Pre-hashed password.
        company_name: Optional company/workspace name (defaults to "{name}'s Workspace").

    Returns:
        The newly created User with tenant_id and role_id populated.

    Raises:
        HTTPException: 400 if email already registered.
        HTTPException: 500 on database errors.
    """
    # Check for duplicate email before starting the transaction
    existing_user = get_user_by_email(db, email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        # Step 1: Create the Tenant
        tenant_name = company_name if company_name else f"{name}'s Workspace"
        tenant = models.Tenant(name=tenant_name)
        db.add(tenant)
        db.flush()  # Generate tenant.id

        # Step 2: Explicitly query for admin role using existing repo pattern
        # Dynamically resolve admin role - NEVER hardcode role_id values
        role_repo = RoleRepo(db)
        
        # Lookup hierarchy: global system role first, then tenant-scoped
        admin_role = role_repo.get_by_name("admin", tenant_id=None)
        if not admin_role:
            admin_role = role_repo.get_by_name("admin", tenant_id=tenant.id)
            
        # If no admin role exists, create one scoped to this tenant
        if not admin_role:
            admin_role = models.Role(
                name="admin",
                tenant_id=tenant.id,
                description="Workspace Administrator",
            )
            db.add(admin_role)
            db.flush()  # Generate admin_role.id without committing

        # Step 3: Create the User bound to the new tenant with explicit admin role assignment
        # Use create_user utility for consistent validation and error handling
        user = create_user(
            db=db,
            name=name,
            email=email,
            hashed_password=hashed_password,
            tenant_id=tenant.id,
            role_id=admin_role.id,
        )

        # All operations succeeded — caller commits
        return user

    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to provision workspace. Please try again.",
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Workspace provisioning failed: {str(e)}",
        )
