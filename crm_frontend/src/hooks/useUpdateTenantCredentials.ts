import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface TenantCredentialsUpdate {
  resend_api_key?: string
  wa_access_token?: string
  wa_phone_number_id?: string
  wa_business_account_id?: string
}

export function useUpdateTenantCredentials() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: number; data: TenantCredentialsUpdate }) => {
      const response = await api.patch(`/tenants/${tenantId}/credentials`, data)
      return response.data
    },
    onSuccess: () => {
      // Invalidate the current user so they pull fresh tenant data if embedded,
      // or invalidate specifically a 'tenant' query if it exists.
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      queryClient.invalidateQueries({ queryKey: ['tenant'] })
    }
  })
}
