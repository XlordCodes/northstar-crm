import { useState } from 'react';
import { useSystemQueues } from '@/hooks/useSystemQueues';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Activity, Clock, RefreshCw, SendHorizontal, Mail, Brain, Timer, RotateCcw, Cog } from 'lucide-react';

interface SystemQueuesSheetProps {
    children: React.ReactNode;
}

const TASK_DISPLAY_NAMES: Record<string, string> = {
    'process_bulk_whatsapp_job': 'WhatsApp Broadcaster',
    'process_email_campaign': 'Email Dispatcher',
    'run_system_scheduler': 'System Scheduler',
    'retry_failed_tasks': 'Retry Engine',
    'ai_analyze_sentiment': 'Sentiment Analyzer',
    'ai_generate_summary': 'Summary Generator',
    'ai_suggest_replies': 'Reply Suggester',
    'cleanup_stale_sessions': 'Session Cleanup',
    'sync_crm_contacts': 'Contact Sync',
    'process_webhook_events': 'Webhook Processor',
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'messaging':
            return SendHorizontal;
        case 'email':
            return Mail;
        case 'ai':
            return Brain;
        case 'scheduler':
            return Timer;
        case 'retry':
            return RotateCcw;
        default:
            return Cog;
    }
};

const formatSchedule = (seconds: number | null) => {
    if (!seconds) return 'On-demand';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
};

export function SystemQueuesSheet({ children }: SystemQueuesSheetProps) {
    const [open, setOpen] = useState(false);
    const { data: tasks = [], isLoading, refetch, isFetching } = useSystemQueues();

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {children}
            </SheetTrigger>
            <SheetContent side="right" className="w-[360px] sm:max-w-sm bg-white border-l border-zinc-100 p-6">
                <SheetHeader className="mb-6">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-lg font-bold tracking-tight text-zinc-900">System Queues</SheetTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-900"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <SheetDescription className="text-zinc-500 text-[13px]">
                        Background worker task monitoring.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-3">
                    {isLoading ? (
                        <div className="py-8 text-center text-[13px] text-zinc-500">Loading tasks...</div>
                    ) : tasks.length === 0 ? (
                        <div className="py-8 text-center">
                            <Activity className="w-8 h-8 text-zinc-300 mx-auto mb-3" strokeWidth={1.5} />
                            <p className="text-[13px] font-medium text-zinc-900 mb-1">No active workers detected</p>
                            <p className="text-[11px] text-zinc-500">Ensure Celery workers and Beat are running.</p>
                        </div>
                    ) : (
                        tasks.map((task, index) => {
                            const Icon = getCategoryIcon(task.category);
                            const displayName = TASK_DISPLAY_NAMES[task.name] || task.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

                            return (
                                <div
                                    key={index}
                                    className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50/50 border border-zinc-100"
                                >
                                    <div className="mt-0.5 p-1.5 rounded-md bg-zinc-100">
                                        <Icon className="w-3.5 h-3.5 text-zinc-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[13px] font-medium text-zinc-900 truncate">{displayName}</p>
                                            <span className="relative flex h-2 w-2 shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 mt-0.5">{task.description}</p>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] text-zinc-400 shrink-0">
                                        <Clock className="w-3 h-3" />
                                        {formatSchedule(task.schedule_seconds)}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
