import { useState } from "react"
import { useConversations } from "@/hooks/useConversations"
import { useMessages } from "@/hooks/useMessages"
import { useAISuggestions } from "@/hooks/useAISuggestions"
import { useAiSummary } from "@/hooks/useAiSummary"
import { useSentiment } from "@/hooks/useSentiment"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2, SendHorizontal } from "lucide-react"
import { toast } from "sonner"

export function InboxPage() {
    const { data: conversations = [], isLoading: isLoadingConvos } = useConversations()
    const [selectedConvoId, setSelectedConvoId] = useState<number | null>(null)
    
    // Auto-select latest if None selected and loaded
    if (!selectedConvoId && conversations.length > 0) {
        setSelectedConvoId(conversations[0].id)
    }

    const { data: messages = [], isLoading: isLoadingMessages } = useMessages(selectedConvoId)
    const aiSuggestions = useAISuggestions()
    const summarize = useAiSummary()
    const sentimentMut = useSentiment()
    
    // Message input state
    const [messageInput, setMessageInput] = useState("")

    const handleSendMessage = () => {
        if (!messageInput.trim() || !selectedConvoId) return
        toast.info("Message sent (API endpoint pending)")
        setMessageInput("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    // Conversation level summary state; resets on convo change
    // Using local state for UI demonstration; could be persisted to DB or Cache
    const [threadSummary, setThreadSummary] = useState<string | null>(null)

    // Reset UI state when switching chats
    const handleSelectThread = (id: number) => {
        setSelectedConvoId(id)
        aiSuggestions.reset()
        setThreadSummary(null)
    }

    const handleGenerateSuggestions = () => {
        if (!selectedConvoId) return
        aiSuggestions.mutate(selectedConvoId)
    }

    const activeConvo = conversations.find(c => c.id === selectedConvoId)

    return (
        <div className="flex h-full w-full bg-white overflow-hidden">
            {/* Left Pane: Conversation List */}
            <div className="w-80 border-r border-zinc-100 flex flex-col bg-zinc-50/30">
                <div className="p-4 border-b border-zinc-100 bg-white">
                    <h2 className="text-[15px] font-semibold text-zinc-900 tracking-tight">Active Threads</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {isLoadingConvos ? (
                        <div className="p-8 text-center text-[13px] text-zinc-500">Loading threads...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-[13px] text-zinc-500">No active conversations.</div>
                    ) : (
                        conversations.map((convo) => (
                            <button
                                key={convo.id}
                                onClick={() => handleSelectThread(convo.id)}
                                className={`w-full text-left p-4 border-b border-zinc-100/50 hover:bg-zinc-100/80 transition-colors ${
                                    selectedConvoId === convo.id ? 'bg-zinc-100 shadow-sm' : ''
                                }`}
                            >
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className="text-[13px] font-semibold text-zinc-900 tracking-tight">{convo.customer_number}</h3>
                                    <span className="text-[11px] text-zinc-500">
                                        {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true })}
                                    </span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Pane: Chat Thread */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedConvoId && activeConvo ? (
                    <>
                        <div className="p-4 border-b border-zinc-100 bg-white flex justify-between items-center shadow-sm z-10">
                            <div>
                                <h2 className="text-[15px] font-semibold text-zinc-900 tracking-tight">{activeConvo.customer_number}</h2>
                                <p className="text-[12px] text-zinc-500 font-medium">WhatsApp Session</p>
                            </div>
                            <Button 
                                onClick={() => summarize.mutate(selectedConvoId, { onSuccess: (data) => setThreadSummary(data.summary)})} 
                                disabled={summarize.isPending || messages.length === 0}
                                variant="outline" 
                                size="sm"
                                className="h-8 text-[12px] font-medium tracking-tight bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
                            >
                                {summarize.isPending ? "Summarizing..." : "Summarize"}
                            </Button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Summary Block System Message */}
                            {threadSummary && (
                                <div className="bg-zinc-50 border border-zinc-200 mb-6 rounded-md p-3 text-[13px] shadow-sm flex flex-col gap-1.5 animate-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-1.5 text-zinc-800 font-semibold tracking-tight">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>AI Summary</span>
                                    </div>
                                    <p className="text-zinc-600 leading-relaxed max-w-2xl">{threadSummary}</p>
                                </div>
                            )}

                            {isLoadingMessages ? (
                                <div className="text-center text-[13px] text-zinc-500">Loading messages...</div>
                            ) : messages.length === 0 ? (
                                <div className="text-center text-[13px] text-zinc-500 mt-10">No messages in this thread yet.</div>
                            ) : (
                                messages.slice().reverse().map((msg) => {
                                    // Temporary heuristic for UI testing without true inbound/outbound flag:
                                    const isCustomer = msg.from_number === activeConvo.customer_number;
                                    
                                    return (
                                        <div key={msg.id} className={`group flex ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                                            <div className={`relative max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] ${
                                                isCustomer 
                                                    ? 'bg-zinc-100 text-zinc-900 rounded-bl-sm' 
                                                    : 'bg-zinc-900 text-white rounded-br-sm'
                                            }`}>
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                                
                                                {/* Sentiment Badge */}
                                                {isCustomer && msg.sentiment && (
                                                    <div className="mt-1.5">
                                                        <span className={`inline-flex text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${
                                                            msg.sentiment === 'positive'
                                                                ? 'bg-emerald-50 text-emerald-600'
                                                                : msg.sentiment === 'negative'
                                                                    ? 'bg-red-50 text-red-600'
                                                                    : 'bg-zinc-100 text-zinc-500'
                                                        }`}>
                                                            {msg.sentiment}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Hover Action for Missing Sentiment */}
                                                {isCustomer && !msg.sentiment && (
                                                    <button
                                                        onClick={() => sentimentMut.mutate({ messageId: msg.id, convoId: selectedConvoId! })}
                                                        disabled={sentimentMut.isPending}
                                                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-zinc-400 hover:text-zinc-600 focus:outline-none bg-white rounded-full border border-zinc-200 shadow-sm"
                                                        title="Detect Sentiment"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {/* AI Suggestion Bar / Input Area */}
                        <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex flex-col gap-3">
                            {/* AI Suggestions Section */}
                            {aiSuggestions.data && aiSuggestions.data.length > 0 && (
                                <div className="flex flex-col gap-2 mb-2">
                                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center">
                                        <Sparkles className="w-3 h-3 mr-1" />
                                        Suggested Replies
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {aiSuggestions.data.map(suggestion => (
                                            <button 
                                                key={suggestion.id}
                                                className="text-left px-3 py-2 bg-white border border-zinc-200 rounded-lg hover:border-zinc-400 focus:ring-1 focus:ring-zinc-900 text-[13px] text-zinc-800 shadow-sm transition-all"
                                            >
                                                {suggestion.suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                <Button 
                                    onClick={handleGenerateSuggestions}
                                    disabled={aiSuggestions.isPending || isLoadingMessages || messages.length === 0}
                                    variant="outline" 
                                    className="h-10 border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-100 shadow-sm"
                                >
                                    {aiSuggestions.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-zinc-500" />
                                    ) : (
                                        <Sparkles className="w-4 h-4 mr-2" />
                                    )}
                                    <span className="text-[13px] font-medium">Assistant</span>
                                </Button>
                                
                                <div className="flex-1 relative">
                                    <input 
                                        type="text" 
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Type a message..."
                                        className="w-full h-10 px-4 pr-10 text-[13px] bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-300"
                                    />
                                    <Button 
                                        size="icon" 
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim()}
                                        className="absolute right-1 top-1 bottom-1 h-8 w-8 bg-zinc-900 hover:bg-zinc-800 text-white rounded-md"
                                    >
                                        <SendHorizontal className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
                        <Sparkles className="w-12 h-12 mb-4 text-zinc-200" />
                        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Northstar AI Inbox</h2>
                        <p className="text-[14px]">Select a conversation to start</p>
                    </div>
                )}
            </div>
        </div>
    )
}
