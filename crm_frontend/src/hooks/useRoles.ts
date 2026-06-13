import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export interface Role {
  id: number
  name: string
  description?: string
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      const response = await api.get('/auth/roles')
      return response.data
    },
    staleTime: 300000 // 5 minutes cache
  })
}
