import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DASHBOARD_KPI_QUERY_KEY } from './useDashboardKPIs';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/lib/api';
import { LeadCreate, LeadOut } from '@/types/crm';

interface ApiErrorResponse {
    detail: string | Array<{ msg: string }>;
}

function extractErrorMessage(error: unknown): string {
    if (error instanceof AxiosError && error.response?.data) {
        const data = error.response.data as ApiErrorResponse;
        if (typeof data.detail === 'string') {
            return data.detail;
        }
        if (Array.isArray(data.detail)) {
            return data.detail.map(d => d.msg).join(', ');
        }
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Unexpected error';
}

interface CreateLeadContext {
    previousLeads?: LeadOut[];
}

export function useCreateLead() {
    const queryClient = useQueryClient();

    return useMutation<LeadOut, Error, LeadCreate, CreateLeadContext>({
        mutationFn: async (data: LeadCreate): Promise<LeadOut> => {
            const response = await api.post<LeadOut>('/leads/', data);
            return response.data;
        },

        onMutate: async (newLead: LeadCreate): Promise<CreateLeadContext> => {
            await queryClient.cancelQueries({ queryKey: ['leads'] });

            const previousLeads = queryClient.getQueryData<LeadOut[]>(['leads', 0, 100]);

            if (previousLeads) {
                const optimistic: LeadOut = {
                    id: -Date.now(),
                    name: newLead.name,
                    email: newLead.email ?? null,
                    phone: newLead.phone ?? null,
                    status: 'new',
                    created_at: new Date().toISOString(),
                    tenant_id: 0,
                    owner_id: 0,
                };
                queryClient.setQueryData<LeadOut[]>(
                    ['leads', 0, 100],
                    [optimistic, ...previousLeads]
                );
            }

            return { previousLeads };
        },

        onError: (error: Error, _variables: LeadCreate, context: CreateLeadContext | undefined) => {
            if (context?.previousLeads) {
                queryClient.setQueryData(['leads', 0, 100], context.previousLeads);
            }
            toast.error(extractErrorMessage(error));
        },

        onSuccess: () => {
            toast.success('Lead created');
            // Invalidate dashboard KPIs to reflect new lead/deal counts
            queryClient.invalidateQueries({ queryKey: DASHBOARD_KPI_QUERY_KEY });
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['deals'] });
        },
    });
}
