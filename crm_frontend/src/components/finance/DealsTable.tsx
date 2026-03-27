import { DealOut } from '@/types/crm';
import { format } from 'date-fns';

interface DealsTableProps {
    deals: DealOut[];
}

export function DealsTable({ deals }: DealsTableProps) {
    const formatMoney = (cents: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
    };

    return (
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-medium">Deal ID</th>
                            <th className="px-6 py-4 font-medium">Value</th>
                            <th className="px-6 py-4 font-medium">Date Closed</th>
                            <th className="px-6 py-4 font-medium">Seller ID</th>
                            <th className="px-6 py-4 font-medium">Lead ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deals.length > 0 ? (
                            deals.map((deal) => (
                                <tr
                                    key={deal.id}
                                    className="border-b border-slate-50/80 last:border-0 hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        #{deal.id}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {formatMoney(deal.value_cents)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {format(new Date(deal.created_at), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                                            User {deal.seller_id || deal.tenant_id}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        #{deal.lead_id}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    No deals found. Start converting leads to build your pipeline!
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
