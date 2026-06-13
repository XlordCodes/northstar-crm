import { useState, useMemo } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { useCreateLead } from '@/hooks/useCreateLead';
import { LeadOut } from '@/types/crm';
import { KanbanView } from '@/components/pipeline/KanbanView';
import { ListView } from '@/components/pipeline/ListView';
import { LeadDrawer } from '@/components/pipeline/LeadDrawer';
import { CsvImportWizard } from '@/components/pipeline/CsvImportWizard';
import { LayoutGrid, List, AlertCircle, Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Pipeline() {
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [selectedLead, setSelectedLead] = useState<LeadOut | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<string>('all');

    const statuses = statusFilter === 'all' ? undefined : [statusFilter];
    const createdAfter = useMemo(() => {
        if (dateFilter === '7days') return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        if (dateFilter === '30days') return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        return undefined;
    }, [dateFilter]);

    const { data: leads, isLoading, isError } = useLeads(0, 100, statuses, undefined, createdAfter);
    const createLead = useCreateLead();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const handleLeadClick = (lead: LeadOut) => {
        setSelectedLead(lead);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        setTimeout(() => setSelectedLead(null), 300);
    };

    const handleSubmit = async () => {
        if (!name.trim()) return;

        try {
            await createLead.mutateAsync({
                name: name.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
            });
            setName('');
            setEmail('');
            setPhone('');
            setSheetOpen(false);
        } catch (error) {
            // Handled globally
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0 mb-8">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sales Pipeline</h1>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 w-[130px] bg-white border-slate-200 text-slate-600 text-xs shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={dateFilter} onValueChange={setDateFilter}>
                            <SelectTrigger className="h-8 w-[120px] bg-white border-slate-200 text-slate-600 text-xs shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                                <SelectValue placeholder="Any Time" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any Time</SelectItem>
                                <SelectItem value="7days">Last 7 Days</SelectItem>
                                <SelectItem value="30days">Last 30 Days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center bg-white rounded-lg p-1 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100/50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView('kanban')}
                            className={`h-8 px-3 rounded-md transition-all shadow-none ${view === 'kanban' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <LayoutGrid className="w-4 h-4 mr-2" />
                            Board
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setView('list')}
                            className={`h-8 px-3 rounded-md transition-all shadow-none ${view === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List className="w-4 h-4 mr-2" />
                            List
                        </Button>
                    </div>
                    <CsvImportWizard />
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <SheetTrigger asChild>
                            <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-none cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" /> New Lead
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[400px] sm:max-w-md bg-white border-l border-zinc-100 p-8">
                            <SheetHeader className="mb-8">
                                <SheetTitle className="text-xl font-bold tracking-tight text-zinc-900">New Lead</SheetTitle>
                                <SheetDescription className="hidden">Form details</SheetDescription>
                            </SheetHeader>
                            <div className="space-y-6 mt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="lead-name" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Full Name *</Label>
                                    <Input
                                        id="lead-name"
                                        placeholder="John Doe"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-[#f3f3f3] border-none border-b-2 border-transparent focus-visible:border-zinc-900 focus-visible:ring-0 transition-all px-4 py-6 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lead-email" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Email Address</Label>
                                    <Input
                                        id="lead-email"
                                        placeholder="john@example.com"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#f3f3f3] border-none border-b-2 border-transparent focus-visible:border-zinc-900 focus-visible:ring-0 transition-all px-4 py-6 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lead-phone" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Phone Number (Optional)</Label>
                                    <Input
                                        id="lead-phone"
                                        placeholder="+14155552671"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full bg-[#f3f3f3] border-none border-b-2 border-transparent focus-visible:border-zinc-900 focus-visible:ring-0 transition-all px-4 py-6 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                    />
                                </div>
                                <div className="pt-8">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={createLead.isPending || !name.trim()}
                                        className="w-full py-6 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-[0.2em] transition-all rounded-sm shadow-none cursor-pointer disabled:opacity-50"
                                    >
                                        {createLead.isPending ? 'Creating...' : 'Create Lead'}
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                {isLoading && (
                    <div className="flex-1 flex gap-6 overflow-hidden">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="flex-1 min-w-[280px] flex flex-col gap-4">
                                <div className="h-5 w-24 bg-slate-200/50 rounded animate-pulse"></div>
                                <div className="h-28 w-full bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] animate-pulse"></div>
                                <div className="h-28 w-full bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] animate-pulse delay-75"></div>
                            </div>
                        ))}
                    </div>
                )}

                {isError && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white/50 rounded-2xl border border-slate-100/50 border-dashed">
                        <AlertCircle className="w-10 h-10 text-rose-400 mb-4" strokeWidth={1.5} />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">Failed to load pipeline</h3>
                        <p className="text-sm">We couldn't reach the server. Please try again later.</p>
                    </div>
                )}

                {!isLoading && !isError && leads?.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 bg-white/50 rounded-2xl border border-slate-100/50 border-dashed">
                        <Inbox className="w-12 h-12 text-slate-300 mb-4" strokeWidth={1.5} />
                        <h3 className="text-lg font-medium text-slate-900 mb-1">No leads found</h3>
                        <p className="text-sm">Time to prospect! Your new leads will appear here.</p>
                    </div>
                )}

                {!isLoading && !isError && leads && leads.length > 0 && (
                    <div className="flex-1 overflow-y-auto">
                        {view === 'kanban' ? <KanbanView leads={leads} onLeadClick={handleLeadClick} /> : <ListView leads={leads} onLeadClick={handleLeadClick} />}
                    </div>
                )}
            </div>

            <LeadDrawer
                lead={selectedLead}
                isOpen={isDrawerOpen}
                onClose={closeDrawer}
                onLeadUpdate={(updatedLead) => setSelectedLead(updatedLead)}
            />
        </div>
    );
}
