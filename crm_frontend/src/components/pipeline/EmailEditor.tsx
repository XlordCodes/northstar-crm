import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { LeadOut } from '@/types/crm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Strikethrough, List, Send } from 'lucide-react';
import { useSendEmail } from '@/hooks/useCommunications';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailEditorProps {
  lead: LeadOut;
}

export function EmailEditor({ lead }: EmailEditorProps) {
  const [subject, setSubject] = useState('');
  const sendEmail = useSendEmail();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: '<p>Hi there,</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none',
      },
    },
  });

  const handleSend = () => {
    if (!editor || !lead.email) {
      if (!lead.email) toast.error('Lead has no email address.');
      return;
    }

    if (!subject.trim()) {
      toast.error('Please enter a subject line.');
      return;
    }

    const html = editor.getHTML();
    
    sendEmail.mutate(
      { 
        to_email: lead.email,
        subject: subject, 
        body_html: html 
      },
      {
        onSuccess: () => {
          toast.success('Email queued for sending!');
          setSubject('');
          editor.commands.setContent('<p></p>');
        },
        onError: (err: any) => {
          toast.error(err.response?.data?.detail || 'Failed to send email');
        }
      }
    );
  };

  const insertVariable = (val: string) => {
    if (editor) {
      editor.chain().focus().insertContent(`{{${val}}}`).run();
    }
  };

  if (!editor) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden border border-slate-200 rounded-lg bg-white">
      {/* Header / Subject */}
      <div className="p-3 border-b border-slate-100">
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject"
          className="border-none shadow-none focus-visible:ring-0 px-2 text-md font-medium placeholder:text-slate-400"
          disabled={sendEmail.isPending}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-slate-100 bg-slate-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-slate-200' : ''}`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-slate-200' : ''}`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-slate-200' : ''}`}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-slate-200' : ''}`}
        >
          <List className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        
        <Select onValueChange={insertVariable}>
          <SelectTrigger className="w-[140px] h-8 bg-white border-slate-200 text-xs">
            <SelectValue placeholder="Insert Variable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_name">First Name</SelectItem>
            <SelectItem value="company_name">Company Name</SelectItem>
            <SelectItem value="sender_name">Sender Name</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {/* Footer / Send Action */}
      <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
        <Button
          onClick={handleSend}
          disabled={sendEmail.isPending || !lead.email}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6"
        >
          <Send className="w-4 h-4 mr-2" />
          {sendEmail.isPending ? 'Sending...' : 'Send Email'}
        </Button>
      </div>
    </div>
  );
}
