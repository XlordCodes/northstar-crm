import { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    type ColumnDef,
    type RowSelectionState,
    flexRender,
} from '@tanstack/react-table';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

import { LeadOut, LeadStatus } from '@/types/crm';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
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
import { useBulkDeleteLeads, useBulkUpdateLeads } from '@/hooks/useLeads';
import { Trash2 } from 'lucide-react';

interface ListViewProps {
    leads: LeadOut[];
    onLeadClick: (lead: LeadOut) => void;
}

export function ListView({ leads, onLeadClick }: ListViewProps) {
    const queryClient = useQueryClient();
    const bulkDelete = useBulkDeleteLeads();
    const bulkUpdate = useBulkUpdateLeads();
    
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

    const updateStatusMutation = useMutation<LeadOut, Error, { id: number; newStatus: LeadStatus }, { previousLeads?: LeadOut[] }>({
        mutationFn: async ({ id, newStatus }) => {
            const response = await api.patch(`/leads/${id}`, { status: newStatus });
            return response.data;
        },
        onMutate: async ({ id, newStatus }) => {
            await queryClient.cancelQueries({ queryKey: ['leads'] });
            const previousLeads = queryClient.getQueryData<LeadOut[]>(['leads']);
            if (previousLeads) {
                queryClient.setQueryData<LeadOut[]>(['leads'], (old) => {
                    if (!old) return old;
                    return old.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead);
                });
            }
            return { previousLeads };
        },
        onError: (_err, _variables, context) => {
            toast.error('Failed to update lead status');
            if (context?.previousLeads) {
                queryClient.setQueryData(['leads'], context.previousLeads);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
    });

    const columns = useMemo<ColumnDef<LeadOut>[]>(() => [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
                    onCheckedChange={(value: boolean | "indeterminate") => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Select all"
                    className="translate-y-[2px]"
                />
            ),
            cell: ({ row }) => (
                <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value: boolean | "indeterminate") => row.toggleSelected(!!value)}
                        aria-label="Select row"
                        className="translate-y-[2px]"
                    />
                </div>
            ),
            enableSorting: false,
        },
        {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.name}</span>,
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => <span className="text-slate-500">{row.original.email || '-'}</span>,
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const lead = row.original;
                return lead.status === 'converted' ? (
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
                );
            },
        },
        {
            accessorKey: 'created_at',
            header: () => <div className="text-right">Date Added</div>,
            cell: ({ row }) => (
                <div className="text-right text-slate-400 tabular-nums">
                    {new Date(row.original.created_at).toLocaleDateString()}
                </div>
            ),
        },
    ], [updateStatusMutation]);

    const table = useReactTable({
        data: leads,
        columns,
        state: { rowSelection },
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const isSelected = selectedRows.length > 0;

    const handleBulkDelete = async () => {
        const ids = selectedRows.map(r => r.original.id);
        await bulkDelete.mutateAsync(ids);
        table.resetRowSelection();
    };

    const handleBulkStatusChange = async (newStatus: LeadStatus) => {
        const ids = selectedRows.map(r => r.original.id);
        await bulkUpdate.mutateAsync({ leadIds: ids, updates: { status: newStatus } });
        table.resetRowSelection();
    };

    return (
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden border border-slate-100/50 flex flex-col relative">
            
            {/* Bulk Action Bar */}
            {isSelected && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-indigo-50 border-b border-indigo-100 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-4 fade-in duration-200">
                    <span className="text-sm font-medium text-indigo-900">
                        {selectedRows.length} lead{selectedRows.length > 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <Select onValueChange={(val: LeadStatus) => handleBulkStatusChange(val)}>
                            <SelectTrigger className="h-8 w-[140px] bg-white border-indigo-200 text-indigo-700 text-xs shadow-sm">
                                <SelectValue placeholder="Update Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-8 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-none px-3"
                            onClick={handleBulkDelete}
                            disabled={bulkDelete.isPending}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Delete
                        </Button>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id} className="px-6 py-4 font-medium text-slate-500 tracking-tight">
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                onClick={() => onLeadClick(row.original)}
                                className={`transition-colors group cursor-pointer border-b border-slate-100/80 last:border-0 ${row.getIsSelected() ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : 'bg-white hover:bg-slate-50/50'}`}
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="px-6 py-4">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
