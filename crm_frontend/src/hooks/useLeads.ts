import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { LeadOut } from '@/types/crm';

export function useLeads(skip = 0, limit = 100) {
    return useQuery({
        queryKey: ['leads', skip, limit],
        queryFn: async (): Promise<LeadOut[]> => {
            const response = await api.get<LeadOut[]>(`/leads/?skip=${skip}&limit=${limit}`);
            return response.data || [];
        },
        staleTime: 1000 * 60 * 2, // 2 minutes - leads change frequently
        gcTime: 1000 * 60 * 10, // 10 minutes garbage collection
    });
}
