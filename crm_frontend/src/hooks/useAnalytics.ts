import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface KPIAnalytics {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
}

export function useAnalytics() {
    return useQuery({
        queryKey: ['analytics', 'kpis'],
        queryFn: async (): Promise<KPIAnalytics> => {
            const response = await api.get<KPIAnalytics>('/analytics/kpis');
            return response.data;
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
    });
}
