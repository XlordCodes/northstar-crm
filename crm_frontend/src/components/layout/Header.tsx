import { Search, Compass } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export function Header() {
    return (
        <header className="h-16 bg-white shadow-[0_1px_10px_rgba(0,0,0,0.02)] flex items-center justify-between px-6 shrink-0 z-10 relative">
            <div className="flex items-center gap-3">
                <Compass className="w-5 h-5 text-slate-900" strokeWidth={1.5} />
                <h1 className="text-[15px] font-medium text-slate-900 tracking-tight">
                    Northstar CRM
                </h1>
            </div>

            <div className="flex items-center gap-6 flex-1 justify-end max-w-md ml-auto">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Search..."
                        className="w-full pl-9 bg-slate-50 border-transparent hover:bg-slate-100 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-white focus-visible:border-slate-200 h-9 rounded-full shadow-none"
                    />
                </div>

                <Avatar className="h-8 w-8 cursor-pointer border-none shadow-sm">
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">SM</AvatarFallback>
                </Avatar>
            </div>
        </header>
    )
}
