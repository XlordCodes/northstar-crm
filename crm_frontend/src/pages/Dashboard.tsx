import { KPIRow } from '@/components/dashboard/KPIRow';
import { CommandChat } from '@/components/dashboard/CommandChat';

export default function Dashboard() {
    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden gap-8 animate-in fade-in duration-500">
            {/* Top Metrics Row */}
            <div className="shrink-0">
                <KPIRow />
            </div>

            {/* Command Center Chat */}
            <div className="flex-1 min-h-0 pb-4">
                <CommandChat />
            </div>
        </div>
    );
}
