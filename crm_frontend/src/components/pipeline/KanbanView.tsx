import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

import { LeadOut, LeadStatus } from '@/types/crm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface KanbanViewProps {
    leads: LeadOut[];
    onLeadClick: (lead: LeadOut) => void;
}

const COLUMNS: { id: LeadStatus; label: string }[] = [
    { id: 'new', label: 'New' },
    { id: 'contacted', label: 'Contacted' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'converted', label: 'Converted' },
];

const MAX_LEADS_PER_COLUMN = 50;

// ── Memoized KanbanCard ──────────────────────────────────────────────────────
interface KanbanCardProps {
    lead: LeadOut;
    onLeadClick: (lead: LeadOut) => void;
    isDragging: boolean;
}

const KanbanCard = React.memo(function KanbanCard({ lead, onLeadClick, isDragging }: KanbanCardProps) {
    return (
        <Card
            onClick={() => onLeadClick(lead)}
            className={`border-none bg-white cursor-pointer transition-all duration-200 ${isDragging
                ? 'shadow-2xl ring-1 ring-slate-200 scale-105'
                : 'shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_15px_rgba(0,0,0,0.05)]'
                }`}
        >
            <CardContent className="p-4 flex flex-col gap-1">
                <div className="font-semibold text-sm text-slate-900 line-clamp-1">{lead.name}</div>
                <div className="text-xs text-slate-500 line-clamp-1 truncate">
                    {lead.email || 'No email provided'}
                </div>
                <div className="text-[10px] text-slate-400 mt-2 font-medium">
                    Added {new Date(lead.created_at).toLocaleDateString()}
                </div>
            </CardContent>
        </Card>
    );
});

