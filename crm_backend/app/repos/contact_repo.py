# app/repos/contact_repo.py
"""
Module: Contact Repository
Context: Pod A - Data Access Layer

Handles persistence for Contact entities.
Wraps raw DB operations to ensure consistent access control patterns.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.crm import Contact
from app.schemas.crm import ContactCreate, ContactUpdate


class ContactRepo:
    def __init__(self, db: Session):
        self.db = db

    def create(self, tenant_id: int, owner_id: int, data: ContactCreate) -> Contact:
        """Creates a new contact."""
        contact = Contact(
            tenant_id=tenant_id,
            owner_id=owner_id,
            name=data.name,
            email=data.email,
            phone=data.phone,
            custom_fields=data.custom_fields or {}
        )
        self.db.add(contact)
        self.db.flush()
        return contact

    def get(self, tenant_id: int, contact_id: int) -> Optional[Contact]:
        """Fetches a single contact by ID, scoped to tenant."""
        return self.db.query(Contact).filter(
            Contact.id == contact_id,
            Contact.tenant_id == tenant_id
        ).first()

    def list_all(self, tenant_id: int, owner_id: int, skip: int = 0, limit: int = 100) -> List[Contact]:
        """Lists contacts for a tenant, scoped to owner."""
        return (
            self.db.query(Contact)
            .filter(Contact.tenant_id == tenant_id, Contact.owner_id == owner_id)
            .order_by(Contact.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update(self, contact: Contact, data: ContactUpdate) -> Contact:
        """Updates a contact in-place."""
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(contact, key, value)
        self.db.flush()
        return contact

    def delete(self, contact: Contact):
        """Deletes a contact."""
        self.db.delete(contact)
        self.db.flush()
