import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';

interface SummaryResponse {
    conversation_id: number;
    summary: string;
}

export function useAiSummary() {
    return useMutation<SummaryResponse, Error, number>({
        mutationFn: async (convoId: number): Promise<SummaryResponse> => {
            const response = await api.get<SummaryResponse>(`/vector/summarize/${convoId}`);
            return response.data;
        }
    });
}
