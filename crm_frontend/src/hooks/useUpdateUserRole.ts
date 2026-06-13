import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { TENANT_USERS_QUERY_KEY } from './useTenantUsers'

export interface UpdateUserRoleData {
  user_id: number
  role_name: string
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateUserRoleData) => {
      const response = await api.post(`/roles/users/${data.user_id}/assign`, { role_name: data.role_name })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY })
    }
  })
}
