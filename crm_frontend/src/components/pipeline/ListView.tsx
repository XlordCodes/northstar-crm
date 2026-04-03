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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ListViewProps {
    leads: LeadOut[];
    onLeadClick: (lead: LeadOut) => void;
}

export function ListView({ leads, onLeadClick }: ListViewProps) {
    const queryClient = useQueryClient();

    const updateStatusMutation = useMutation<
        LeadOut,
        Error,
        { id: number; newStatus: LeadStatus },
        { previousLeads?: LeadOut[] }
    >({
        mutationFn: async ({ id, newStatus }) => {
            const payload = { status: newStatus };
            const response = await api.patch(`/leads/${id}`, payload);
            return response.data;
        },
        onMutate: async ({ id, newStatus }) => {
            // Cancel outgoing refetches so they don't overwrite optimistic update
            await queryClient.cancelQueries({ queryKey: ['leads'] });

            // Snapshot previous value for rollback
            const previousLeads = queryClient.getQueryData<LeadOut[]>(['leads']);

            // Optimistically update
            if (previousLeads) {
                queryClient.setQueryData<LeadOut[]>(['leads'], (old) => {
                    if (!old) return old;
                    return old.map(lead =>
                        lead.id === id ? { ...lead, status: newStatus } : lead
                    );
                });
            }

            return { previousLeads };
        },
        onError: (_err, _variables, context) => {
            toast.error('Failed to update lead status');
            // Rollback on error
            if (context?.previousLeads) {
                queryClient.setQueryData(['leads'], context.previousLeads);
            }
        },
        onSettled: () => {
            // Always refetch after error or success
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
    });

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden border border-slate-100/50">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
                            <TableHead className="px-6 py-4 font-medium text-slate-500 tracking-tight">Name</TableHead>
                            <TableHead className="px-6 py-4 font-medium text-slate-500 tracking-tight">Email</TableHead>
                            <TableHead className="px-6 py-4 font-medium text-slate-500 tracking-tight">Status</TableHead>
                            <TableHead className="px-6 py-4 font-medium text-slate-500 tracking-tight text-right">Date Added</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads.map((lead) => (
                            <TableRow
                                key={lead.id}
                                onClick={() => onLeadClick(lead)}
                                className="hover:bg-slate-50/50 transition-colors group cursor-pointer border-b border-slate-100/80 last:border-0"
                            >
                                <TableCell className="px-6 py-4 font-medium text-slate-900">
                                    {lead.name}
                                </TableCell>
                                <TableCell className="px-6 py-4 text-slate-500">
                                    {lead.email || '-'}
                                </TableCell>
                                <TableCell className="px-6 py-4">
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
                                </TableCell>
                                <TableCell className="px-6 py-4 text-slate-400 text-right tabular-nums">
                                    {new Date(lead.created_at).toLocaleDateString()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
