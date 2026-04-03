import { useState } from 'react';
import { useContacts } from '@/hooks/useContacts';
import { useCreateContact } from '@/hooks/useCreateContact';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RoleGuard } from "@/components/auth/RoleGuard";

export function Contacts() {
    const { data: contacts, isLoading, isError } = useContacts();
    const createContact = useCreateContact();

    const [sheetOpen, setSheetOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const handleSubmit = async () => {
        if (!name.trim()) return;

        try {
            await createContact.mutateAsync({
                name: name.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
            });
            setName('');
            setEmail('');
            setPhone('');
            setSheetOpen(false);
        } catch (error) {
            // Handled globally
        }
    };

    return (
        <div className="flex-1 space-y-8 max-w-7xl mx-auto w-full px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Contacts Directory</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage all your external customers and partners.</p>
                </div>
                <RoleGuard allowedRoles={['admin', 'manager', 'staff']}>
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <SheetTrigger asChild>
                            <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-none cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" /> New Contact
                            </Button>
                        </SheetTrigger>
                    <SheetContent side="right" className="w-[400px] sm:max-w-md bg-white border-l border-zinc-100 p-8">
                        <SheetHeader className="mb-8">
                            <SheetTitle className="text-xl font-bold tracking-tight text-zinc-900">New Contact</SheetTitle>
                            <SheetDescription className="hidden">Form details</SheetDescription>
                        </SheetHeader>
                        <div className="space-y-6 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="contact-name" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Full Name *</Label>
                                <Input
                                    id="contact-name"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-[#f3f3f3] border-none border-b-2 border-transparent focus-visible:border-zinc-900 focus-visible:ring-0 transition-all px-4 py-6 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-email" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Email Address</Label>
                                <Input
                                    id="contact-email"
                                    placeholder="john@example.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#f3f3f3] border-none border-b-2 border-transparent focus-visible:border-zinc-900 focus-visible:ring-0 transition-all px-4 py-6 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-phone" className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Phone Number</Label>
                                <Input
                                    id="contact-phone"
                                    placeholder="+14155552671"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-[#f3f3f3] border-none border-b-2 border-transparent focus-visible:border-zinc-900 focus-visible:ring-0 transition-all px-4 py-6 text-sm font-medium rounded-none shadow-none text-zinc-900"
                                />
                            </div>
                            <div className="pt-8">
                                <Button
                                    onClick={handleSubmit}
                                    disabled={createContact.isPending || !name.trim()}
                                    className="w-full py-6 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold uppercase tracking-[0.2em] transition-all rounded-sm shadow-none cursor-pointer disabled:opacity-50"
                                >
                                    {createContact.isPending ? 'Creating...' : 'Create Contact'}
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
                </RoleGuard>
            </div>

            <div className="bg-white rounded-xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] border border-slate-100/50 overflow-hidden min-h-[500px]">
                {isLoading ? (
                    <div className="p-8 space-y-6">
                        <div className="h-9 w-64 bg-slate-100 rounded-lg animate-pulse" />
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex gap-4">
                                    <div className="h-12 flex-1 bg-slate-50 rounded-lg animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : isError ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-500 min-h-[400px]">
                        <Users className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="font-medium text-slate-900">Failed to load contacts.</p>
                        <p className="text-sm">Please pull fresh dependencies and try again.</p>
                    </div>
                ) : (
                    <ContactsTable contacts={contacts || []} />
                )}
            </div>
        </div>
    );
}
