import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ProductResponse } from '@/types/inventory';

export function useProducts(skip = 0, limit = 100) {
    return useQuery({
        queryKey: ['products', skip, limit],
        queryFn: async (): Promise<ProductResponse[]> => {
            const response = await api.get(`/inventory/products?skip=${skip}&limit=${limit}`);
            return response.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
