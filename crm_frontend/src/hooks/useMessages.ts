import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ChatMessage } from '@/types/chat';

export function useMessages(conversationId: number | null, limit = 50) {
    return useQuery({
        queryKey: ['messages', conversationId, limit],
        queryFn: async (): Promise<ChatMessage[]> => {
            if (!conversationId) return [];
            const response = await api.get(`/chat/conversations/${conversationId}?limit=${limit}`);
            return response.data || [];
        },
        enabled: !!conversationId,
        staleTime: 1000 * 30, // 30 seconds
    });
}
