import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/lib/api';
import { AISuggestion } from '@/types/chat';

export function useAISuggestions() {
    return useMutation<AISuggestion[], Error, number>({
        mutationFn: async (conversationId: number): Promise<AISuggestion[]> => {
            const response = await api.post<AISuggestion[]>(`/replies/${conversationId}`);
            return response.data || [];
        },
        onError: (error) => {
            if (error instanceof AxiosError && error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error('Failed to generate AI suggestions');
            }
        },
        onSuccess: () => {
            toast.success('AI suggestions generated');
        }
    });
}
