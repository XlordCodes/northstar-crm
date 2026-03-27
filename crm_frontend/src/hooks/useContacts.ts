import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ContactOut } from '@/types/crm';

export function useContacts() {
    return useQuery({
        queryKey: ['contacts'],
        queryFn: async (): Promise<ContactOut[]> => {
            const response = await api.get('/contacts');
            return response.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
