# app/repos/role_repo.py
"""
Module: Role Repository
Context: Pod B - Module 4 (RBAC & Security)

Responsible for the persistence and retrieval of Role and UserRole entities.
Abstracts raw database queries to ensure consistent access control patterns.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.auth import Role, User

class RoleRepo:
    """
    Repository for managing User Roles and Permissions.
    """
    def __init__(self, db: Session):
        """
        Initialize the repository with a database session.
        
        Args:
            db (Session): The active SQLAlchemy database session.
        """
        self.db = db

    def get_by_name(self, name: str, tenant_id: int | None = None) -> Optional[Role]:
        """
        Retrieves a specific role by its unique name, scoped to a tenant.
        
        Args:
            name (str): The name of the role (e.g., 'admin', 'manager').
            tenant_id (int | None): The tenant ID to scope the search. If None, searches globally (system roles).
            
        Returns:
            Optional[Role]: The Role object if found, otherwise None.
        """
        query = self.db.query(Role).filter(
            func.lower(Role.name) == name.lower()
        )
        if tenant_id is not None:
            query = query.filter(Role.tenant_id == tenant_id)
        return query.first()

    def create_role(self, name: str, tenant_id: int | None = None, description: Optional[str] = None) -> Role:
        """
        Creates a new system role scoped to a tenant.
        
        Args:
            name (str): Unique name for the role.
            tenant_id (int | None): The tenant ID to scope this role to.
            description (Optional[str]): Human-readable description.
            
        Returns:
            Role: The persisted Role object.
        """
        role = Role(name=name, tenant_id=tenant_id, description=description)
        self.db.add(role)
        self.db.commit()
        self.db.refresh(role)
        return role

    def assign_role_to_user(self, user_id: int, role_id: int) -> Optional[User]:
        """
        Assigns a specific role to a user.
        Note: This updates the foreign key on the User table (One-to-Many or Many-to-One).
        
        Args:
            user_id (int): The ID of the target user.
            role_id (int): The ID of the role to assign.
            
        Returns:
            Optional[User]: The updated User object.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if user:
            user.role_id = role_id
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)
        return user

    def get_user_role(self, user_id: int) -> Optional[Role]:
        """
        Fetches the role associated with a specific user.
        
        Args:
            user_id (int): The ID of the user.
            
        Returns:
            Optional[Role]: The Role object associated with the user, or None.
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and user.role:
            return user.role
        return None

    def list_roles(self, tenant_id: int | None = None, skip: int = 0, limit: int = 100) -> List[Role]:
        """
        Lists roles scoped to a specific tenant.
        
        Args:
            tenant_id (int | None): The tenant ID to filter by. If None, returns all roles.
            skip (int): Pagination offset.
            limit (int): Pagination limit.
            
        Returns:
            List[Role]: A list of Role objects.
        """
        query = self.db.query(Role)
        if tenant_id is not None:
            query = query.filter(Role.tenant_id == tenant_id)
        return query.offset(skip).limit(limit).all()