import { Bell } from "lucide-react"
import { CommandSearch } from "./CommandSearch"

export function Header() {
    return (
        <header className="sticky top-0 z-40 flex items-center justify-between px-10 h-16 w-full bg-white border-b border-zinc-100">
            <div className="flex items-center flex-1 max-w-xl">
                <CommandSearch />
            </div>
            <div className="flex items-center gap-6">
                <button className="text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer">
                    <Bell className="w-5 h-5" />
                </button>
            </div>
        </header>
    )
}
