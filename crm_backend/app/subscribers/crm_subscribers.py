# app/subscribers/crm_subscribers.py
"""
Module: CRM Subscribers
Context: Pod B - Module 7 (Async Workflows) / Phase 11

Contains event handlers for CRM-related domain events.
Listens for DealCreated events and records audit trail entries
for the lead-to-deal conversion workflow.
"""

import logging
from app.core.event_bus import EventBus
from app.events.crm_events import DealCreated
from app.database import SessionLocal
from app.services.audit_service import AuditService

# Setup Logging
logger = logging.getLogger("CRMSubscribers")


async def handle_deal_created(event: DealCreated) -> None:
    """
    Handler for DealCreated events.

    Records an audit log entry when a lead is converted to a deal.
    Uses its own DB session since this runs asynchronously outside
    the original request lifecycle.
    """
    db = SessionLocal()
    try:
        audit_service = AuditService(db)

        audit_service.log_event(
            actor_id=event.seller_id,
            entity="Lead",
            entity_id=event.lead_id,
            action="convert",
            changes={
                "deal_id": event.deal_id,
                "value_cents": event.value_cents,
                "currency": event.currency,
            },
            tenant_id=event.tenant_id,
        )

        # Phase 12: Post to global activity feed
        if event.seller_id:
            value_dollars = event.value_cents / 100
            audit_service.post_activity(
                user_id=event.seller_id,
                message=f"Converted lead to deal valued at ${value_dollars:,.2f}",
                category="convert",
            )

        db.commit()
        logger.info(
            f"📝 [AUDIT] Lead {event.lead_id} converted to Deal {event.deal_id} "
            f"(value: {event.value_cents} {event.currency})"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"❌ Failed to write audit log for DealCreated: {e}", exc_info=True)
    finally:
        db.close()


def setup_crm_subscribers(bus: EventBus) -> None:
    """
    Registration function to wire CRM events to handlers.
    Called during application startup in main.py.
    """
    bus.subscribe(DealCreated, handle_deal_created)
