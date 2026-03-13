import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

import { LeadOut, LeadStatus } from '@/types/crm';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ListViewProps {
    leads: LeadOut[];
    onLeadClick: (lead: LeadOut) => void;
}

export function ListView({ leads, onLeadClick }: ListViewProps) {
    const queryClient = useQueryClient();

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }: { id: number; newStatus: LeadStatus }) => {
            const payload = { status: newStatus };
            const response = await api.patch(`/leads/${id}`, payload);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success('Lead status updated successfully');
        },
        onError: () => {
            toast.error('Failed to update lead status');
        }
    });

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden border border-slate-100/50">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 font-medium tracking-tight">Name</th>
                            <th className="px-6 py-4 font-medium tracking-tight">Email</th>
                            <th className="px-6 py-4 font-medium tracking-tight">Status</th>
                            <th className="px-6 py-4 font-medium tracking-tight text-right">Date Added</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/80">
                        {leads.map((lead) => (
                            <tr
                                key={lead.id}
                                onClick={() => onLeadClick(lead)}
                                className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                            >
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    {lead.name}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {lead.email || '-'}
                                </td>
                                <td className="px-6 py-4">
                                    {lead.status === 'converted' ? (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-700">
                                            CONVERTED
                                        </span>
                                    ) : (
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Select
                                                value={lead.status}
                                                onValueChange={(val: LeadStatus) => updateStatusMutation.mutate({ id: lead.id, newStatus: val })}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                <SelectTrigger className="w-[120px] h-7 text-[10px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-700 border-none shadow-none focus:ring-0 cursor-pointer">
                                                    <SelectValue placeholder="Status" />
                                                </SelectTrigger>
                                                <SelectContent className="border-none shadow-lg py-1">
                                                    <SelectItem value="new" className="text-xs cursor-pointer">NEW</SelectItem>
                                                    <SelectItem value="contacted" className="text-xs cursor-pointer">CONTACTED</SelectItem>
                                                    <SelectItem value="qualified" className="text-xs cursor-pointer">QUALIFIED</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-slate-400 text-right tabular-nums">
                                    {new Date(lead.created_at).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
