import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { DealOut } from '@/types/crm';

export function useDeals() {
    return useQuery({
        queryKey: ['deals'],
        queryFn: async (): Promise<DealOut[]> => {
            const response = await api.get('/deals');
            return response.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
