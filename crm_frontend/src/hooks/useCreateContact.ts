import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ContactCreate, ContactOut } from '@/types/crm';

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

interface CreateContactContext {
    previousContacts?: ContactOut[];
}

export function useCreateContact() {
    const queryClient = useQueryClient();

    return useMutation<ContactOut, Error, ContactCreate, CreateContactContext>({
        mutationFn: async (data: ContactCreate): Promise<ContactOut> => {
            const response = await api.post<ContactOut>('/contacts', data);
            return response.data;
        },

        onMutate: async (newContact: ContactCreate): Promise<CreateContactContext> => {
            // Cancel in-flight refetches to avoid overwriting our optimistic update
            await queryClient.cancelQueries({ queryKey: ['contacts'] });

            // Snapshot the current cache for rollback
            const previousContacts = queryClient.getQueryData<ContactOut[]>(['contacts', 0, 50]);

            // Optimistically prepend a placeholder record
            if (previousContacts) {
                const optimistic: ContactOut = {
                    id: -Date.now(), // temporary negative ID
                    name: newContact.name,
                    email: newContact.email ?? null,
                    phone: newContact.phone ?? null,
                    custom_fields: null,
                    tenant_id: null,
                    owner_id: 0,
                    created_at: new Date().toISOString(),
                };
                queryClient.setQueryData<ContactOut[]>(
                    ['contacts', 0, 50],
                    [optimistic, ...previousContacts]
                );
            }

            return { previousContacts };
        },

        onError: (error: Error, _variables: ContactCreate, context: CreateContactContext | undefined) => {
            // Roll back cache on failure
            if (context?.previousContacts) {
                queryClient.setQueryData(['contacts', 0, 50], context.previousContacts);
            }
            toast.error(extractErrorMessage(error));
        },

        onSuccess: () => {
            toast.success('Contact created');
        },

        onSettled: () => {
            // Always refetch to sync with server truth
            queryClient.invalidateQueries({ queryKey: ['contacts'] });
        },
    });
}
