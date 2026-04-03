import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ContactOut } from '@/types/crm';

export function useContacts(skip = 0, limit = 50) {
    return useQuery({
        queryKey: ['contacts', skip, limit],
        queryFn: async (): Promise<ContactOut[]> => {
            const response = await api.get(`/contacts?skip=${skip}&limit=${limit}`);
            return response.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
        gcTime: 1000 * 60 * 15, // 15 minutes garbage collection
    });
}
