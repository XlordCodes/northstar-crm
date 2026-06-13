import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { User } from '@/contexts/AuthContext'
import { TENANT_USERS_QUERY_KEY } from './useTenantUsers'

export interface InviteUserData {
  name: string
  email: string
  role_id: number
}

export interface InviteUserResponse {
  user: User
  temporary_password: string
}

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: InviteUserData): Promise<InviteUserResponse> => {
      const response = await api.post('/auth/users/invite', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TENANT_USERS_QUERY_KEY })
    }
  })
}
