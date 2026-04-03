import { useState, useMemo, useCallback } from 'react';
import { useBulkJobs } from '@/hooks/useBulkJobs';
import { useCreateBulkJob } from '@/hooks/useCreateBulkJob';
import { useContacts } from '@/hooks/useContacts';
import { useLeads } from '@/hooks/useLeads';
import { BulkJobCreate } from '@/types/campaigns';
import { ContactOut, LeadOut } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Clock, X, Filter } from 'lucide-react';

// --- Types ---

type Channel = 'whatsapp' | 'email';

type FilterField = 'type' | 'status' | 'email' | 'name' | 'last_activity';
type FilterOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
type FilterLogic = 'and' | 'or';

interface FilterRow {
    id: string;
    field: FilterField;
    operator: FilterOperator;
    value: string;
}

interface AudienceRecord {
    kind: 'contact' | 'lead';
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    status: string | null;
    created_at: string;
}

const WHATSAPP_TEMPLATES = [
    { value: 'hello_world', label: 'Hello World' },
    { value: 'invoice_alert', label: 'Invoice Alert' },
    { value: 'event_reminder', label: 'Event Reminder' },
    { value: 'welcome_message', label: 'Welcome Message' },
    { value: 'payment_confirmation', label: 'Payment Confirmation' },
    { value: 'follow_up', label: 'Follow Up' },
];

const FILTER_FIELDS: { value: FilterField; label: string }[] = [
    { value: 'type', label: 'Type' },
    { value: 'status', label: 'Status' },
    { value: 'email', label: 'Email' },
    { value: 'name', label: 'Name' },
    { value: 'last_activity', label: 'Last Activity' },
];

const FILTER_OPERATORS: Record<FilterField, { value: FilterOperator; label: string }[]> = {
    type: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
    ],
    status: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not Equals' },
    ],
    email: [
        { value: 'contains', label: 'Contains' },
        { value: 'equals', label: 'Equals' },
    ],
    name: [
        { value: 'contains', label: 'Contains' },
        { value: 'equals', label: 'Equals' },
    ],
    last_activity: [
        { value: 'greater_than', label: 'After' },
        { value: 'less_than', label: 'Before' },
    ],
};

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted'];
const TYPE_OPTIONS = ['contact', 'lead'];

let filterIdCounter = 0;
function createFilterRow(): FilterRow {
    filterIdCounter += 1;
    return {
        id: `filter-${filterIdCounter}-${Date.now()}`,
        field: 'type',
        operator: 'equals',
        value: '',
    };
}

function evaluateFilter(record: AudienceRecord, filter: FilterRow): boolean {
    if (!filter.value) return true;

    let fieldValue: string;
    switch (filter.field) {
        case 'type':
            fieldValue = record.kind;
            break;
        case 'status':
            fieldValue = record.status ?? '';
            break;
        case 'email':
            fieldValue = record.email ?? '';
            break;
        case 'name':
            fieldValue = record.name;
            break;
        case 'last_activity':
            fieldValue = record.created_at;
            break;
        default:
            return true;
    }

    switch (filter.operator) {
        case 'equals':
            return fieldValue.toLowerCase() === filter.value.toLowerCase();
        case 'not_equals':
            return fieldValue.toLowerCase() !== filter.value.toLowerCase();
        case 'contains':
            return fieldValue.toLowerCase().includes(filter.value.toLowerCase());
        case 'greater_than':
            return new Date(fieldValue) > new Date(filter.value);
        case 'less_than':
            return new Date(fieldValue) < new Date(filter.value);
        default:
            return true;
    }
}

