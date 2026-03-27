import { useState } from 'react';
import { ContactOut } from '@/types/crm';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

interface ContactsTableProps {
    contacts: ContactOut[];
}

export function ContactsTable({ contacts }: ContactsTableProps) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredContacts = contacts.filter((contact) => {
        const term = searchTerm.toLowerCase();
        return (
            contact.name.toLowerCase().includes(term) ||
            (contact.email && contact.email.toLowerCase().includes(term)) ||
            (contact.phone && contact.phone.toLowerCase().includes(term))
        );
    });

    return (
        <div className="w-full flex flex-col">
            {/* Table Controls */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search contacts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 h-9 bg-slate-50 border-transparent shadow-none focus-visible:ring-0 focus-visible:bg-slate-100 transition-colors text-sm rounded-lg"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="w-full">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 bg-slate-50/50 uppercase border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-3 font-medium">Name</th>
                            <th className="px-6 py-3 font-medium">Email</th>
                            <th className="px-6 py-3 font-medium">Phone</th>
                            <th className="px-6 py-3 font-medium">Created Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredContacts.length > 0 ? (
                            filteredContacts.map((contact) => (
                                <tr
                                    key={contact.id}
                                    className="bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {contact.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {contact.email || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {contact.phone || "—"}
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {format(new Date(contact.created_at), 'MMM d, yyyy')}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                    No contacts found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
