import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { TENANT_USERS_QUERY_KEY } from './useTenantUsers'

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: number): Promise<void> => {
      await api.delete(`/auth/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY })
    }
  })
}
