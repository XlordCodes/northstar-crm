import { useState } from 'react';
import { useLeadMessages, useSendWhatsApp } from '@/hooks/useCommunications';
import { LeadOut } from '@/types/crm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { format } from 'date-fns';
import { EmailEditor } from './EmailEditor';

interface CommunicationTabsProps {
  lead: LeadOut;
}

export function CommunicationTabs({ lead }: CommunicationTabsProps) {
  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="whatsapp" className="flex-1 flex flex-col h-full">
        <div className="px-6 pt-2 border-b border-slate-100">
          <TabsList className="bg-transparent h-auto p-0 gap-6">
            <TabsTrigger
              value="whatsapp"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 text-slate-500 hover:text-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              WhatsApp
            </TabsTrigger>
            <TabsTrigger
              value="email"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-slate-900 data-[state=active]:text-slate-900 rounded-none border-b-2 border-transparent px-0 pb-3 pt-2 text-slate-500 hover:text-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0"
            >
              Email
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="whatsapp" className="flex-1 flex flex-col m-0 outline-none overflow-hidden h-[calc(100vh-250px)]">
          <WhatsAppChat lead={lead} />
        </TabsContent>

        <TabsContent value="email" className="flex-1 m-0 outline-none flex flex-col h-[calc(100vh-250px)]">
          <EmailEditor lead={lead} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WhatsAppChat({ lead }: { lead: LeadOut }) {
  const { data: messages, isLoading } = useLeadMessages(lead.phone || null);
  const sendWhatsApp = useSendWhatsApp();
  const [text, setText] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !lead.phone) return;

    sendWhatsApp.mutate(
      { to_number: lead.phone, message: text },
      {
        onSuccess: () => {
          setText('');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
      </div>
    );
  }

  const chatMessages = messages || [];
  // Messages usually arrive newest first from the API if order_by desc
  // We want to render them oldest first so the bottom is the newest.
  const sortedMessages = [...chatMessages].reverse();

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            No messages yet. Send one below!
          </div>
        ) : (
          sortedMessages.map((msg: any) => {
            const isOutgoing = msg.message_type === 'outgoing_text' || msg.from_number === 'system';
            return (
              <div
                key={msg.id}
                className={`flex w-full ${isOutgoing ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    isOutgoing
                      ? 'bg-green-500 text-white rounded-br-none'
                      : 'bg-slate-100 text-slate-900 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  <span
                    className={`text-[10px] mt-1 block ${
                      isOutgoing ? 'text-green-100' : 'text-slate-400'
                    }`}
                  >
                    {format(new Date(msg.created_at), 'h:mm a')}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-4 border-t border-slate-100 bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-full bg-slate-100 border-transparent focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:bg-white"
            disabled={sendWhatsApp.isPending || !lead.phone}
          />
          <Button
            type="submit"
            disabled={sendWhatsApp.isPending || !text.trim() || !lead.phone}
            size="icon"
            className="rounded-full bg-slate-900 hover:bg-slate-800 text-white shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
