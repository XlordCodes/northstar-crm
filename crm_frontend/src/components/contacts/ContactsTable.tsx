import { useState, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    type ColumnDef,
    type SortingState,
    flexRender,
} from '@tanstack/react-table';
import { ContactOut } from '@/types/crm';
import { Input } from '@/components/ui/input';
import { Search, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ContactsTableProps {
    contacts: ContactOut[];
}

export function ContactsTable({ contacts }: ContactsTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const columns = useMemo<ColumnDef<ContactOut>[]>(() => [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Name
                    <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
            ),
            cell: ({ row }) => (
                <span className="font-medium text-slate-900">{row.original.name}</span>
            ),
        },
        {
            accessorKey: 'email',
            header: 'Email',
            cell: ({ row }) => (
                <span className="text-slate-500">{row.original.email || '—'}</span>
            ),
        },
        {
            accessorKey: 'phone',
            header: 'Phone',
            cell: ({ row }) => (
                <span className="text-slate-500">{row.original.phone || '—'}</span>
            ),
        },
        {
            accessorKey: 'created_at',
            header: ({ column }) => (
                <button
                    className="flex items-center gap-1 cursor-pointer hover:text-slate-700 transition-colors"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Created Date
                    <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
            ),
            cell: ({ row }) => (
                <span className="text-slate-500">{format(new Date(row.original.created_at), 'MMM d, yyyy')}</span>
            ),
        },
    ], []);

    const table = useReactTable({
        data: contacts,
        columns,
        state: { sorting, globalFilter },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="w-full flex flex-col">
            {/* Table Controls */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search contacts..."
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        className="w-full pl-9 h-9 bg-slate-50 border-transparent shadow-none focus-visible:ring-0 focus-visible:bg-slate-100 transition-colors text-sm rounded-lg"
                    />
                </div>
            </div>

            {/* Table */}
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id} className="bg-slate-50/50 border-b border-slate-100 hover:bg-slate-50/50">
                            {headerGroup.headers.map((header) => (
                                <TableHead key={header.id} className="px-6 py-3 text-xs text-slate-500 uppercase font-medium">
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
                                className="bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
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
                                No contacts found matching your search.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
