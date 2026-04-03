import { KPIRow } from '@/components/dashboard/KPIRow';
import { CommandChat } from '@/components/dashboard/CommandChat';
import { AuditTimeline } from '@/components/dashboard/AuditTimeline';

export default function Dashboard() {
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden gap-8 animate-in fade-in duration-500 p-8">
            {/* Top Metrics Row */}
            <div className="shrink-0 max-w-[1600px] w-full mx-auto">
                <KPIRow />
            </div>

            {/* Bottom Section: 60/40 Split */}
            <div className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto grid grid-cols-10 gap-8">
                {/* 60% CommandChat */}
                <div className="col-span-12 lg:col-span-6 flex flex-col min-h-0">
                    <CommandChat />
                </div>
                {/* 40% AuditTimeline */}
                <div className="col-span-12 lg:col-span-4 flex flex-col min-h-0">
                    <AuditTimeline />
                </div>
            </div>
        </div>
    );
}
