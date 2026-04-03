import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DealOut } from '@/types/crm';

export function useDeals(skip = 0, limit = 50) {
    return useQuery({
        queryKey: ['deals', skip, limit],
        queryFn: async (): Promise<DealOut[]> => {
            const response = await api.get(`/deals/?skip=${skip}&limit=${limit}`);
            return response.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
    });
}