// ── Main KanbanView Component ────────────────────────────────────────────────
export function KanbanView({ leads, onLeadClick }: KanbanViewProps) {
    const queryClient = useQueryClient();

    // Dialog state
    const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
    const [pendingConvertLead, setPendingConvertLead] = useState<LeadOut | null>(null);
    const [dealValue, setDealValue] = useState<string>('');
    const [localLeads, setLocalLeads] = useState<LeadOut[]>(leads);

    useEffect(() => {
        setLocalLeads(leads);
    }, [leads]);

    // Update Status Mutation
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
            await queryClient.cancelQueries({ queryKey: ['leads'] });
            const previousLeads = queryClient.getQueryData<LeadOut[]>(['leads']);

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
        onError: (_err, _newLead, context) => {
            toast.error('Failed to update lead status');
            if (context?.previousLeads) {
                queryClient.setQueryData(['leads'], context.previousLeads);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
    });

    // Convert Deal Mutation
    const convertDealMutation = useMutation<
        unknown,
        Error,
        { id: number; valueCents: number }
    >({
        mutationFn: async ({ id, valueCents }) => {
            const response = await api.post(`/leads/${id}/convert?value_cents=${valueCents}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success('Lead converted to deal successfully');
            setIsConvertDialogOpen(false);
            setPendingConvertLead(null);
            setDealValue('');
        },
        onError: () => {
            toast.error('Failed to convert lead');
        }
    });

    const handleConvertSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (!pendingConvertLead || !dealValue) return;

        const valueCents = Math.round(parseFloat(dealValue) * 100);
        convertDealMutation.mutate({ id: pendingConvertLead.id, valueCents });
    }, [pendingConvertLead, dealValue, convertDealMutation]);

    const handleConvertDialogClose = useCallback((open: boolean) => {
        setIsConvertDialogOpen(open);
        if (!open) {
            setPendingConvertLead(null);
            setDealValue('');
        }
    }, []);

    const onDragEnd = useCallback((result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId) return;

        // User dragged to the explicitly guarded 'converted' lane
        if (destination.droppableId === 'converted') {
            const leadToConvert = localLeads.find((l) => l.id.toString() === draggableId);
            if (leadToConvert) {
                setPendingConvertLead(leadToConvert);
                setIsConvertDialogOpen(true);
            }
            return;
        }
        setLocalLeads((prev) =>
            prev.map((lead) =>
                lead.id.toString() === draggableId
                    ? { ...lead, status: destination.droppableId as LeadStatus }
                    : lead
            )
        );
        // Standard status movement update
        updateStatusMutation.mutate({
            id: parseInt(draggableId),
            newStatus: destination.droppableId as LeadStatus,
        });
    }, [localLeads, updateStatusMutation]);

    // Memoized column leads computation
    const columnLeadsMap = useMemo(() => {
        const map: Record<LeadStatus, LeadOut[]> = { new: [], contacted: [], qualified: [], converted: [] };
        for (const lead of localLeads) {
            if (map[lead.status]) {
                map[lead.status].push(lead);
            }
        }
        // Enforce per-column cap
        for (const key of Object.keys(map) as LeadStatus[]) {
            if (map[key].length > MAX_LEADS_PER_COLUMN) {
                map[key] = map[key].slice(0, MAX_LEADS_PER_COLUMN);
            }
        }
        return map;
    }, [localLeads]);

    return (
        <>
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-6 h-full overflow-x-auto pb-4">
                    {COLUMNS.map((col) => {
                        const columnLeads = columnLeadsMap[col.id];
                        return (
                            <Droppable key={col.id} droppableId={col.id}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 min-w-[280px] max-w-[320px] flex flex-col gap-4 rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-slate-50/50' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-sm font-medium text-slate-900 tracking-tight">{col.label}</h3>
                                            <span className="text-xs font-semibold text-slate-400 bg-slate-100/50 px-2 py-0.5 rounded-full">
                                                {columnLeads.length}
                                            </span>
                                        </div>

                                        <div className="flex flex-col gap-3 flex-1">
                                            {columnLeads.length === 0 ? (
                                                <div className="border-2 border-dashed border-slate-200/60 rounded-xl h-24 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-slate-400">Drag here</span>
                                                </div>
                                            ) : (
                                                columnLeads.map((lead, index) => (
                                                    <Draggable
                                                        key={lead.id.toString()}
                                                        draggableId={lead.id.toString()}
                                                        index={index}
                                                    >
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                    ...provided.draggableProps.style,
                                                                    transform: (snapshot.isDragging && !snapshot.dropAnimation)
                                                                        ? provided.draggableProps.style?.transform
                                                                            ? `${provided.draggableProps.style.transform} rotate(2deg)`
                                                                            : 'rotate(2deg)'
                                                                        : provided.draggableProps.style?.transform,
                                                                }}
                                                            >
                                                                <KanbanCard
                                                                    lead={lead}
                                                                    onLeadClick={onLeadClick}
                                                                    isDragging={snapshot.isDragging}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))
                                            )}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        );
                    })}
                </div>
            </DragDropContext>

            {/* Convert to Deal Dialog Intercept */}
            <Dialog open={isConvertDialogOpen} onOpenChange={handleConvertDialogClose}>
                <DialogContent className="bg-white border-none shadow-xl sm:max-w-md rounded-2xl">
                    <form onSubmit={handleConvertSubmit}>
                        <DialogHeader className="space-y-3">
                            <DialogTitle className="text-xl font-semibold text-slate-900">Convert Lead</DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">
                                Convert <span className="font-medium text-slate-900">{pendingConvertLead?.name}</span> into an active deal. Please enter the expected deal value.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-6">
                            <Label htmlFor="deal-value-kanban" className="text-slate-700 text-sm font-medium mb-2 block">
                                Deal Value ($)
                            </Label>
                            <Input
                                id="deal-value-kanban"
                                type="number"
                                step="0.01"
                                min="0"
                                value={dealValue}
                                onChange={(e) => setDealValue(e.target.value)}
                                placeholder="e.g. 5000"
                                required
                                className="bg-white border-slate-200 h-11 rounded-xl shadow-none px-4 focus-visible:ring-1 focus-visible:ring-slate-900"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => handleConvertDialogClose(false)}
                                className="rounded-xl h-10"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={convertDealMutation.isPending || !dealValue}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-none h-10"
                            >
                                {convertDealMutation.isPending ? "Saving..." : "Convert"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
