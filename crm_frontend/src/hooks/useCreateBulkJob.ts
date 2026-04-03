import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { toast } from 'sonner';
import api from '@/lib/api';
import { BulkJobCreate, BulkJobResponse } from '@/types/campaigns';

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

export function useCreateBulkJob() {
    const queryClient = useQueryClient();

    return useMutation<BulkJobResponse, Error, BulkJobCreate>({
        mutationFn: async (data: BulkJobCreate): Promise<BulkJobResponse> => {
            const response = await api.post<BulkJobResponse>('/bulk/jobs', data);
            return response.data;
        },

        onError: (error) => {
            toast.error(extractErrorMessage(error));
        },

        onSuccess: () => {
            toast.success('Campaign created');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['bulk-jobs'] });
        },
    });
}
