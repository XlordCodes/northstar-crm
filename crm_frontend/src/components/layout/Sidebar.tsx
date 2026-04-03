import { LayoutDashboard, Users, Network, DollarSign, Package, Inbox, Megaphone, Activity, LogOut } from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useHealth } from "@/hooks/useHealth"
import { SystemQueuesSheet } from "@/components/layout/SystemQueuesSheet"
import { useAuth } from "@/contexts/AuthContext"
import { RoleGuard } from "@/components/auth/RoleGuard"

export function Sidebar() {
    const { data: healthStatus = 'up' } = useHealth();
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const displayName = user?.name || 'User';
    const displayRole = user?.role_name || 'Member';

    return (
        <aside className="fixed left-0 top-0 h-full flex flex-col py-8 w-64 bg-zinc-50 border-r border-zinc-100 z-50">
            <div className="px-8 mb-10">
                <h1 className="text-zinc-900 font-semibold text-[15px] tracking-tight">Northstar CRM</h1>
            </div>
            <nav className="flex-1 flex flex-col space-y-1">
                <NavLink to="/" className={({ isActive }) => `flex items-center px-4 py-2.5 mx-4 rounded-md ${isActive ? 'text-zinc-900 bg-zinc-100 opacity-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100'} transition-all group`}>
                    <LayoutDashboard className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                    <span className="text-[13px] font-medium tracking-tight">Dashboard</span>
                </NavLink>
                <NavLink to="/contacts" className={({ isActive }) => `flex items-center px-4 py-2.5 mx-4 rounded-md ${isActive ? 'text-zinc-900 bg-zinc-100 opacity-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100'} transition-all group`}>
                    <Users className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                    <span className="text-[13px] font-medium tracking-tight">Contacts</span>
                </NavLink>
                <NavLink to="/pipeline" className={({ isActive }) => `flex items-center px-4 py-2.5 mx-4 rounded-md ${isActive ? 'text-zinc-900 bg-zinc-100 opacity-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100'} transition-all group`}>
                    <Network className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                    <span className="text-[13px] font-medium tracking-tight">Pipeline</span>
                </NavLink>
                <NavLink to="/inbox" className={({ isActive }) => `flex items-center px-4 py-2.5 mx-4 rounded-md ${isActive ? 'text-zinc-900 bg-zinc-100 opacity-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100'} transition-all group`}>
                    <Inbox className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                    <span className="text-[13px] font-medium tracking-tight">Inbox</span>
                </NavLink>

                <RoleGuard allowedRoles={['admin', 'manager']}>
                    <div className="pt-2 mt-2 border-t border-zinc-100">
                        <p className="px-8 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest mb-1">Operations</p>
                    </div>
                    <NavLink to="/finance" className={({ isActive }) => `flex items-center px-4 py-2.5 mx-4 rounded-md ${isActive ? 'text-zinc-900 bg-zinc-100 opacity-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100'} transition-all group`}>
                        <DollarSign className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                        <span className="text-[13px] font-medium tracking-tight">Finance</span>
                    </NavLink>
                    <NavLink to="/inventory" className={({ isActive }) => `flex items-center px-4 py-2.5 mx-4 rounded-md ${isActive ? 'text-zinc-900 bg-zinc-100 opacity-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100'} transition-all group`}>
                        <Package className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                        <span className="text-[13px] font-medium tracking-tight">Inventory</span>
                    </NavLink>
                    <NavLink to="/campaigns" className={({ isActive }) => `flex items-center px-4 py-2.5 mx-4 rounded-md ${isActive ? 'text-zinc-900 bg-zinc-100 opacity-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100'} transition-all group`}>
                        <Megaphone className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                        <span className="text-[13px] font-medium tracking-tight">Campaigns</span>
                    </NavLink>
                </RoleGuard>

                <RoleGuard allowedRoles={['admin']}>
                    <SystemQueuesSheet>
                        <button className="flex items-center px-4 py-2.5 mx-4 rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/50 opacity-80 hover:opacity-100 transition-all group w-[calc(100%-2rem)]">
                            <Activity className="w-[18px] h-[18px] mr-3" strokeWidth={2} />
                            <span className="text-[13px] font-medium tracking-tight">System Queues</span>
                        </button>
                    </SystemQueuesSheet>
                </RoleGuard>
            </nav>
            <div className="px-4 mt-auto pt-4 pb-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-3 w-full text-left px-4 py-2 rounded-md hover:bg-zinc-100/70 transition-colors outline-none cursor-pointer group">
                            <img
                                alt={displayName}
                                className="w-8 h-8 rounded-full grayscale border border-zinc-200 group-hover:border-zinc-300 transition-colors"
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`}
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="text-[13px] font-semibold text-zinc-900 tracking-tight leading-none">{displayName}</p>
                                    <span 
                                        className={`block w-2 h-2 rounded-full ${healthStatus === 'up' ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]'} transition-colors`} 
                                        title={healthStatus === 'up' ? 'System Operational' : 'System Degraded'}
                                    />
                                </div>
                                <p className="text-[11px] font-medium text-zinc-500 leading-none capitalize">{displayRole}</p>
                            </div>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-60 rounded-xl shadow-lg border-zinc-100" align="start" side="right" sideOffset={16}>
                        <DropdownMenuLabel className="font-semibold text-zinc-900 text-xs px-2 py-1.5">My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-zinc-100" />
                        <DropdownMenuGroup>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-lg mx-1 focus:bg-zinc-100 font-medium">Profile</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs cursor-pointer rounded-lg mx-1 focus:bg-zinc-100 font-medium">Preferences</DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="bg-zinc-100" />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-xs cursor-pointer rounded-lg mx-1 focus:bg-red-50 focus:text-red-900 font-medium text-red-600"
                        >
                            <LogOut className="w-3.5 h-3.5 mr-2" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    )
}
