import { Home, Inbox, Database, Settings, Target, BookUser, CircleDollarSign } from "lucide-react"
import { NavLink } from "react-router-dom"

export function Sidebar() {
    const navItems = [
        { icon: Home, label: "Home", to: "/" },
        { icon: CircleDollarSign, label: "Finance", to: "/deals" },
        { icon: BookUser, label: "Contacts", to: "/contacts" },
        { icon: Target, label: "Pipeline", to: "/pipeline" },
        { icon: Inbox, label: "Inbox", to: "/inbox" },
        { icon: Database, label: "Database", to: "/database" },
    ]

    return (
        <aside className="w-16 h-full bg-white shadow-[1px_0_10px_rgba(0,0,0,0.02)] flex flex-col items-center py-6 shrink-0 z-10">
            <nav className="flex-1 flex flex-col gap-3 w-full px-2">
                {navItems.map((item, index) => (
                    <NavLink
                        key={index}
                        to={item.to}
                        title={item.label}
                        className={({ isActive }) =>
                            `w-full aspect-square flex items-center justify-center rounded-xl transition-colors ${isActive
                                ? "bg-slate-100 text-slate-900"
                                : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
                            }`
                        }
                    >
                        <item.icon className="w-[18px] h-[18px]" strokeWidth={2} />
                    </NavLink>
                ))}
            </nav>

            <div className="mt-auto w-full px-2">
                <button
                    className="w-full aspect-square flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                    title="Settings"
                >
                    <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
                </button>
            </div>
        </aside>
    )
}
