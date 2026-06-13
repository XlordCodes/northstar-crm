import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { LeadOut } from '@/types/crm';
import { toast } from 'sonner';

export function useLeads(skip = 0, limit = 100, statuses?: string[], ownerId?: number, createdAfter?: string) {
    return useQuery({
        queryKey: ['leads', skip, limit, statuses, ownerId, createdAfter],
        queryFn: async (): Promise<LeadOut[]> => {
            const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
            if (statuses && statuses.length > 0) {
                statuses.forEach(status => params.append('statuses', status));
            }
            if (ownerId !== undefined) {
                params.append('owner_id', ownerId.toString());
            }
            if (createdAfter) {
                params.append('created_after', createdAfter);
            }
            const response = await api.get<LeadOut[]>(`/leads/?${params.toString()}`);
            return response.data || [];
        },
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
    });
}

export function useBulkDeleteLeads() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (leadIds: number[]) => {
            const response = await api.post('/leads/bulk-delete', { lead_ids: leadIds });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success('Leads deleted successfully');
        },
        onError: () => {
            toast.error('Failed to delete leads');
        }
    });
}

export function useBulkUpdateLeads() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { leadIds: number[], updates: Partial<LeadOut> }) => {
            const response = await api.patch('/leads/bulk-update', { lead_ids: data.leadIds, updates: data.updates });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success('Leads updated successfully');
        },
        onError: () => {
            toast.error('Failed to update leads');
        }
    });
}