export function Campaigns() {
    const { data: jobs = [], isLoading } = useBulkJobs();
    const createJob = useCreateBulkJob();
    const { data: contacts = [] } = useContacts(0, 500);
    const { data: leads = [] } = useLeads(0, 500);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [channel, setChannel] = useState<Channel>('whatsapp');
    const [templateName, setTemplateName] = useState('');
    const [languageCode, setLanguageCode] = useState('en_US');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [scheduledAt, setScheduledAt] = useState('');

    // Query Builder state
    const [filters, setFilters] = useState<FilterRow[]>([createFilterRow()]);
    const [filterLogic, setFilterLogic] = useState<FilterLogic>('and');

    // Build unified audience list from contacts + leads
    const allRecords: AudienceRecord[] = useMemo(() => {
        const contactRecords: AudienceRecord[] = contacts.map((c: ContactOut) => ({
            kind: 'contact' as const,
            id: c.id,
            name: c.name,
            phone: c.phone,
            email: c.email,
            status: null,
            created_at: c.created_at,
        }));

        const leadRecords: AudienceRecord[] = leads.map((l: LeadOut) => ({
            kind: 'lead' as const,
            id: l.id,
            name: l.name,
            phone: l.phone,
            email: l.email,
            status: l.status,
            created_at: l.created_at,
        }));

        return [...contactRecords, ...leadRecords];
    }, [contacts, leads]);

    // Apply filters to audience
    const filteredAudience = useMemo(() => {
        const activeFilters = filters.filter(f => f.value.trim() !== '');
        let base = allRecords;
        if (activeFilters.length > 0) {
            base = base.filter(record => {
                if (filterLogic === 'and') {
                    return activeFilters.every(f => evaluateFilter(record, f));
                }
                return activeFilters.some(f => evaluateFilter(record, f));
            });
        }

        // Channel-specific filtering: WhatsApp requires phone, Email requires email
        return base;
    }, [allRecords, filters, filterLogic]);

    // Resolve deliverable recipients based on channel
    const resolvedRecipients = useMemo(() => {
        if (channel === 'whatsapp') {
            return filteredAudience
                .filter(r => r.phone !== null && r.phone.trim() !== '')
                .map(r => r.phone as string);
        }
        return filteredAudience
            .filter(r => r.email !== null && r.email.trim() !== '')
            .map(r => r.email as string);
    }, [filteredAudience, channel]);

    const deliverableCount = resolvedRecipients.length;
    const skippedCount = filteredAudience.length - deliverableCount;

    const updateFilter = useCallback((id: string, updates: Partial<FilterRow>) => {
        setFilters(prev => prev.map(f => {
            if (f.id !== id) return f;
            const merged = { ...f, ...updates };
            if (updates.field) {
                merged.operator = FILTER_OPERATORS[updates.field][0].value;
                merged.value = '';
            }
            return merged;
        }));
    }, []);

    const addFilter = useCallback(() => {
        setFilters(prev => [...prev, createFilterRow()]);
    }, []);

    const removeFilter = useCallback((id: string) => {
        setFilters(prev => prev.length > 1 ? prev.filter(f => f.id !== id) : prev);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isWhatsApp = channel === 'whatsapp';
        const hasValidInput = isWhatsApp ? !templateName.trim() : (!emailSubject.trim() || !emailBody.trim());
        if (hasValidInput || deliverableCount === 0) return;

        const data: BulkJobCreate = {
            channel,
            template_name: isWhatsApp ? templateName.trim() : '',
            language_code: isWhatsApp ? (languageCode.trim() || 'en_US') : 'en_US',
            numbers: isWhatsApp ? resolvedRecipients : [],
            emails: !isWhatsApp ? resolvedRecipients : [],
            email_subject: !isWhatsApp ? emailSubject.trim() : undefined,
            email_body: !isWhatsApp ? emailBody.trim() : undefined,
            filters: filters.filter(f => f.value.trim() !== ''),
            filter_logic: filterLogic,
            scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        };

        try {
            await createJob.mutateAsync(data);
            setTemplateName('');
            setLanguageCode('en_US');
            setEmailSubject('');
            setEmailBody('');
            setFilters([createFilterRow()]);
            setScheduledAt('');
            setSheetOpen(false);
        } catch {
            // Handled globally by the hook
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-emerald-50 text-emerald-600';
            case 'running':
                return 'bg-indigo-50 text-indigo-600';
            case 'queued':
                return 'bg-amber-50 text-amber-600';
            case 'scheduled':
                return 'bg-sky-50 text-sky-600';
            case 'failed':
                return 'bg-red-50 text-red-600';
            default:
                return 'bg-zinc-100 text-zinc-600';
        }
    };

    const renderValueInput = (filter: FilterRow) => {
        if (filter.field === 'type') {
            return (
                <Select value={filter.value} onValueChange={(v) => updateFilter(filter.id, { value: v })}>
                    <SelectTrigger className="h-9 bg-[#f3f3f3] border-none rounded-none shadow-none text-[13px] font-medium text-zinc-900">
                        <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                        {TYPE_OPTIONS.map(t => (
                            <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        if (filter.field === 'status') {
            return (
                <Select value={filter.value} onValueChange={(v) => updateFilter(filter.id, { value: v })}>
                    <SelectTrigger className="h-9 bg-[#f3f3f3] border-none rounded-none shadow-none text-[13px] font-medium text-zinc-900">
                        <SelectValue placeholder="Select status..." />
                    </SelectTrigger>
                    <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            );
        }

        if (filter.field === 'last_activity') {
            return (
                <Input
                    type="date"
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    className="h-9 bg-[#f3f3f3] border-none rounded-none shadow-none text-[13px] font-medium text-zinc-900"
                />
            );
        }

        return (
            <Input
                type="text"
                value={filter.value}
                onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                placeholder="Enter value..."
                className="h-9 bg-[#f3f3f3] border-none rounded-none shadow-none text-[13px] font-medium text-zinc-900"
            />
        );
    };

    const canSubmit = channel === 'whatsapp'
        ? templateName.trim() !== '' && deliverableCount > 0
        : emailSubject.trim() !== '' && emailBody.trim() !== '' && deliverableCount > 0;

    return (
        <div className="flex-1 space-y-8 max-w-7xl mx-auto w-full px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Campaigns</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage omnichannel broadcast campaigns.</p>
                </div>
                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-none cursor-pointer">
                            <Plus className="w-4 h-4 mr-2" /> New Campaign
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[480px] sm:max-w-lg bg-white border-l border-zinc-100 p-8 overflow-y-auto">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="text-xl font-bold tracking-tight text-zinc-900">New Campaign</SheetTitle>
                            <SheetDescription className="text-zinc-500 text-sm">
                                Select a channel and build your audience.
                            </SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Channel Toggle */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                    Channel
                                </Label>
                                <Tabs value={channel} onValueChange={(v) => setChannel(v as Channel)}>
                                    <TabsList className="grid grid-cols-2 w-full bg-zinc-100 rounded-none p-0.5 h-10">
                                        <TabsTrigger
                                            value="whatsapp"
                                            className="rounded-none text-[13px] font-medium tracking-tight data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500"
                                        >
                                            WhatsApp
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="email"
                                            className="rounded-none text-[13px] font-medium tracking-tight data-[state=active]:bg-white data-[state=active]:text-zinc-900 data-[state=active]:shadow-sm text-zinc-500"
                                        >
                                            Email
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>

                            {/* Channel-specific inputs */}
                            {channel === 'whatsapp' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                            Template *
                                        </Label>
                                        <Select value={templateName} onValueChange={setTemplateName}>
                                            <SelectTrigger className="w-full bg-[#f3f3f3] border-none focus-visible:border-zinc-900 focus-visible:ring-0 h-11 px-4 text-sm font-medium rounded-none shadow-none text-zinc-900">
                                                <SelectValue placeholder="Select template..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {WHATSAPP_TEMPLATES.map(t => (
                                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                            Language
                                        </Label>
                                        <Input
                                            placeholder="en_US"
                                            value={languageCode}
                                            onChange={(e) => setLanguageCode(e.target.value)}
                                            className="w-full bg-[#f3f3f3] border-none focus-visible:border-zinc-900 focus-visible:ring-0 px-4 h-11 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                            Email Subject *
                                        </Label>
                                        <Input
                                            placeholder="Your monthly invoice is ready"
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                            className="w-full bg-[#f3f3f3] border-none focus-visible:border-zinc-900 focus-visible:ring-0 px-4 h-11 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                            Email Body *
                                        </Label>
                                        <textarea
                                            placeholder="Write your email content here..."
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                            rows={5}
                                            className="w-full bg-[#f3f3f3] border-none focus-visible:border-zinc-900 focus-visible:ring-0 px-4 py-3 text-sm font-medium rounded-none shadow-none text-zinc-900 resize-none"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Query Builder */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Filter className="w-3 h-3" />
                                        Targeting Rules
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={() => setFilterLogic(prev => prev === 'and' ? 'or' : 'and')}
                                        className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 border border-zinc-200 rounded text-zinc-500 hover:text-zinc-900 hover:border-zinc-400 transition-colors cursor-pointer"
                                    >
                                        {filterLogic === 'and' ? 'Match ALL' : 'Match ANY'}
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {filters.map((filter, index) => (
                                        <div key={filter.id} className="flex items-start gap-2">
                                            {index > 0 && (
                                                <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider pt-2.5 w-8 shrink-0 text-center">
                                                    {filterLogic}
                                                </span>
                                            )}
                                            {index === 0 && <div className="w-8 shrink-0" />}

                                            <div className="flex-1 grid grid-cols-3 gap-1.5">
                                                <Select
                                                    value={filter.field}
                                                    onValueChange={(v) => updateFilter(filter.id, { field: v as FilterField })}
                                                >
                                                    <SelectTrigger className="h-9 bg-[#f3f3f3] border-none rounded-none shadow-none text-[13px] font-medium text-zinc-900">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {FILTER_FIELDS.map(f => (
                                                            <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                <Select
                                                    value={filter.operator}
                                                    onValueChange={(v) => updateFilter(filter.id, { operator: v as FilterOperator })}
                                                >
                                                    <SelectTrigger className="h-9 bg-[#f3f3f3] border-none rounded-none shadow-none text-[13px] font-medium text-zinc-900">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {FILTER_OPERATORS[filter.field].map(op => (
                                                            <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {renderValueInput(filter)}
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => removeFilter(filter.id)}
                                                className="mt-1.5 p-1 text-zinc-300 hover:text-zinc-600 transition-colors"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={addFilter}
                                    className="text-[12px] font-medium text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
                                >
                                    + Add Filter
                                </button>
                            </div>

                            {/* 1px separator */}
                            <div className="border-t border-zinc-200" />

                            {/* Audience Preview */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                    Audience Preview
                                </Label>
                                <div className="bg-[#f3f3f3] rounded-none p-4">
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-[13px] text-zinc-500">
                                            {channel === 'whatsapp' ? 'WhatsApp' : 'Email'} Recipients
                                        </span>
                                        <span className="text-[15px] font-semibold text-zinc-900 tracking-tight">
                                            {deliverableCount}
                                        </span>
                                    </div>
                                    {skippedCount > 0 && (
                                        <p className="text-[11px] text-zinc-400 mt-1.5">
                                            {skippedCount} skipped — no {channel === 'whatsapp' ? 'phone' : 'email'}
                                        </p>
                                    )}
                                    {deliverableCount === 0 && filteredAudience.length > 0 && (
                                        <p className="text-[11px] text-red-500 mt-1.5 font-medium">
                                            No {channel === 'whatsapp' ? 'phone numbers' : 'email addresses'} in filtered audience.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Schedule */}
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">
                                    Schedule (Optional)
                                </Label>
                                <Input
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    className="w-full bg-[#f3f3f3] border-none focus-visible:border-zinc-900 focus-visible:ring-0 px-4 h-11 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                />
                            </div>

                            <div className="pt-2">
                                <Button
                                    type="submit"
                                    disabled={createJob.isPending || !canSubmit}
                                    className="w-full py-6 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-[0.2em] transition-all rounded-sm shadow-none cursor-pointer disabled:opacity-50"
                                >
                                    {createJob.isPending ? 'Launching...' : `Launch Campaign (${deliverableCount})`}
                                </Button>
                            </div>
                        </form>
                    </SheetContent>
                </Sheet>
            </div>

            <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50/50 border-b border-zinc-100">
                            <TableHead className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">CAMPAIGN ID</TableHead>
                            <TableHead className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">TEMPLATE</TableHead>
                            <TableHead className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">LANGUAGE</TableHead>
                            <TableHead className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">STATUS</TableHead>
                            <TableHead className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight text-right">CREATED</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="px-6 py-8 text-center text-[13px] text-zinc-500">
                                    Loading campaigns...
                                </TableCell>
                            </TableRow>
                        ) : jobs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="px-6 py-12 text-center">
                                    <Filter className="w-10 h-10 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
                                    <p className="text-[13px] font-medium text-zinc-900 mb-1">No campaigns found</p>
                                    <p className="text-[12px] text-zinc-500">Create your first broadcast campaign to get started.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            jobs.map((job) => (
                                <TableRow key={job.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <TableCell className="px-6 py-4 text-[13px] font-medium text-zinc-900">#{job.id}</TableCell>
                                    <TableCell className="px-6 py-4 text-[13px] text-zinc-500 font-mono">{job.template_name}</TableCell>
                                    <TableCell className="px-6 py-4 text-[13px] text-zinc-500">{job.language_code}</TableCell>
                                    <TableCell className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider ${getStatusStyle(job.status)}`}>
                                            {job.status === 'running' && <Clock className="w-3 h-3" />}
                                            {job.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 text-[13px] text-zinc-500 text-right">
                                        {new Date(job.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
