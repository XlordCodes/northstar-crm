import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { User } from '@/contexts/AuthContext'

export const TENANT_USERS_QUERY_KEY = ['tenant-users']

export function useTenantUsers() {
  return useQuery({
    queryKey: TENANT_USERS_QUERY_KEY,
    queryFn: async (): Promise<User[]> => {
      const response = await api.get('/auth/tenant/users')
      return response.data
    },
    staleTime: 60000 // 1 minute cache
  })
}
