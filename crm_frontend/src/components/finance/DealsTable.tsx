import { useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    type ColumnDef,
    type SortingState,
    flexRender,
} from '@tanstack/react-table';
import { useState } from 'react';
import { DealOut } from '@/types/crm';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ArrowUpDown } from 'lucide-react';

interface DealsTableProps {
    deals: DealOut[];
}

const formatMoney = (cents: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
};

export function DealsTable({ deals }: DealsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);

    const columns = useMemo<ColumnDef<DealOut>[]>(() => [
        {
            accessorKey: 'id',
            header: 'Deal ID',
            cell: ({ row }) => (
                <span className="font-medium text-slate-900">#{row.original.id}</span>
            ),
        },
        {
            accessorKey: 'value_cents',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Value
                    <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
            ),
            cell: ({ row }) => (
                <span className="font-medium text-slate-900">{formatMoney(row.original.value_cents)}</span>
            ),
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Date Closed
                    <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
            ),
            cell: ({ row }) => (
                <span className="text-slate-500">{format(new Date(row.original.created_at), 'MMM d, yyyy')}</span>
            ),
        },
        {
            accessorKey: 'seller_id',
            header: 'Seller ID',
            cell: ({ row }) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                    User {row.original.seller_id || row.original.tenant_id}
                </span>
            ),
        },
        {
            accessorKey: 'lead_id',
            header: 'Lead ID',
            cell: ({ row }) => (
                <span className="text-slate-500">#{row.original.lead_id}</span>
            ),
        },
    ], []);

    const table = useReactTable({
        data: deals,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    return (
        <div className="w-full bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="px-6 py-4 text-xs text-slate-500 uppercase font-medium">
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.header, header.getContext())}
                                </TableHead>
                            ))}
                        </TableRow>
                    ))}
                </TableHeader>
                <TableBody>
                    {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                            <TableRow
                                key={row.id}
                                className="border-b border-slate-50/80 last:border-0 hover:bg-slate-50/50 transition-colors"
                            >
                                {row.getVisibleCells().map((cell) => (
                                    <TableCell key={cell.id} className="px-6 py-4">
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                                No deals found. Start converting leads to build your pipeline!
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
