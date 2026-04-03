export interface BulkJobResponse {
    id: number;
    tenant_id: number;
    template_name: string;
    language_code: string;
    components: Record<string, unknown>[] | null;
    status: string;
    created_at: string;
}

export interface BulkJobCreate {
    channel: 'whatsapp' | 'email';
    template_name: string;
    language_code?: string;
    numbers: string[];
    emails: string[];
    email_subject?: string;
    email_body?: string;
    scheduled_at?: string;
    components?: Record<string, unknown>[];
    filters?: Array<{
        id: string;
        field: string;
        operator: string;
        value: string;
    }>;
    filter_logic?: 'and' | 'or';
}

export interface BulkMessage {
    id: number;
    to_number: string;
    status: string;
    attempts: number;
    last_error: string | null;
}

export interface BulkJobStatus {
    id: number;
    status: string;
    created_at: string;
    messages: BulkMessage[];
}

export interface EmailPayload {
    to_email: string;
    subject: string;
    template_name: string;
    context?: Record<string, unknown>;
}

export interface EmailResponse {
    status: string;
    job_id: number;
}

export interface SystemQueueTask {
    name: string;
    description: string;
    schedule_seconds: number | null;
    category: string;
}

export interface SystemQueuesResponse {
    tasks: SystemQueueTask[];
}
