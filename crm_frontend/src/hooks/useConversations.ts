import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Conversation } from '@/types/chat';

export function useConversations(skip = 0, limit = 50) {
    return useQuery({
        queryKey: ['conversations', skip, limit],
        queryFn: async (): Promise<Conversation[]> => {
            const response = await api.get(`/chat/conversations?skip=${skip}&limit=${limit}`);
            return response.data || [];
        },
        staleTime: 1000 * 30, // 30 seconds
    });
}
