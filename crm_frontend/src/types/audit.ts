export interface ActivityFeedItem {
    id: number;
    message: string;
    category: string;
    created_at: string;
    user_id?: number | null;
    user?: AuditActor | null;
}

// Phase 11: Matches the backend AuditLogOut Pydantic schema
export interface AuditActor {
    id: number;
    email: string;
}

export interface AuditLogOut {
    id: number;
    action: string;
    entity: string;
    entity_id: number | null;
    changes: Record<string, unknown> | null;
    meta: Record<string, unknown> | null;
    actor_id: number | null;
    actor: AuditActor | null;
    created_at: string;
}
