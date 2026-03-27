import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Compass, SendHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export function CommandChat() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'init-msg',
            role: 'assistant',
            content: 'Hello. I am the Northstar AI. I can query your CRM data, summarize leads, or draft emails. How can I help you today?',
        }
    ]);
    const [inputVal, setInputVal] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll effect
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const sendMessageMutation = useMutation({
        mutationFn: async (messageText: string) => {
            const response = await api.post('/generate', { prompt: messageText });
            return response.data;
        },
        onMutate: async (messageText) => {
            // Optimistically add user message
            const userMsg: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: messageText
            };
            setMessages((prev) => [...prev, userMsg]);
            setInputVal('');
        },
        onSuccess: (data) => {
            // Append assistant response
            const aiMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.text || "I processed your request, but received an empty response."
            };
            setMessages((prev) => [...prev, aiMsg]);
        },
        onError: () => {
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I encountered an error connecting to the knowledge base."
            };
            setMessages((prev) => [...prev, errorMsg]);
            toast.error("Failed to connect to the Assistant.");
        }
    });

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputVal.trim() || sendMessageMutation.isPending) return;
        sendMessageMutation.mutate(inputVal.trim());
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
                            {msg.role === 'assistant' && (
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
                                : 'bg-transparent text-slate-900 rounded-tl-sm'
                                }`}>
                                {msg.content}
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {sendMessageMutation.isPending && (
                        <div className="flex gap-4 max-w-[85%]">
                            <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1">
                                <Compass className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
                            </div>
                            <div className="p-4 bg-transparent text-slate-400 text-sm animate-pulse">
                                Thinking...
                            </div>
                        </div>
                    )}

                    {/* Auto-scroll target */}
                    <div ref={scrollRef} />
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-white shrink-0 border-t border-slate-50">
                <form onSubmit={handleSend} className="relative flex items-center">
                    <Input
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Ask Northstar to draft an email, lookup a lead, or summarize activity..."
                        disabled={sendMessageMutation.isPending}
                        className="w-full bg-slate-50 border-transparent rounded-full h-12 pl-6 pr-14 text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-slate-100/80 transition-colors shadow-none placeholder:text-slate-400 disabled:opacity-50"
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputVal.trim() || sendMessageMutation.isPending}
                        className="absolute right-1.5 h-9 w-9 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-none transition-transform active:scale-95 disabled:opacity-50"
                    >
                        <SendHorizontal className="w-[18px] h-[18px]" strokeWidth={2} />
                    </Button>
                </form>
            </div>
        </div>
    );
}
