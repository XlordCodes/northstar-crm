import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/lib/api';
import { InvoiceCreate, InvoiceResponse } from '@/types/finance';

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

interface InvoiceContext {
    previousInvoices: InvoiceResponse[] | undefined;
}

export function useCreateInvoice() {
    const queryClient = useQueryClient();

    return useMutation<InvoiceResponse, Error, InvoiceCreate, InvoiceContext>({
        mutationFn: async (data: InvoiceCreate): Promise<InvoiceResponse> => {
            const response = await api.post<InvoiceResponse>('/finance/invoices', data);
            return response.data;
        },

        onMutate: async (newInvoice) => {
            await queryClient.cancelQueries({ queryKey: ['invoices'] });

            const previousInvoices = queryClient.getQueryData<InvoiceResponse[]>(['invoices', 0, 100]);

            if (previousInvoices) {
                // Calculate total to optimistically display
                const total = newInvoice.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
                
                const optimistic: InvoiceResponse = {
                    id: -Date.now(),
                    tenant_id: 0,
                    contact_id: newInvoice.contact_id,
                    total_amount: total,
                    currency: newInvoice.currency || 'USD',
                    status: 'draft',
                    due_date: newInvoice.due_date || null,
                    created_at: new Date().toISOString(),
                    updated_at: null,
                    items: newInvoice.items.map((item, i) => ({
                        id: -(Date.now() + i),
                        invoice_id: -Date.now(),
                        description: item.description,
                        quantity: item.quantity,
                        unit_price: item.unit_price
                    })),
                    payments: []
                };
                queryClient.setQueryData<InvoiceResponse[]>(
                    ['invoices', 0, 100],
                    [optimistic, ...previousInvoices]
                );
            }

            return { previousInvoices };
        },

        onError: (error, _variables, context) => {
            if (context?.previousInvoices) {
                queryClient.setQueryData(['invoices', 0, 100], context.previousInvoices);
            }
            toast.error(extractErrorMessage(error));
        },

        onSuccess: () => {
            toast.success('Invoice created');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
        },
    });
}
