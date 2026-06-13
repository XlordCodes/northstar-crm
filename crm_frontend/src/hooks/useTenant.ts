import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export function useTenant(tenantId: number | null) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      if (!tenantId) return null
      const response = await api.get(`/tenants/${tenantId}`)
      return response.data
    },
    enabled: !!tenantId,
    retry: false
  })
}
