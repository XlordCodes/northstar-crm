export interface Conversation {
    id: number;
    tenant_id: number | null;
    customer_number: string;
    created_at: string;
    last_message_at: string;
}

export interface ChatMessage {
    id: number;
    conversation_id: number;
    message_id: string | null;
    from_number: string;
    text: string;
    message_type: string;
    language: string;
    intent: string;
    sentiment: string;
    created_at: string;
}

export interface AISuggestion {
    id: number;
    suggestion: string;
    rank: number;
}
