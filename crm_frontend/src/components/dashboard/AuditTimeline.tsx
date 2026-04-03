import { useAuditFeed } from "@/hooks/useAuditFeed"
import { formatDistanceToNow } from "date-fns"

export function AuditTimeline() {
    const { data: activities = [], isLoading } = useAuditFeed(10)

    return (
        <div className="h-full flex flex-col bg-white border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                <h3 className="text-[14px] font-semibold text-zinc-900 tracking-tight">Recent Activity</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
                {isLoading ? (
                    <div className="p-6 text-center text-[13px] text-zinc-500 animate-pulse">Loading activity...</div>
                ) : activities.length === 0 ? (
                    <div className="p-6 text-center text-[13px] text-zinc-500">No recent activity.</div>
                ) : (
                    <div className="flex flex-col">
                        {activities.map((item, index) => (
                            <div key={item.id} className={`p-4 flex flex-col gap-1 ${index !== activities.length - 1 ? 'border-b border-zinc-100' : ''}`}>
                                <p className="text-[13px] text-zinc-800 leading-snug">{item.message}</p>
                                <span className="text-[11px] text-zinc-500 font-medium tracking-tight">
                                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
