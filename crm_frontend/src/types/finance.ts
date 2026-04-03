export interface InvoiceItemCreate {
    description: string;
    quantity: number;
    unit_price: number;
}

export interface InvoiceCreate {
    contact_id: number;
    currency?: string;
    due_date?: string;
    items: InvoiceItemCreate[];
}

export interface InvoiceItemResponse {
    id: number;
    invoice_id: number;
    description: string;
    quantity: number;
    unit_price: number;
}

export interface PaymentResponse {
    id: number;
    invoice_id: number;
    amount: number;
    method: string;
    reference_id: string | null;
    payment_date: string;
    tenant_id: number;
}

export interface InvoiceResponse {
    id: number;
    tenant_id: number;
    contact_id: number;
    total_amount: number;
    currency: string;
    status: string;
    due_date: string | null;
    created_at: string;
    updated_at: string | null;
    items: InvoiceItemResponse[];
    payments: PaymentResponse[];
}
