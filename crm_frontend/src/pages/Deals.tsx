import { useDeals } from '@/hooks/useDeals';
import { DealsKPI } from '@/components/finance/DealsKPI';
import { DealsTable } from '@/components/finance/DealsTable';
import { CircleDollarSign } from 'lucide-react';

export function Deals() {
    const { data: deals, isLoading, isError } = useDeals();

    return (
        <div className="flex-1 space-y-8 max-w-7xl mx-auto w-full px-8 py-8">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Finance & Deals</h1>
                    <p className="text-sm text-slate-500 mt-1">Track your won pipeline revenue and closed deals.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-8">
                    {/* KPI Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-32 border border-slate-100 animate-pulse" />
                        ))}
                    </div>
                    {/* Table Skeleton */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[400px] p-6 animate-pulse">
                        <div className="h-10 w-full bg-slate-50 rounded-lg mb-4" />
                        <div className="space-y-4 pt-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-12 w-full bg-slate-50 rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
            ) : isError ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-500 min-h-[400px] bg-white rounded-xl shadow-sm border border-slate-100/50">
                    <CircleDollarSign className="w-12 h-12 text-slate-300 mb-4" />
                    <p className="font-medium text-slate-900">Failed to load deals data.</p>
                    <p className="text-sm">Please check your network connection and CRM configurations.</p>
                </div>
            ) : (
                <div className="space-y-0">
                    <DealsKPI deals={deals || []} />
                    <DealsTable deals={deals || []} />
                </div>
            )}
        </div>
    );
}
