import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { BulkJobResponse } from '@/types/campaigns';

export function useBulkJobs(skip = 0, limit = 50) {
    return useQuery({
        queryKey: ['bulk-jobs', skip, limit],
        queryFn: async (): Promise<BulkJobResponse[]> => {
            const response = await api.get(`/bulk/jobs?skip=${skip}&limit=${limit}`);
            return response.data || [];
        },
        staleTime: 1000 * 60 * 2,
    });
}
