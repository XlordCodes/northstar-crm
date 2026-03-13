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
