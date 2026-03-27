import { DealOut } from '@/types/crm';
import { CircleDollarSign, Target, TrendingUp } from 'lucide-react';

interface DealsKPIProps {
    deals: DealOut[];
}

export function DealsKPI({ deals }: DealsKPIProps) {
    const totalPipelineValueCents = deals.reduce((acc, deal) => acc + deal.value_cents, 0);
    const totalPipelineValueDollars = totalPipelineValueCents / 100;
    
    const count = deals.length;
    
    const averageSizeDollars = count > 0 ? totalPipelineValueDollars / count : 0;

    const formatMoney = (val: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col justify-between border border-transparent">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-500">Total Pipeline Value</h3>
                </div>
                <div className="text-3xl font-semibold text-slate-900 mt-2">
                    {formatMoney(totalPipelineValueDollars)}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col justify-between border border-transparent">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                        <Target className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-500">Total Deals Won</h3>
                </div>
                <div className="text-3xl font-semibold text-slate-900 mt-2">
                    {count}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col justify-between border border-transparent">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-medium text-slate-500">Average Deal Size</h3>
                </div>
                <div className="text-3xl font-semibold text-slate-900 mt-2">
                    {formatMoney(averageSizeDollars)}
                </div>
            </div>
        </div>
    );
}
