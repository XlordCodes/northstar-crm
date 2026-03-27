export type LeadStatus = "new" | "contacted" | "qualified" | "converted";

export interface LeadOut {
    id: number;
    name: string;
    email: string | null;
    status: LeadStatus;
    created_at: string;
    tenant_id: number;
    owner_id: number;
}

export interface LeadUpdate {
    name?: string;
    email?: string;
    status?: LeadStatus;
}

export interface ContactOut {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    custom_fields: Record<string, any> | null;
    tenant_id: number | null;
    owner_id: number;
    created_at: string;
}

export interface DealOut {
    id: number;
    lead_id: number;
    value_cents: number;
    seller_id: number | null;
    tenant_id: number;
    created_at: string;
}


