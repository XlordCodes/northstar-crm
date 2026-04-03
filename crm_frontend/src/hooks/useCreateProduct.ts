import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/lib/api';
import { ProductCreate, ProductResponse } from '@/types/inventory';

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

interface ProductContext {
    previousProducts: ProductResponse[] | undefined;
}

export function useCreateProduct() {
    const queryClient = useQueryClient();

    return useMutation<ProductResponse, Error, ProductCreate, ProductContext>({
        mutationFn: async (data: ProductCreate): Promise<ProductResponse> => {
            const response = await api.post<ProductResponse>('/inventory/products', data);
            return response.data;
        },

        onMutate: async (newProduct) => {
            await queryClient.cancelQueries({ queryKey: ['products'] });

            const previousProducts = queryClient.getQueryData<ProductResponse[]>(['products', 0, 100]);

            if (previousProducts) {
                const optimistic: ProductResponse = {
                    id: -Date.now(),
                    tenant_id: 0,
                    sku: newProduct.sku,
                    name: newProduct.name,
                    description: newProduct.description ?? null,
                    price: newProduct.price,
                    reorder_point: newProduct.reorder_point ?? 10,
                    stock: 0, // Freshly created products have 0 stock
                    created_at: new Date().toISOString(),
                };
                queryClient.setQueryData<ProductResponse[]>(
                    ['products', 0, 100],
                    [optimistic, ...previousProducts]
                );
            }

            return { previousProducts };
        },

        onError: (error, _variables, context) => {
            if (context?.previousProducts) {
                queryClient.setQueryData(['products', 0, 100], context.previousProducts);
            }
            toast.error(extractErrorMessage(error));
        },

        onSuccess: () => {
            toast.success('Product created');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] });
        },
    });
}
