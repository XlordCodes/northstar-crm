import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Users, Building2, Package, Inbox as InboxIcon, Receipt, LayoutDashboard, Search } from "lucide-react"
import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

export function CommandSearch() {
    const [open, setOpen] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = (command: () => void) => {
        setOpen(false)
        command()
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="w-full flex items-center bg-transparent border-none outline-none text-sm font-sans antialiased tracking-tight text-zinc-400 hover:text-zinc-600 transition-colors cursor-text group"
            >
                <Search className="w-5 h-5 mr-3 group-hover:text-zinc-500 transition-colors" />
                <span className="flex-1 text-left">Search CRM (Cmd+K)...</span>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    
                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => navigate("/pipeline"))}>
                            <Building2 className="mr-2 h-4 w-4" />
                            <span>Pipeline</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/contacts"))}>
                            <Users className="mr-2 h-4 w-4" />
                            <span>Contacts</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/inbox"))}>
                            <InboxIcon className="mr-2 h-4 w-4" />
                            <span>Inbox</span>
                        </CommandItem>
                    </CommandGroup>
                    
                    <CommandSeparator />
                    
                    <CommandGroup heading="Modules">
                        <CommandItem onSelect={() => runCommand(() => navigate("/"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/finance"))}>
                            <Receipt className="mr-2 h-4 w-4" />
                            <span>Finance</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate("/inventory"))}>
                            <Package className="mr-2 h-4 w-4" />
                            <span>Inventory</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
