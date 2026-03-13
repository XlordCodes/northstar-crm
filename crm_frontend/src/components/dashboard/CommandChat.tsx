import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Compass, SendHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function CommandChat() {
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'system',
            content: 'Good morning. You have 2 new leads today. Would you like me to draft an outreach sequence?',
        }
    ]);
    const [inputVal, setInputVal] = useState('');

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        setMessages([...messages, { id: Date.now(), role: 'user', content: inputVal }]);
        setInputVal('');

        // Simulate AI typing response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'system',
                content: 'I have prepared a draft based on the recent Lead profile. Retrieving the preview now...'
            }]);
        }, 1200);
    };

    return (
        <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden max-w-5xl mx-auto w-full border border-slate-100/50">

            {/* Header Area */}
            <div className="h-14 border-b border-slate-100 flex items-center px-6 shrink-0 bg-white/50 backdrop-blur-sm z-10">
                <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span className="text-sm font-medium text-slate-900">Northstar Assistant</span>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 overflow-y-auto px-6 py-6">
                <div className="space-y-6 flex flex-col">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                            {msg.role === 'system' && (
                                <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1">
                                    <Compass className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
                                </div>
                            )}
                            {msg.role === 'user' && (
                                <Avatar className="h-8 w-8 shrink-0 border border-slate-100 mt-1">
                                    <AvatarImage src="https://github.com/shadcn.png" alt="@user" />
                                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs">SM</AvatarFallback>
                                </Avatar>
                            )}
                            <div className={`p-4 rounded-2xl text-[15px] leading-relaxed ${msg.role === 'user'
                                    ? 'bg-slate-100 text-slate-900 rounded-tr-sm'
                                    : 'bg-white text-slate-900 border border-slate-100 shadow-sm rounded-tl-sm'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white shrink-0 border-t border-slate-50">
                <form onSubmit={handleSend} className="relative flex items-center">
                    <Input
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Ask Northstar to draft an email, lookup a lead, or summarize activity..."
                        className="w-full bg-slate-50 border-transparent rounded-full h-12 pl-6 pr-14 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-slate-100/80 transition-colors shadow-none placeholder:text-slate-400"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        className="absolute right-1.5 h-9 w-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-none transition-transform active:scale-95"
                        disabled={!inputVal.trim()}
                    >
                        <SendHorizontal className="w-[18px] h-[18px]" strokeWidth={2} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
