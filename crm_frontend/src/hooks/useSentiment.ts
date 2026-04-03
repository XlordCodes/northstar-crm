import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ChatMessage } from '@/types/chat';

interface SentimentResponse {
    message_id: number;
    sentiment: string;
}

export function useSentiment() {
    const queryClient = useQueryClient();

    return useMutation<SentimentResponse, Error, { messageId: number; convoId: number }>({
        mutationFn: async ({ messageId }): Promise<SentimentResponse> => {
            const response = await api.post<SentimentResponse>(`/ai/sentiment/${messageId}`);
            return response.data;
        },
        onSuccess: (data, { convoId }) => {
            queryClient.setQueryData<ChatMessage[]>(['messages', convoId], (oldData) => {
                if (!oldData) return [];
                return oldData.map(msg => 
                    msg.id === data.message_id 
                        ? { ...msg, sentiment: data.sentiment } 
                        : msg
                );
            });
        }
    });
}
