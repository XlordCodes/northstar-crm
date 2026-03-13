import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { LeadOut } from '@/types/crm';

export function useLeads(skip = 0, limit = 100) {
    return useQuery({
        queryKey: ['leads', skip, limit],
        queryFn: async (): Promise<LeadOut[]> => {
            try {
                const response = await api.get<LeadOut[]>(`/leads/?skip=${skip}&limit=${limit}`);
                return response.data;
            } catch (error) {
                console.error('API failed to fetch leads. Returning mock data.', error);

                // Return 5 dummy leads
                const mockLeads: LeadOut[] = [
                    {
                        id: 1, name: 'Ava Simmons', email: 'ava@example.com', status: 'new', created_at: new Date().toISOString(), tenant_id: 1, owner_id: 1,
                    },
                    {
                        id: 2, name: 'Marcus Chen', email: 'marcus.c@techcorp.com', status: 'contacted', created_at: new Date(Date.now() - 86400000).toISOString(), tenant_id: 1, owner_id: 1,
                    },
                    {
                        id: 3, name: 'Sarah Jenkins', email: 's.jenkins@globex.io', status: 'qualified', created_at: new Date(Date.now() - 172800000).toISOString(), tenant_id: 1, owner_id: 1,
                    },
                    {
                        id: 4, name: 'Elias Thorne', email: 'elias@startup.co', status: 'converted', created_at: new Date(Date.now() - 432000000).toISOString(), tenant_id: 1, owner_id: 1,
                    },
                    {
                        id: 5, name: 'Priya Patel', email: 'priya.patel@design.io', status: 'new', created_at: new Date(Date.now() - 3600000).toISOString(), tenant_id: 1, owner_id: 1,
                    }
                ];

                // Simulate a slight delay to allow the skeleton loader to show during mock flow
                await new Promise(resolve => setTimeout(resolve, 800));
                return mockLeads;
            }
        },
    });
}
