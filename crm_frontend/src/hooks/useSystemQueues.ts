import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { SystemQueueTask } from '@/types/campaigns';

export function useSystemQueues() {
    return useQuery({
        queryKey: ['system-queues'],
        queryFn: async (): Promise<SystemQueueTask[]> => {
            const response = await api.get('/status/queues');
            return response.data?.tasks || [];
        },
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
    });
}
