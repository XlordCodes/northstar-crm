import { useState } from 'react';
import { useLeads } from '@/hooks/useLeads';
import { LeadOut } from '@/types/crm';
import { KanbanView } from '@/components/pipeline/KanbanView';
import { ListView } from '@/components/pipeline/ListView';
import { LeadDrawer } from '@/components/pipeline/LeadDrawer';
import { LayoutGrid, List, AlertCircle, Inbox, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Pipeline() {
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [selectedLead, setSelectedLead] = useState<LeadOut | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const { data: leads, isLoading, isError } = useLeads();

    const handleLeadClick = (lead: LeadOut) => {
        setSelectedLead(lead);
        setIsDrawerOpen(true);
    };

    const closeDrawer = () => {
        setIsDrawerOpen(false);
        // Optional: delay clearing selected lead until animation finishes
        setTimeout(() => setSelectedLead(null), 300);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden animate-in fade-in duration-500">

            {/* Header */}
            <div className="flex items-center justify-between shrink-0 mb-8">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sales Pipeline</h1>

                <div className="flex items-center gap-4">
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
                    <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-none">
                        <Plus className="w-4 h-4 mr-2" /> New Lead
                    </Button>
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
