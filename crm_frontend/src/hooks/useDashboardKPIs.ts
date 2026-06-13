import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export const DASHBOARD_KPI_QUERY_KEY = ['dashboardKPIs']

export interface DashboardKPIs {
  total_contacts: number
  total_users: number
  total_deals: number
  active_deals: number
  total_revenue_cents: number
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: DASHBOARD_KPI_QUERY_KEY,
    queryFn: async (): Promise<DashboardKPIs> => {
      const response = await api.get('/analytics/dashboard/kpis')
      return response.data
    },
    staleTime: 60000, // 1 minute cache
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: 5000,
  })
}
