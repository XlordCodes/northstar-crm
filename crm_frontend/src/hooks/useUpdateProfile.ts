import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'

interface UpdateProfileData {
  name: string
  phone_number?: string | null
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await api.put('/auth/users/me', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
    }
  })
}