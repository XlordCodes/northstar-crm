import { useState } from "react"
import { useInvoices } from "@/hooks/useInvoices"
import { useCreateInvoice } from "@/hooks/useCreateInvoice"
import { useSendInvoiceEmail } from "@/hooks/useSendInvoiceEmail"
import { InvoiceCreate } from "@/types/finance"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, X, MoreHorizontal, Mail } from "lucide-react"
import { RoleGuard } from "@/components/auth/RoleGuard"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"

export function Finance() {
    const { data: invoices = [], isLoading } = useInvoices()
    const createInvoice = useCreateInvoice()
    const sendEmail = useSendInvoiceEmail()

    const [isSheetOpen, setIsSheetOpen] = useState(false)
    const [contactId, setContactId] = useState("")
    const [currency, setCurrency] = useState("USD")
    const [dueDate, setDueDate] = useState("")
    
    // Line items state
    const [items, setItems] = useState([{ description: "", quantity: 1, unit_price: 0 }])

    // Email dialog state
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)
    const [emailRecipient, setEmailRecipient] = useState("")
    const [pendingInvoiceId, setPendingInvoiceId] = useState<number | null>(null)

    const handleAddItem = () => {
        setItems([...items, { description: "", quantity: 1, unit_price: 0 }])
    }

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: keyof typeof items[0], value: string | number) => {
        const newItems = [...items]
        newItems[index] = { ...newItems[index], [field]: value }
        setItems(newItems)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (items.length === 0) return;

        const data: InvoiceCreate = {
            contact_id: Number(contactId),
            currency,
            due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
            items: items.filter(i => i.description.trim() !== "")
        }

        try {
            await createInvoice.mutateAsync(data)
            setIsSheetOpen(false)
            setContactId("")
            setDueDate("")
            setItems([{ description: "", quantity: 1, unit_price: 0 }])
        } catch (error) {
            // Handled globally by the hook's onError
        }
    }

    const handleSendEmailClick = (invoiceId: number) => {
        setPendingInvoiceId(invoiceId)
        setEmailRecipient("")
        setEmailDialogOpen(true)
    }

    const handleConfirmSendEmail = async () => {
        if (!emailRecipient.trim() || !pendingInvoiceId) return

        try {
            await sendEmail.mutateAsync({
                to_email: emailRecipient.trim(),
                subject: `Invoice #${pendingInvoiceId}`,
                template_name: "invoice_email",
                context: { invoice_id: pendingInvoiceId },
            })
            setEmailDialogOpen(false)
            setPendingInvoiceId(null)
        } catch {
            // Handled globally by the hook's onError
        }
    }

    const formatCurrency = (amount: number, curr: string) => {
        try {
            const safeCurr = curr && curr.trim().length === 3 ? curr.trim().toUpperCase() : 'USD';
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: safeCurr }).format(amount)
        } catch (error) {
            return `${curr} ${amount.toFixed(2)}`
        }
    }

    return (
        <div className="p-8 max-w-7xl mx-auto w-full">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 tracking-tight mb-2">Finance</h1>
                    <p className="text-zinc-500 text-[13px] font-medium tracking-tight">Manage invoices and payments.</p>
                </div>
                <RoleGuard allowedRoles={['admin', 'manager']}>
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-md shadow-sm h-9 px-4 text-[13px] font-medium tracking-tight">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Invoice
                            </Button>
                        </SheetTrigger>
                    <SheetContent className="p-6 overflow-y-auto sm:max-w-md">
                        <SheetHeader>
                            <SheetTitle className="text-zinc-900 font-semibold tracking-tight">Create Invoice</SheetTitle>
                            <SheetDescription className="text-zinc-500 text-[13px] tracking-tight">
                                Create a new multi-item invoice.
                            </SheetDescription>
                        </SheetHeader>
                        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[13px] font-medium text-zinc-900">Contact ID *</Label>
                                    <Input required type="number" value={contactId} onChange={e => setContactId(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[13px] font-medium text-zinc-900">Currency</Label>
                                        <Input value={currency} onChange={e => setCurrency(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[13px] font-medium text-zinc-900">Due Date</Label>
                                        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-9 border-zinc-200 focus-visible:ring-zinc-900 text-[13px]" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-[13px] font-semibold text-zinc-900 tracking-tight">Line Items</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="h-7 px-2 text-[11px] border-zinc-200 text-zinc-700">
                                        <Plus className="w-3 h-3 mr-1" /> Add
                                    </Button>
                                </div>
                                
                                {items.map((item, index) => (
                                    <div key={index} className="p-3 bg-zinc-50 rounded-md border border-zinc-100 relative group">
                                        {items.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveItem(index)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        <div className="space-y-3">
                                            <div className="space-y-1">
                                                <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Description</Label>
                                                <Input required value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="h-8 text-[12px] border-zinc-200" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Qty</Label>
                                                    <Input required type="number" min="1" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} className="h-8 text-[12px] border-zinc-200" />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] text-zinc-500 uppercase tracking-wider">Unit Price</Label>
                                                    <Input required type="number" step="0.01" min="0" value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', Number(e.target.value))} className="h-8 text-[12px] border-zinc-200" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="pt-2 border-t border-zinc-100 flex justify-between items-center text-[13px]">
                                    <span className="text-zinc-500 font-medium">Total:</span>
                                    <span className="text-zinc-900 font-semibold tracking-tight">
                                        {formatCurrency(items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0), currency)}
                                    </span>
                                </div>
                            </div>
                            
                            <Button disabled={createInvoice.isPending} type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm font-medium tracking-tight">
                                {createInvoice.isPending ? "Creating..." : "Save Invoice"}
                            </Button>
                        </form>
                    </SheetContent>
                </Sheet>
                </RoleGuard>
            </div>

            <div className="bg-white border border-zinc-100 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-zinc-50/50 border-b border-zinc-100">
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">INVOICE ID</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">CONTACT ID</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">AMOUNT</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight">STATUS</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight text-right">DUE DATE</th>
                            <th className="px-6 py-4 text-[12px] font-semibold text-zinc-900 tracking-tight text-right w-16">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-[13px] text-zinc-500">Loading invoices...</td></tr>
                        ) : invoices.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-[13px] text-zinc-500">No invoices found.</td></tr>
                        ) : (
                            invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-6 py-4 text-[13px] font-medium text-zinc-900">#{(inv.id > 0) ? inv.id : '---'}</td>
                                    <td className="px-6 py-4 text-[13px] text-zinc-500">{inv.contact_id}</td>
                                    <td className="px-6 py-4 text-[13px] font-semibold text-zinc-900">{formatCurrency(inv.total_amount, inv.currency)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider
                                            ${inv.status === 'draft' ? 'bg-zinc-100 text-zinc-600' :
                                              inv.status === 'sent' ? 'bg-indigo-50 text-indigo-600' :
                                              inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' :
                                              'bg-red-50 text-red-600'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-[13px] text-zinc-500 text-right">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-900">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40">
                                                <RoleGuard allowedRoles={['admin', 'manager']}>
                                                    <DropdownMenuItem
                                                        onClick={() => handleSendEmailClick(inv.id)}
                                                        className="text-[13px] cursor-pointer"
                                                    >
                                                        <Mail className="w-3.5 h-3.5 mr-2" />
                                                        Send via Email
                                                    </DropdownMenuItem>
                                                </RoleGuard>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Email Recipient Dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={(open) => {
                setEmailDialogOpen(open)
                if (!open) { setPendingInvoiceId(null) }
            }}>
                <DialogContent className="bg-white border-none shadow-xl sm:max-w-md rounded-2xl">
                    <form onSubmit={(e) => { e.preventDefault(); handleConfirmSendEmail() }}>
                        <DialogHeader className="space-y-3">
                            <DialogTitle className="text-xl font-semibold text-slate-900">Send Invoice via Email</DialogTitle>
                            <DialogDescription className="text-slate-500 text-sm">
                                Enter the recipient's email address for Invoice #{pendingInvoiceId}.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-6">
                            <Label htmlFor="email-recipient" className="text-slate-700 text-sm font-medium mb-2 block">
                                Recipient Email
                            </Label>
                            <Input
                                id="email-recipient"
                                type="email"
                                value={emailRecipient}
                                onChange={(e) => setEmailRecipient(e.target.value)}
                                placeholder="customer@example.com"
                                required
                                className="bg-white border-slate-200 h-11 rounded-xl shadow-none px-4 focus-visible:ring-1 focus-visible:ring-slate-900"
                            />
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setEmailDialogOpen(false)}
                                className="rounded-xl h-10"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={sendEmail.isPending || !emailRecipient.trim()}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-none h-10"
                            >
                                {sendEmail.isPending ? "Sending..." : "Send"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
