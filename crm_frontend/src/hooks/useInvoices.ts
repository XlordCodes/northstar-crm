import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { InvoiceResponse } from '@/types/finance';

export function useInvoices(skip = 0, limit = 100) {
    return useQuery({
        queryKey: ['invoices', skip, limit],
        queryFn: async (): Promise<InvoiceResponse[]> => {
            const response = await api.get(`/finance/invoices?skip=${skip}&limit=${limit}`);
            return response.data || [];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });
}
