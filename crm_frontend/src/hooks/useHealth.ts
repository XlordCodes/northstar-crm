import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useHealth() {
    return useQuery({
        queryKey: ['health'],
        queryFn: async (): Promise<string> => {
            try {
                const res = await api.get<{ status: string }>('/ops/ready', {
                    baseURL: api.defaults.baseURL?.replace('/v1/api', '') || 'http://localhost:8000'
                });
                return res.data?.status === 'ready' ? 'up' : 'down';
            } catch (error) {
                return 'down';
            }
        },
        refetchInterval: 30000,
        retry: false,
    });
}
