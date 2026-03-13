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
            // Mock API delay for demonstration of skeleton states
            await new Promise(resolve => setTimeout(resolve, 1500));

            try {
                // Attempt actual API call (will fail if backend isn't up, so we fallback)
                const response = await api.get<KPIAnalytics>('/analytics/kpis');
                return response.data;
            } catch (error) {
                // Fallback mock data for UI shell demonstration
                return {
                    sent: 12450,
                    delivered: 12100,
                    read: 8450,
                    failed: 23,
                };
            }
        },
    });
}
