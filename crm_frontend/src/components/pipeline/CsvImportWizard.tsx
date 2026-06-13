import React, { useState } from 'react';
import Papa from 'papaparse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBulkImportLeads } from '@/hooks/useBulkImportLeads';
import { Upload } from 'lucide-react';
import { LeadCreate } from '@/types/crm';

export function CsvImportWizard() {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);
    const [csvFields, setCsvFields] = useState<string[]>([]);
    const [csvData, setCsvData] = useState<any[]>([]);
    
    // Mapping: keys are LeadCreate fields, values are CSV headers
    const [mapping, setMapping] = useState<{ name: string; email: string; phone: string }>({
        name: 'none',
        email: 'none',
        phone: 'none'
    });

    const bulkImport = useBulkImportLeads();

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results: any) => {
                if (results.meta.fields) {
                    setCsvFields(results.meta.fields);
                    setCsvData(results.data);
                    setStep(2);
                }
            }
        });
    };

    const handleImport = async () => {
        if (!mapping.name || mapping.name === 'none') return;
        
        const leads: LeadCreate[] = csvData.map(row => {
            return {
                name: row[mapping.name],
                email: mapping.email && mapping.email !== 'none' ? row[mapping.email] : undefined,
                phone: mapping.phone && mapping.phone !== 'none' ? row[mapping.phone] : undefined,
            };
        }).filter(lead => lead.name && typeof lead.name === 'string' && lead.name.trim().length >= 2);

        if (leads.length === 0) return;

        await bulkImport.mutateAsync({ leads });
        setOpen(false);
        // Reset state
        setStep(1);
        setCsvFields([]);
        setCsvData([]);
        setMapping({ name: 'none', email: 'none', phone: 'none' });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm mr-2 h-9 px-4 rounded-lg">
                    <Upload className="w-4 h-4 mr-2" /> Import CSV
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import Leads</DialogTitle>
                    <DialogDescription>
                        {step === 1 ? 'Upload a CSV file to import leads.' : 'Map your CSV columns to CRM fields.'}
                    </DialogDescription>
                </DialogHeader>
                
                {step === 1 && (
                    <div className="grid gap-4 py-4">
                        <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleFileUpload} 
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        />
                    </div>
                )}

                {step === 2 && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium text-slate-700">Name *</label>
                            <div className="col-span-3">
                                <Select value={mapping.name} onValueChange={(v) => setMapping(m => ({ ...m, name: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Select CSV Column" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Select Column --</SelectItem>
                                        {csvFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium text-slate-700">Email</label>
                            <div className="col-span-3">
                                <Select value={mapping.email} onValueChange={(v) => setMapping(m => ({ ...m, email: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Select CSV Column" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Skip --</SelectItem>
                                        {csvFields.map(f => <SelectItem key={'email-'+f} value={f}>{f}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-sm font-medium text-slate-700">Phone</label>
                            <div className="col-span-3">
                                <Select value={mapping.phone} onValueChange={(v) => setMapping(m => ({ ...m, phone: v }))}>
                                    <SelectTrigger><SelectValue placeholder="Select CSV Column" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- Skip --</SelectItem>
                                        {csvFields.map(f => <SelectItem key={'phone-'+f} value={f}>{f}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 2 && (
                        <Button 
                            onClick={handleImport} 
                            disabled={!mapping.name || mapping.name === 'none' || bulkImport.isPending}
                        >
                            {bulkImport.isPending ? 'Importing...' : `Import ${csvData.length} Leads`}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
