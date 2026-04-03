import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ActivityFeedItem } from '@/types/audit';

export function useAuditFeed(limit = 10) {
    return useQuery({
        queryKey: ['audit', 'activity', limit],
        queryFn: async (): Promise<ActivityFeedItem[]> => {
            const response = await api.get<ActivityFeedItem[]>('/audit/activity', {
                params: { limit }
            });
            return response.data;
        },
    });
}
