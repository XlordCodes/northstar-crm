import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { LeadCreate } from '@/types/crm';

export function useBulkImportLeads() {
    const queryClient = useQueryClient();

    return useMutation<{ status: string; imported_count: number }, Error, { leads: LeadCreate[] }>({
        mutationFn: async (payload) => {
            const response = await api.post('/leads/bulk-import', payload);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success(`Successfully imported ${data.imported_count} leads`);
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to import leads');
        }
    });
}
