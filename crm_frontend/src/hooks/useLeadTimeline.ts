import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { AuditLogOut } from '@/types/audit';

/**
 * Phase 11: Fetches the audit log timeline for a specific lead.
 * Calls GET /leads/{leadId}/timeline
 *
 * @param leadId - The ID of the lead to fetch timeline for (null disables the query).
 * @param limit  - Maximum number of timeline entries to return.
 */
export function useLeadTimeline(leadId: number | null, limit = 50) {
    return useQuery({
        queryKey: ['leads', leadId, 'timeline'],
        queryFn: async (): Promise<AuditLogOut[]> => {
            const response = await api.get<AuditLogOut[]>(`/leads/${leadId}/timeline`, {
                params: { limit },
            });
            return response.data;
        },
        enabled: !!leadId,
    });
}
