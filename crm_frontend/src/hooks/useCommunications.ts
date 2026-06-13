import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export function useLeadMessages(phoneNumber: string | null) {
  return useQuery({
    queryKey: ['messages', phoneNumber],
    queryFn: async () => {
      if (!phoneNumber) return [];
      const { data } = await api.get(`/messages?from_number=${encodeURIComponent(phoneNumber)}`);
      return data;
    },
    enabled: !!phoneNumber,
  });
}

export function useSendWhatsApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ to_number, message }: { to_number: string; message: string }) => {
      const { data } = await api.post('/whatsapp/send-text', {
        to_number,
        message,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate the specific conversation
      queryClient.invalidateQueries({ queryKey: ['messages', variables.to_number] });
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: async ({ to_email, subject, body_html }: { to_email: string; subject: string; body_html: string }) => {
      const { data } = await api.post('/send-email', {
        to_email,
        subject,
        template_name: 'custom',
        context: { body: body_html },
      });
      return data;
    },
  });
}
