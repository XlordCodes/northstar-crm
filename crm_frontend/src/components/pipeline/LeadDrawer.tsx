import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

import { LeadOut, LeadStatus, LeadUpdate } from '@/types/crm';

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LeadDrawerProps {
    lead: LeadOut | null;
    isOpen: boolean;
    onClose: () => void;
    onLeadUpdate: (lead: LeadOut) => void;
}

export function LeadDrawer({ lead, isOpen, onClose, onLeadUpdate }: LeadDrawerProps) {
    const queryClient = useQueryClient();
    const [dealValue, setDealValue] = useState<string>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Update Status Mutation
    const updateStatusMutation = useMutation({
        mutationFn: async (newStatus: LeadStatus) => {
            if (!lead) throw new Error("No lead selected");
            const payload: LeadUpdate = { status: newStatus };
            const response = await api.patch(`/leads/${lead.id}`, payload);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success('Lead status updated successfully');
            if (data) onLeadUpdate(data);
        },
        onError: () => {
            toast.error('Failed to update lead status');
        }
    });

    // Convert Deal Mutation
    const convertDealMutation = useMutation({
        mutationFn: async (valueCents: number) => {
            if (!lead) throw new Error("No lead selected");
            const response = await api.post(`/leads/${lead.id}/convert?value_cents=${valueCents}`);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            toast.success('Lead converted to deal successfully');
            setIsDialogOpen(false);
            if (data) onLeadUpdate(data);
            onClose();
        },
        onError: () => {
            toast.error('Failed to convert lead');
        }
    });

    const handleConvert = (e: React.FormEvent) => {
        e.preventDefault();
        if (!dealValue) return;

        const valueCents = Math.round(parseFloat(dealValue) * 100);
        convertDealMutation.mutate(valueCents);
    };

    if (!lead) return null;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="bg-white border-l-0 shadow-[-10px_0_40px_rgba(0,0,0,0.06)] sm:max-w-[450px] w-full p-0 flex flex-col">
                {/* Header Section */}
                <div className="p-6 border-b border-slate-100 flex-none">
                    <SheetHeader className="text-left space-y-4">
                        <div className="flex items-start justify-between pr-8">
                            <div>
                                <SheetTitle className="text-2xl font-semibold tracking-tight text-slate-900">
                                    {lead.name}
                                </SheetTitle>
                                <div className="text-sm text-slate-500 mt-1">
                                    {lead.email || 'No email provided'}
                                </div>
                            </div>

                            {lead.status === 'converted' ? (
                                <div className="inline-flex items-center px-2 py-1 h-7 rounded-md text-[10px] font-semibold tracking-wider uppercase bg-slate-100 text-slate-700">
                                    CONVERTED
                                </div>
                            ) : (
                                <Select
                                    value={lead.status}
                                    onValueChange={(val: LeadStatus) => updateStatusMutation.mutate(val)}
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
                            )}
                        </div>

                        {lead.status !== 'converted' && (
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button
                                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-11 shadow-none transition-all active:scale-[0.98]"
                                    >
                                        Convert to Deal
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white border-none shadow-xl sm:max-w-md rounded-2xl">
                                    <form onSubmit={handleConvert}>
                                        <DialogHeader className="space-y-3">
                                            <DialogTitle className="text-xl font-semibold text-slate-900">Convert Lead</DialogTitle>
                                            <DialogDescription className="text-slate-500 text-sm">
                                                Convert <span className="font-medium text-slate-900">{lead.name}</span> into an active deal. Please enter the expected deal value.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="py-6">
                                            <Label htmlFor="deal-value" className="text-slate-700 text-sm font-medium mb-2 block">
                                                Deal Value ($)
                                            </Label>
                                            <Input
                                                id="deal-value"
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
                                            <DialogClose asChild>
                                                <Button type="button" variant="ghost" className="rounded-xl h-10">Cancel</Button>
                                            </DialogClose>
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
                        )}

                    </SheetHeader>
                </div>

                {/* Body Section (Tabs) */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs defaultValue="details" className="flex-1 flex flex-col">
                        <div className="px-6 pt-4 border-b border-slate-100">
                            <TabsList className="bg-transparent h-auto p-0 gap-6">
                                <TabsTrigger
                                    value="details"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 text-slate-500 hover:text-slate-700"
                                >
                                    Details
                                </TabsTrigger>
                                <TabsTrigger
                                    value="timeline"
                                    className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 text-slate-500 hover:text-slate-700"
                                >
                                    Timeline
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <TabsContent value="details" className="m-0 space-y-6 outline-none">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-900 tracking-tight">Lead Information</h4>
                                    <div className="grid grid-cols-3 gap-y-4 gap-x-4 text-sm">
                                        <div className="text-slate-500">Pipeline Stage</div>
                                        <div className="col-span-2 text-slate-900 capitalize font-medium">{lead.status}</div>

                                        <div className="text-slate-500">Created At</div>
                                        <div className="col-span-2 text-slate-900 font-medium">
                                            {format(new Date(lead.created_at), 'MMM d, yyyy h:mm a')}
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="timeline" className="m-0 outline-none">
                                <div className="relative pl-4 border-l-2 border-slate-100 space-y-6">
                                    {/* Mocked Timeline */}
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-white" />
                                        <p className="text-sm font-medium text-slate-900">Email sent</p>
                                        <p className="text-xs text-slate-500 mt-1">Just now</p>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-white" />
                                        <p className="text-sm font-medium text-slate-900">Lead created</p>
                                        <p className="text-xs text-slate-500 mt-1">{format(new Date(lead.created_at), 'MMM d, yyyy')}</p>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}
