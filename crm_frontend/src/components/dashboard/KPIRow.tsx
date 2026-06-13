import { useDashboardKPIs } from '@/hooks/useDashboardKPIs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, User, TrendingUp, DollarSign } from 'lucide-react';

export function KPIRow() {
    const { data, isLoading } = useDashboardKPIs();

    const metrics = [
        { title: 'Total Contacts', value: data?.total_contacts, icon: Users },
        { title: 'Team Members', value: data?.total_users, icon: User },
        { title: 'Active Deals', value: data?.active_deals, icon: TrendingUp },
        { title: 'Revenue', value: data?.total_revenue_cents ? `$${(data.total_revenue_cents / 100).toLocaleString()}` : '$0', icon: DollarSign },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="border-none shadow-[0_2px_15px_rgba(0,0,0,0.02)] bg-white">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse"></div>
                            <div className="h-4 w-4 bg-slate-100 rounded-full animate-pulse"></div>
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-1/3 bg-slate-100 rounded mt-1 animate-pulse"></div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
                <Card key={index} className="border-none shadow-[0_2px_15px_rgba(0,0,0,0.02)] bg-white transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">
                            {metric.title}
                        </CardTitle>
                        <metric.icon className="h-4 w-4 text-slate-400" strokeWidth={2} />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-semibold tracking-tight text-slate-900">
                            {metric.value?.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
