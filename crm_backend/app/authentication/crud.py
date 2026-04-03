# app/authentication/crud.py
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from typing import Optional, List

from .. import models
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


def _resolve_admin_role(db: Session, tenant_id: int) -> models.Role:
    """
    Resolves the 'admin' role for a new workspace using the RoleRepo pattern.

    Lookup order (case-insensitive via RoleRepo.get_by_name):
    1. Global system role (tenant_id=None) — seeded by seed_database.py
    2. Tenant-scoped role — in case a previous provisioning created one
    3. Create a new tenant-scoped admin role as a last resort

    Uses db.flush() instead of db.commit() to stay within the caller's
    atomic transaction boundary.

    Args:
        db: The active SQLAlchemy session (inside an open transaction).
        tenant_id: The ID of the newly created tenant.

    Returns:
        Role: The resolved admin Role object with a valid .id.
    """
    role_repo = RoleRepo(db)

    # 1. Check for a global admin role (tenant_id=NULL, seeded data)
    admin_role = role_repo.get_by_name("admin", tenant_id=None)
    if admin_role:
        return admin_role

    # 2. Check for a tenant-scoped admin role
    admin_role = role_repo.get_by_name("admin", tenant_id=tenant_id)
    if admin_role:
        return admin_role

    # 3. No admin role exists anywhere — create one scoped to this tenant.
    #    Use model + flush (NOT role_repo.create_role which calls commit).
    admin_role = models.Role(
        name="admin",
        tenant_id=tenant_id,
        description="Workspace Administrator",
    )
    db.add(admin_role)
    db.flush()  # Generate admin_role.id without committing
    return admin_role


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

        # Step 2: Resolve the admin role (case-insensitive, repo pattern)
        admin_role = _resolve_admin_role(db, tenant.id)

        # Step 3: Create the User bound to the new tenant with admin role
        user = models.User(
            name=name,
            email=email,
            hashed_password=hashed_password,
            tenant_id=tenant.id,
            role_id=admin_role.id,
        )
        db.add(user)
        db.flush()  # Generate user.id

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
