import { useMutation } from '@tanstack/react-query'
import api from '@/lib/api'

interface UpdatePasswordData {
  current_password: string
  new_password: string
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (data: UpdatePasswordData) => {
      await api.put('/auth/users/password', data)
    }
  })
}