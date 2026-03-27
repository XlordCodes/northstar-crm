import { useContacts } from '@/hooks/useContacts';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { Users, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Contacts() {
    const { data: contacts, isLoading, isError } = useContacts();

    return (
        <div className="flex-1 space-y-8 max-w-7xl mx-auto w-full px-8 py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Contacts Directory</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage all your external customers and partners.</p>
                </div>
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-lg shadow-none">
                    <Plus className="w-4 h-4 mr-2" /> New Contact
                </Button>
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
