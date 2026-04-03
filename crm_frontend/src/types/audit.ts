export interface ActivityFeedItem {
    id: number;
    message: string;
    category: string;
    created_at: string;
    user_id?: number | null;
}
